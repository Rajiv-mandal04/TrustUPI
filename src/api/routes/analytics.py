from fastapi import APIRouter
from sqlalchemy import text

from src.api.database import engine

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"]
)


@router.get("/")
def get_analytics():

    query = text("""
        WITH latest_live_predictions AS (
            SELECT
                transaction_id,
                sender_id,
                receiver_id,
                amount,
                timestamp,
                risk_score,
                risk_level,
                fraud_prediction,
                created_at,
                ROW_NUMBER() OVER (
                    PARTITION BY transaction_id
                    ORDER BY created_at DESC
                ) AS rn
            FROM fraud_predictions
        ),

        live_unique AS (
            SELECT
                transaction_id,
                sender_id,
                receiver_id,
                amount,
                timestamp,
                risk_score,
                risk_level,
                fraud_prediction
            FROM latest_live_predictions
            WHERE rn = 1
        ),

        unified_transactions AS (

            -- Historical transactions
            SELECT
                t.transaction_id,
                t.amount,
                t.timestamp,
                t.risk_score,
                t.risk_level,
                t.fraud_label AS fraud_prediction
            FROM transactions t

            UNION ALL

            -- Live transactions which are not already historical
            SELECT
                l.transaction_id,
                l.amount,
                l.timestamp,
                l.risk_score,
                l.risk_level,
                l.fraud_prediction
            FROM live_unique l
            WHERE NOT EXISTS (
                SELECT 1
                FROM transactions t
                WHERE t.transaction_id = l.transaction_id
            )
        )

        SELECT
            COUNT(*) AS total_transactions,

            COUNT(*) FILTER (
                WHERE fraud_prediction = 1
            ) AS fraudulent_transactions,

            COUNT(*) FILTER (
                WHERE risk_level = 'Low'
            ) AS low_risk,

            COUNT(*) FILTER (
                WHERE risk_level = 'Medium'
            ) AS medium_risk,

            COUNT(*) FILTER (
                WHERE risk_level = 'High'
            ) AS high_risk,

            COUNT(*) FILTER (
                WHERE risk_level = 'Critical'
            ) AS critical_risk,

            COALESCE(
                ROUND(AVG(amount)::numeric, 2),
                0
            ) AS average_amount,

            COALESCE(
                ROUND(AVG(risk_score)::numeric, 2),
                0
            ) AS average_risk_score

        FROM unified_transactions
    """)

    with engine.connect() as connection:
        result = connection.execute(query)
        row = result.mappings().first()

    total = int(row["total_transactions"] or 0)
    fraud = int(row["fraudulent_transactions"] or 0)

    fraud_rate = (
        round((fraud / total) * 100, 2)
        if total > 0
        else 0
    )

    return {
        "total_transactions": total,

        "fraudulent_transactions": fraud,
        "fraud_transactions": fraud,

        "fraud_rate": fraud_rate,

        "low_risk": int(row["low_risk"] or 0),
        "medium_risk": int(row["medium_risk"] or 0),
        "high_risk": int(row["high_risk"] or 0),
        "critical_risk": int(row["critical_risk"] or 0),

        "average_amount": float(row["average_amount"] or 0),
        "average_transaction_amount": float(
            row["average_amount"] or 0
        ),

        "average_risk_score": float(
            row["average_risk_score"] or 0
        ),
    }


@router.get("/activity")
def get_transaction_activity():

    query = text("""
        WITH latest_live_predictions AS (
            SELECT
                transaction_id,
                timestamp,
                fraud_prediction,
                ROW_NUMBER() OVER (
                    PARTITION BY transaction_id
                    ORDER BY created_at DESC
                ) AS rn
            FROM fraud_predictions
        ),

        live_unique AS (
            SELECT
                transaction_id,
                timestamp,
                fraud_prediction
            FROM latest_live_predictions
            WHERE rn = 1
        ),

        unified_transactions AS (

            SELECT
                t.transaction_id,
                t.timestamp,
                t.fraud_label AS fraud_prediction
            FROM transactions t

            UNION ALL

            SELECT
                l.transaction_id,
                l.timestamp,
                l.fraud_prediction
            FROM live_unique l
            WHERE NOT EXISTS (
                SELECT 1
                FROM transactions t
                WHERE t.transaction_id = l.transaction_id
            )
        )

        SELECT
            DATE_TRUNC('hour', timestamp) AS time,

            COUNT(*) AS transactions,

            COUNT(*) FILTER (
                WHERE fraud_prediction = 1
            ) AS fraud

        FROM unified_transactions

        GROUP BY DATE_TRUNC('hour', timestamp)

        ORDER BY time
    """)

    with engine.connect() as connection:
        result = connection.execute(query)
        rows = result.mappings().all()

    return {
        "count": len(rows),

        "data": [
            {
                "time": row["time"],
                "transactions": int(
                    row["transactions"] or 0
                ),
                "fraud": int(
                    row["fraud"] or 0
                ),
            }
            for row in rows
        ],
    }