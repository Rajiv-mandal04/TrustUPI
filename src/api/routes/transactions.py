from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from src.api.database import engine


router = APIRouter(
    prefix="/api/v1/transactions",
    tags=["Transactions"]
)


# ============================================================
# GET RECENT TRANSACTIONS
# ============================================================

@router.get("/")
def get_transactions(limit: int = 100):

    query = text("""
        WITH historical_transactions AS (
            SELECT
                transaction_id, sender_id, receiver_id, amount, timestamp,
                risk_score, risk_level,
                fraud_label AS fraud_prediction,
                'historical' AS source
            FROM transactions
        ),
        live_predictions_ranked AS (
            SELECT
                fp.transaction_id, fp.sender_id, fp.receiver_id,
                fp.amount, fp.timestamp, fp.risk_score, fp.risk_level,
                fp.fraud_prediction, 'live' AS source,
                ROW_NUMBER() OVER (
                    PARTITION BY fp.transaction_id
                    ORDER BY fp.created_at DESC
                ) AS row_number
            FROM fraud_predictions fp
            WHERE NOT EXISTS (
                SELECT 1 FROM transactions t
                WHERE t.transaction_id = fp.transaction_id
            )
        ),
        live_predictions AS (
            SELECT transaction_id, sender_id, receiver_id,
                   amount, timestamp, risk_score, risk_level,
                   fraud_prediction, source
            FROM live_predictions_ranked
            WHERE row_number = 1
        ),
        unified_transactions AS (
            SELECT * FROM historical_transactions
            UNION ALL
            SELECT * FROM live_predictions
        )
        SELECT transaction_id, sender_id, receiver_id, amount, timestamp,
               risk_score, risk_level, fraud_prediction, source
        FROM unified_transactions
        ORDER BY timestamp DESC
        LIMIT :limit
    """)

    with engine.connect() as connection:
        result = connection.execute(query, {"limit": limit})
        rows = result.mappings().all()

    return {
        "count": len(rows),
        "data": [dict(row) for row in rows]
    }


# ============================================================
# GET TRANSACTION DETAILS
# ============================================================

@router.get("/{transaction_id}")
def get_transaction(transaction_id: str):

    transaction_query = text("""
        SELECT * FROM transactions
        WHERE transaction_id = :transaction_id
        LIMIT 1
    """)

    prediction_query = text("""
        SELECT
            transaction_id, sender_id, receiver_id, amount, timestamp,
            risk_score, risk_level, fraud_prediction,
            reasons, created_at, device_id, latitude, longitude,
            risk_iqr, risk_isolation, risk_time_series, risk_extreme_amount,
            risk_velocity, risk_new_device, risk_new_recipient,
            risk_impossible_travel, risk_amount_behavior
        FROM fraud_predictions
        WHERE transaction_id = :transaction_id
        ORDER BY created_at DESC
        LIMIT 1
    """)

    alert_query = text("""
        SELECT risk_score, risk_level, alert_status, reasons
        FROM fraud_alerts
        WHERE transaction_id = :transaction_id
        ORDER BY created_at DESC
        LIMIT 1
    """)

    with engine.connect() as connection:

        transaction = connection.execute(
            transaction_query,
            {"transaction_id": transaction_id}
        ).mappings().first()

        prediction = connection.execute(
            prediction_query,
            {"transaction_id": transaction_id}
        ).mappings().first()

        alert = connection.execute(
            alert_query,
            {"transaction_id": transaction_id}
        ).mappings().first()

    if not transaction and not prediction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    if transaction:
        data = dict(transaction)
    else:
        data = {
            "transaction_id": prediction["transaction_id"],
            "sender_id": prediction["sender_id"],
            "receiver_id": prediction["receiver_id"],
            "amount": prediction["amount"],
            "timestamp": prediction["timestamp"],
            "device_id": prediction["device_id"],
            "latitude": prediction["latitude"],
            "longitude": prediction["longitude"],
        }

    if prediction:

        data["fraud_prediction"] = prediction["fraud_prediction"]
        data["prediction_risk_score"] = prediction["risk_score"]
        data["prediction_risk_level"] = prediction["risk_level"]
        data["reasons"] = prediction["reasons"] or []
        data["prediction_created_at"] = prediction["created_at"]
        data["device_id"] = prediction["device_id"]
        data["latitude"] = prediction["latitude"]
        data["longitude"] = prediction["longitude"]

        data["risk_iqr"] = prediction["risk_iqr"] or 0
        data["risk_isolation"] = prediction["risk_isolation"] or 0
        data["risk_time_series"] = prediction["risk_time_series"] or 0
        data["risk_extreme_amount"] = prediction["risk_extreme_amount"] or 0
        data["risk_velocity"] = prediction["risk_velocity"] or 0
        data["risk_new_device"] = prediction["risk_new_device"] or 0
        data["risk_new_recipient"] = prediction["risk_new_recipient"] or 0
        data["risk_impossible_travel"] = prediction["risk_impossible_travel"] or 0
        data["risk_amount_behavior"] = prediction["risk_amount_behavior"] or 0

        data["risk_breakdown"] = {
            "iqr": prediction["risk_iqr"] or 0,
            "isolation": prediction["risk_isolation"] or 0,
            "time_series": prediction["risk_time_series"] or 0,
            "extreme_amount": prediction["risk_extreme_amount"] or 0,
            "velocity": prediction["risk_velocity"] or 0,
            "new_device": prediction["risk_new_device"] or 0,
            "new_recipient": prediction["risk_new_recipient"] or 0,
            "impossible_travel": prediction["risk_impossible_travel"] or 0,
            "amount_behavior": prediction["risk_amount_behavior"] or 0
        }

    else:

        data["fraud_prediction"] = (
            1 if float(data.get("risk_score", 0)) >= 60 else 0
        )
        data["reasons"] = []
        data["device_id"] = data.get("device_id")
        data["latitude"] = data.get("latitude")
        data["longitude"] = data.get("longitude")

        data["risk_breakdown"] = {
            "iqr": data.get("risk_iqr", 0) or 0,
            "isolation": data.get("risk_isolation", 0) or 0,
            "time_series": data.get("risk_time_series", 0) or 0,
            "extreme_amount": data.get("risk_extreme_amount", 0) or 0,
            "velocity": data.get("risk_velocity", 0) or 0,
            "new_device": data.get("risk_new_device", 0) or 0,
            "new_recipient": data.get("risk_new_recipient", 0) or 0,
            "impossible_travel": data.get("risk_impossible_travel", 0) or 0,
            "amount_behavior": data.get("risk_amount_behavior", 0) or 0
        }

    if alert:
        data["alert_status"] = alert["alert_status"]
        if alert["reasons"]:
            data["reasons"] = alert["reasons"]
    else:
        data["alert_status"] = None

    return data