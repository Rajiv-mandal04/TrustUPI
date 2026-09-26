from datetime import datetime, timedelta
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import text

from src.api.database import engine
from src.api.websocket_manager import manager


router = APIRouter(
    prefix="/api/v1/predict",
    tags=["Predictions"]
)


PROJECT_ROOT = Path(__file__).resolve().parents[3]

MODEL_PATH = PROJECT_ROOT / "models" / "isolation_forest.pkl"
FEATURE_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "feature_engineered_transactions.csv"
)


isolation_artifact = joblib.load(MODEL_PATH)

isolation_model = isolation_artifact["model"]
isolation_features = isolation_artifact["features"]


class TransactionRequest(BaseModel):
    transaction_id: str
    sender_id: str
    receiver_id: str
    amount: float = Field(gt=0)
    timestamp: datetime
    latitude: float
    longitude: float
    device_id: str


# ============================================================
# HAVERSINE DISTANCE
# ============================================================

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1_rad = np.radians(lat1)
    lat2_rad = np.radians(lat2)
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)

    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2) ** 2
    )
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return float(R * c)


@router.post("/")
async def predict_transaction(request: TransactionRequest):

    transaction_id = request.transaction_id
    sender_id = request.sender_id
    receiver_id = request.receiver_id
    amount = request.amount
    timestamp = request.timestamp
    latitude = request.latitude
    longitude = request.longitude
    device_id = request.device_id

    # ============================================================
    # LOAD SETTINGS
    # ============================================================

    settings_query = text("""
        SELECT fraud_alerts, critical_alerts, realtime_alerts
        FROM trustupi_settings
        ORDER BY id
        LIMIT 1
    """)

    try:
        with engine.connect() as connection:
            settings_result = connection.execute(settings_query)
            settings = settings_result.mappings().first()
    except Exception as error:
        print("Settings loading error:", str(error))
        settings = None

    if settings:
        fraud_alerts_enabled = bool(settings["fraud_alerts"])
        critical_alerts_enabled = bool(settings["critical_alerts"])
        realtime_alerts_enabled = bool(settings["realtime_alerts"])
    else:
        fraud_alerts_enabled = True
        critical_alerts_enabled = True
        realtime_alerts_enabled = True

    # ============================================================
    # LOAD FEATURE DATA
    # ============================================================

    try:
        feature_df = pd.read_csv(FEATURE_FILE)
        feature_df["timestamp"] = pd.to_datetime(
            feature_df["timestamp"], errors="coerce"
        )
        feature_df = feature_df[feature_df["timestamp"].notna()]
    except Exception as e:
        print("Feature file error:", str(e))
        feature_df = pd.DataFrame()

    # ============================================================
    # USER HISTORY (sirf transactions table se)
    # ============================================================

    history_query = text("""
        SELECT
            transaction_id,
            sender_id,
            receiver_id,
            amount,
            timestamp
        FROM transactions
        WHERE sender_id = :sender_id
          AND timestamp < :timestamp
        ORDER BY timestamp
    """)

    with engine.connect() as connection:
        history_result = connection.execute(
            history_query,
            {
                "sender_id": sender_id,
                "timestamp": timestamp
            }
        )
        history_rows = history_result.mappings().all()

    history_df = pd.DataFrame(history_rows)

    if not history_df.empty:
        history_df["timestamp"] = pd.to_datetime(history_df["timestamp"])

    # ============================================================
    # BASIC USER STATISTICS
    # ============================================================

    if history_df.empty:
        user_avg_amount = amount
        amount_std = 0.0
        historical_amount_zscore = 0.0
        amount_vs_user_avg = 0.0
        amount_ratio = 1.0
    else:
        user_avg_amount = float(history_df["amount"].mean())
        amount_std = float(history_df["amount"].std()) if len(history_df) > 1 else 0.0

        if pd.isna(amount_std):
            amount_std = 0.0

        if amount_std > 0:
            historical_amount_zscore = (amount - user_avg_amount) / amount_std
        else:
            historical_amount_zscore = 0.0

        amount_vs_user_avg = amount - user_avg_amount
        amount_ratio = amount / user_avg_amount if user_avg_amount > 0 else 1.0

    # ============================================================
    # NEW RECIPIENT
    # ============================================================

    if history_df.empty:
        is_new_recipient = 1
    else:
        is_new_recipient = int(
            receiver_id not in set(history_df["receiver_id"])
        )

    # ============================================================
    # VELOCITY
    # ============================================================

    transactions_last_10m = 0
    transactions_last_1h = 0
    transactions_last_24h = 0

    if not history_df.empty:
        transactions_last_10m = int(
            (history_df["timestamp"] >= timestamp - pd.Timedelta(minutes=10)).sum()
        )
        transactions_last_1h = int(
            (history_df["timestamp"] >= timestamp - pd.Timedelta(hours=1)).sum()
        )
        transactions_last_24h = int(
            (history_df["timestamp"] >= timestamp - pd.Timedelta(hours=24)).sum()
        )

    # ============================================================
    # TIME SINCE PREVIOUS
    # ============================================================

    time_since_previous_transaction = -1.0

    if not history_df.empty:
        previous_timestamp = history_df["timestamp"].max()
        time_since_previous_transaction = (
            timestamp - previous_timestamp
        ).total_seconds() / 60

    # ============================================================
    # USER FEATURES (CSV + Live predictions)
    # ============================================================

    user_features = pd.DataFrame()

    # 1. CSV se features
    if not feature_df.empty:
        csv_features = feature_df[
            (feature_df["sender_id"] == sender_id)
            & (feature_df["timestamp"] < timestamp)
        ].copy()

        if not csv_features.empty:
            user_features = csv_features

    # 2. Live predictions se features (agar CSV me nahi mila ya missing columns)
    try:
        live_query = text("""
            SELECT
                transaction_id,
                sender_id,
                receiver_id,
                amount,
                timestamp,
                device_id,
                latitude,
                longitude
            FROM fraud_predictions
            WHERE sender_id = :sender_id
              AND timestamp < :timestamp
            ORDER BY timestamp
        """)

        with engine.connect() as connection:
            live_result = connection.execute(
                live_query,
                {
                    "sender_id": sender_id,
                    "timestamp": timestamp
                }
            )
            live_rows = live_result.mappings().all()

        if live_rows:
            live_df = pd.DataFrame(live_rows)
            live_df["timestamp"] = pd.to_datetime(live_df["timestamp"])

            # Ensure all required columns exist
            for col in ["device_id", "latitude", "longitude", "home_lat", "home_lon"]:
                if col not in live_df.columns:
                    live_df[col] = None

            if user_features.empty:
                user_features = live_df
            else:
                # Ensure CSV has same columns
                for col in ["device_id", "latitude", "longitude"]:
                    if col not in user_features.columns:
                        user_features[col] = None

                user_features = pd.concat(
                    [user_features, live_df],
                    ignore_index=True
                ).sort_values("timestamp").reset_index(drop=True)

    except Exception as e:
        print("Live features error:", str(e))

    # ============================================================
    # NEW DEVICE
    # ============================================================

    is_new_device = 1

    if (
        not user_features.empty
        and "device_id" in user_features.columns
    ):
        known_devices = set(
            user_features["device_id"].dropna().astype(str)
        )
        is_new_device = int(str(device_id) not in known_devices)

    # ============================================================
    # LOCATION ANALYSIS
    # ============================================================

    is_new_location = 1
    impossible_travel_flag = 0
    distance_from_home_km = 0.0
    distance_from_previous_location_km = 0.0
    travel_speed_kmph = 0.0

    if not user_features.empty:

        # Home location (CSV se)
        if (
            "home_lat" in user_features.columns
            and "home_lon" in user_features.columns
        ):
            home_lat = user_features["home_lat"].dropna()
            home_lon = user_features["home_lon"].dropna()

            if len(home_lat) > 0 and len(home_lon) > 0:
                distance_from_home_km = haversine_distance(
                    float(home_lat.iloc[0]),
                    float(home_lon.iloc[0]),
                    latitude,
                    longitude
                )

        # Previous location
        if (
            "latitude" in user_features.columns
            and "longitude" in user_features.columns
        ):
            # Filter rows with valid location
            valid_locations = user_features[
                user_features["latitude"].notna()
                & user_features["longitude"].notna()
            ].sort_values("timestamp")

            if not valid_locations.empty:
                previous_location = valid_locations.iloc[-1]

                previous_lat = float(previous_location["latitude"])
                previous_lon = float(previous_location["longitude"])

                distance_from_previous_location_km = haversine_distance(
                    previous_lat, previous_lon, latitude, longitude
                )

                previous_time = pd.to_datetime(previous_location["timestamp"])

                time_difference_hours = (
                    timestamp - previous_time
                ).total_seconds() / 3600

                if time_difference_hours > 0:
                    travel_speed_kmph = (
                        distance_from_previous_location_km / time_difference_hours
                    )

                if travel_speed_kmph > 500:
                    impossible_travel_flag = 1

                # New location check
                same_location = valid_locations[
                    (valid_locations["latitude"] - latitude).abs() < 0.01
                ]
                same_location = same_location[
                    (same_location["longitude"] - longitude).abs() < 0.01
                ]

                if len(same_location) > 0:
                    is_new_location = 0

    # ============================================================
    # IQR DETECTION
    # ============================================================

    amount_iqr_flag = 0
    historical_amounts = []

    if not history_df.empty:
        historical_amounts = history_df["amount"].astype(float).tolist()

    if len(historical_amounts) >= 4:
        q1 = np.percentile(historical_amounts, 25)
        q3 = np.percentile(historical_amounts, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        amount_iqr_flag = int(amount < lower_bound or amount > upper_bound)

    elif "amount" in feature_df.columns:
        q1 = feature_df["amount"].quantile(0.25)
        q3 = feature_df["amount"].quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        amount_iqr_flag = int(amount < lower_bound or amount > upper_bound)

    # ============================================================
    # EXTREME AMOUNT (zscore-based tiered)
    # ============================================================

    if history_df.empty:
        # Naya user — amount-based fallback
        if amount >= 1000000:
            extreme_amount_flag = 2
        elif amount >= 100000:
            extreme_amount_flag = 1
        else:
            extreme_amount_flag = 0
    else:
        # Old user — zscore-based
        if abs(historical_amount_zscore) >= 5:
            extreme_amount_flag = 2
        elif abs(historical_amount_zscore) >= 3:
            extreme_amount_flag = 1
        else:
            extreme_amount_flag = 0

    # ============================================================
    # DAILY SPENDING
    # ============================================================

    daily_spending_ratio = 1.0
    daily_spending_deviation = 0.0
    high_spending_deviation_flag = 0

    if not history_df.empty:
        history_df["date"] = history_df["timestamp"].dt.date
        current_date = timestamp.date()

        previous_daily = (
            history_df
            .groupby("date")
            .agg(daily_spending=("amount", "sum"))
            .reset_index()
        )

        previous_daily = previous_daily[previous_daily["date"] < current_date]

        if len(previous_daily) > 0:
            historical_daily_avg = previous_daily["daily_spending"].mean()

            if historical_daily_avg > 0:
                daily_spending_ratio = amount / historical_daily_avg
                daily_spending_deviation = amount - historical_daily_avg
                high_spending_deviation_flag = int(daily_spending_ratio >= 3)

    # ============================================================
    # TIME-SERIES (7-day rolling z-score)
    # ============================================================

    time_series_anomaly_score = 0.0
    time_series_anomaly_flag = 0

    if not history_df.empty:

        history_df["date"] = history_df["timestamp"].dt.date

        daily = (
            history_df
            .groupby("date")
            .agg(
                daily_spending=("amount", "sum"),
                daily_transaction_count=("amount", "count")
            )
            .reset_index()
            .sort_values("date")
        )

        current_date = timestamp.date()

        current_day_exists = (daily["date"] == current_date).any()

        if current_day_exists:
            daily.loc[daily["date"] == current_date, "daily_spending"] += amount
            daily.loc[daily["date"] == current_date, "daily_transaction_count"] += 1
        else:
            live_day = pd.DataFrame({
                "date": [current_date],
                "daily_spending": [amount],
                "daily_transaction_count": [1]
            })
            daily = pd.concat([daily, live_day], ignore_index=True)
            daily = daily.sort_values("date")

        daily["rolling_spending_mean"] = (
            daily["daily_spending"].shift(1).rolling(window=7, min_periods=3).mean()
        )
        daily["rolling_spending_std"] = (
            daily["daily_spending"].shift(1).rolling(window=7, min_periods=3).std()
        )
        daily["spending_time_zscore"] = (
            (daily["daily_spending"] - daily["rolling_spending_mean"])
            / daily["rolling_spending_std"]
        )

        daily["rolling_transaction_mean"] = (
            daily["daily_transaction_count"].shift(1).rolling(window=7, min_periods=3).mean()
        )
        daily["rolling_transaction_std"] = (
            daily["daily_transaction_count"].shift(1).rolling(window=7, min_periods=3).std()
        )
        daily["frequency_time_zscore"] = (
            (daily["daily_transaction_count"] - daily["rolling_transaction_mean"])
            / daily["rolling_transaction_std"]
        )

        latest = daily.iloc[-1]

        spending_zscore = (
            abs(latest["spending_time_zscore"])
            if pd.notna(latest["spending_time_zscore"])
            else 0
        )
        frequency_zscore = (
            abs(latest["frequency_time_zscore"])
            if pd.notna(latest["frequency_time_zscore"])
            else 0
        )

        spending_score = (min(spending_zscore, 5) / 5) * 70
        frequency_score = (min(frequency_zscore, 5) / 5) * 30

        time_series_anomaly_score = float(round(spending_score + frequency_score, 2))

        time_series_anomaly_flag = int(
            (pd.notna(latest["spending_time_zscore"]) and latest["spending_time_zscore"] >= 3)
            or
            (pd.notna(latest["frequency_time_zscore"]) and latest["frequency_time_zscore"] >= 3)
        )

    # ============================================================
    # ISOLATION FOREST
    # ============================================================

    isolation_input = {
        "amount": float(amount),
        "amount_ratio": float(amount_ratio),
        "amount_vs_user_avg": float(amount_vs_user_avg),
        "historical_amount_zscore": float(historical_amount_zscore),
        "transactions_last_10m": int(transactions_last_10m),
        "transactions_last_1h": int(transactions_last_1h),
        "transactions_last_24h": int(transactions_last_24h),
        "time_since_previous_transaction": float(time_since_previous_transaction),
        "is_new_device": int(is_new_device),
        "is_new_recipient": int(is_new_recipient),
        "distance_from_home_km": float(distance_from_home_km),
        "distance_from_previous_location_km": float(distance_from_previous_location_km),
        "travel_speed_kmph": float(travel_speed_kmph),
        "impossible_travel_flag": int(impossible_travel_flag),
        "daily_spending_ratio": float(daily_spending_ratio),
        "daily_spending_deviation": float(daily_spending_deviation),
        "high_spending_deviation_flag": int(high_spending_deviation_flag),
        "extreme_amount_flag": int(extreme_amount_flag)
    }

    isolation_input_df = pd.DataFrame(
        [[isolation_input[f] for f in isolation_features]],
        columns=isolation_features
    )

    isolation_input_df = isolation_input_df.replace([np.inf, -np.inf], 0)
    isolation_input_df = isolation_input_df.fillna(0)

    try:
        isolation_prediction = isolation_model.predict(isolation_input_df)[0]
        isolation_anomaly_flag = int(isolation_prediction == -1)
    except Exception as e:
        print("Isolation Forest error:", str(e))
        isolation_anomaly_flag = 0

    # ============================================================
    # RISK SCORING (Total 100)
    # ============================================================

    risk_iqr = float(amount_iqr_flag * 15)
    risk_isolation = float(isolation_anomaly_flag * 20)
    risk_time_series = float(time_series_anomaly_score * 0.20)

    if extreme_amount_flag == 2:
        risk_extreme_amount = 20.0
    elif extreme_amount_flag == 1:
        risk_extreme_amount = 10.0
    else:
        risk_extreme_amount = 0.0

    risk_impossible_travel = float(impossible_travel_flag * 5)
    risk_new_device = float(is_new_device * 5)
    risk_new_recipient = float(is_new_recipient * 5)

    velocity_flag = int(
        transactions_last_10m >= 3 or transactions_last_1h >= 5
    )
    risk_velocity = float(velocity_flag * 5)

    amount_behavior_flag = int(abs(historical_amount_zscore) >= 3)
    risk_amount_behavior = float(amount_behavior_flag * 5)

    risk_score = float(min(
        risk_iqr
        + risk_isolation
        + risk_time_series
        + risk_extreme_amount
        + risk_impossible_travel
        + risk_new_device
        + risk_new_recipient
        + risk_velocity
        + risk_amount_behavior,
        100
    ))

    risk_score = round(risk_score, 2)

    # ============================================================
    # RISK LEVEL
    # ============================================================

    if risk_score >= 80:
        risk_level = "Critical"
    elif risk_score >= 60:
        risk_level = "High"
    elif risk_score >= 30:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    fraud_prediction = int(risk_score >= 60)

    # ============================================================
    # REASONS
    # ============================================================

    reasons = []

    if amount_ratio >= 3:
        reasons.append("Transaction amount is significantly higher than user's average")

    if amount >= 50000:
        reasons.append("High transaction amount")

    if is_new_recipient:
        reasons.append("New receiver")

    if velocity_flag:
        reasons.append("Unusual transaction frequency")

    if is_new_device:
        reasons.append("New device detected")

    if is_new_location:
        reasons.append("New location detected")

    if impossible_travel_flag:
        reasons.append("Impossible travel detected")

    if amount_iqr_flag:
        reasons.append("Amount anomaly detected by IQR")

    if isolation_anomaly_flag:
        reasons.append("Isolation Forest anomaly detected")

    if time_series_anomaly_flag:
        reasons.append("Time-series behavioral anomaly detected")

    if extreme_amount_flag:
        reasons.append("Extreme transaction amount detected")

    if amount_behavior_flag:
        reasons.append("Transaction amount is highly unusual for this user")

    # ============================================================
    # DATABASE INSERT
    # ============================================================

    prediction_query = text("""
        INSERT INTO fraud_predictions (
            transaction_id, sender_id, receiver_id, amount, timestamp,
            risk_score, risk_level, fraud_prediction, reasons, created_at,
            device_id, latitude, longitude,
            risk_iqr, risk_isolation, risk_time_series, risk_extreme_amount,
            risk_velocity, risk_new_device, risk_new_recipient,
            risk_impossible_travel, risk_amount_behavior
        )
        VALUES (
            :transaction_id, :sender_id, :receiver_id, :amount, :timestamp,
            :risk_score, :risk_level, :fraud_prediction,
            CAST(:reasons AS jsonb), NOW(),
            :device_id, :latitude, :longitude,
            :risk_iqr, :risk_isolation, :risk_time_series, :risk_extreme_amount,
            :risk_velocity, :risk_new_device, :risk_new_recipient,
            :risk_impossible_travel, :risk_amount_behavior
        )
        RETURNING id
    """)

    alert_id = None
    create_alert = False

    if fraud_alerts_enabled:
        if risk_level == "High":
            create_alert = True
        elif risk_level == "Critical":
            if critical_alerts_enabled:
                create_alert = True

    with engine.begin() as connection:

        connection.execute(
            prediction_query,
            {
                "transaction_id": str(transaction_id),
                "sender_id": str(sender_id),
                "receiver_id": str(receiver_id),
                "amount": float(amount),
                "timestamp": timestamp,
                "risk_score": float(risk_score),
                "risk_level": str(risk_level),
                "fraud_prediction": int(fraud_prediction),
                "reasons": json.dumps(reasons),
                "device_id": str(device_id),
                "latitude": float(latitude),
                "longitude": float(longitude),
                "risk_iqr": float(risk_iqr),
                "risk_isolation": float(risk_isolation),
                "risk_time_series": float(risk_time_series),
                "risk_extreme_amount": float(risk_extreme_amount),
                "risk_velocity": float(risk_velocity),
                "risk_new_device": float(risk_new_device),
                "risk_new_recipient": float(risk_new_recipient),
                "risk_impossible_travel": float(risk_impossible_travel),
                "risk_amount_behavior": float(risk_amount_behavior)
            }
        )

        if create_alert:
            alert_query = text("""
                INSERT INTO fraud_alerts (
                    transaction_id, risk_score, risk_level,
                    alert_status, reasons, created_at
                )
                VALUES (
                    :transaction_id, :risk_score, :risk_level,
                    'Open', CAST(:reasons AS jsonb), NOW()
                )
                RETURNING id
            """)

            alert_result = connection.execute(
                alert_query,
                {
                    "transaction_id": str(transaction_id),
                    "risk_score": float(risk_score),
                    "risk_level": str(risk_level),
                    "reasons": json.dumps(reasons)
                }
            )
            alert_id = alert_result.scalar()

    # ============================================================
    # WEBSOCKET
    # ============================================================

    websocket_broadcast = False

    if realtime_alerts_enabled:
        await manager.broadcast({
            "type": "new_prediction",
            "data": {
                "transaction_id": str(transaction_id),
                "sender_id": str(sender_id),
                "receiver_id": str(receiver_id),
                "amount": float(amount),
                "timestamp": timestamp.isoformat(),
                "risk_score": float(risk_score),
                "risk_level": str(risk_level),
                "fraud_prediction": int(fraud_prediction),
                "reasons": reasons,
                "alert_id": alert_id
            }
        })
        websocket_broadcast = True

    # ============================================================
    # RESPONSE
    # ============================================================

    return {
        "success": True,
        "transaction_id": transaction_id,
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "fraud_prediction": int(fraud_prediction),
        "reasons": reasons,
        "alert_id": alert_id,
        "websocket_broadcast": websocket_broadcast,
        "settings": {
            "fraud_alerts": fraud_alerts_enabled,
            "critical_alerts": critical_alerts_enabled,
            "realtime_alerts": realtime_alerts_enabled
        }
    }