from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from src.api.database import engine


router = APIRouter(
    prefix="/api/v1/alerts",
    tags=["Alerts"]
)


# =========================================================
# GET ALL ALERTS
# =========================================================

@router.get("/")
def get_alerts(limit: int = 100):

    query = text("""
        SELECT
            id,
            transaction_id,
            risk_score,
            risk_level,
            alert_status,
            reasons,
            created_at
        FROM fraud_alerts
        ORDER BY created_at DESC
        LIMIT :limit
    """)

    with engine.connect() as connection:

        result = connection.execute(
            query,
            {
                "limit": limit
            }
        )

        rows = result.mappings().all()

    return {
        "count": len(rows),
        "alerts": [dict(row) for row in rows]
    }


# =========================================================
# GET SINGLE ALERT
# =========================================================

@router.get("/{transaction_id}")
def get_alert(transaction_id: str):

    query = text("""
        SELECT
            id,
            transaction_id,
            risk_score,
            risk_level,
            alert_status,
            reasons,
            created_at
        FROM fraud_alerts
        WHERE transaction_id = :transaction_id
        ORDER BY created_at DESC
        LIMIT 1
    """)

    with engine.connect() as connection:

        result = connection.execute(
            query,
            {
                "transaction_id": transaction_id
            }
        )

        row = result.mappings().first()

    if not row:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return dict(row)