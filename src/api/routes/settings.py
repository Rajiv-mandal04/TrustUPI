from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from src.api.database import engine


router = APIRouter(
    prefix="/api/v1/settings",
    tags=["Settings"]
)


# ============================================================
# REQUEST MODEL
# ============================================================

class SettingsUpdate(BaseModel):
    name: str
    email: str
    fraud_alerts: bool
    critical_alerts: bool
    realtime_alerts: bool


# ============================================================
# GET SETTINGS
# ============================================================

@router.get("/")
def get_settings():

    try:
        with engine.begin() as conn:

            result = conn.execute(
                text("""
                    SELECT
                        id,
                        name,
                        email,
                        fraud_alerts,
                        critical_alerts,
                        realtime_alerts
                    FROM trustupi_settings
                    ORDER BY id
                    LIMIT 1
                """)
            )

            row = result.mappings().first()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="TrustUPI settings not found"
                )

            return dict(row)

    except HTTPException:
        raise

    except Exception as error:
        print("Get settings error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to load settings"
        )


# ============================================================
# UPDATE SETTINGS
# ============================================================

@router.put("/")
def update_settings(settings: SettingsUpdate):

    try:
        with engine.begin() as conn:

            result = conn.execute(
                text("""
                    UPDATE trustupi_settings
                    SET
                        name = :name,
                        email = :email,
                        fraud_alerts = :fraud_alerts,
                        critical_alerts = :critical_alerts,
                        realtime_alerts = :realtime_alerts,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = (
                        SELECT id
                        FROM trustupi_settings
                        ORDER BY id
                        LIMIT 1
                    )
                    RETURNING
                        id,
                        name,
                        email,
                        fraud_alerts,
                        critical_alerts,
                        realtime_alerts
                """),
                {
                    "name": settings.name,
                    "email": settings.email,
                    "fraud_alerts": settings.fraud_alerts,
                    "critical_alerts": settings.critical_alerts,
                    "realtime_alerts": settings.realtime_alerts,
                }
            )

            row = result.mappings().first()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="TrustUPI settings not found"
                )

            return {
                "message": "Settings updated successfully",
                "settings": dict(row)
            }

    except HTTPException:
        raise

    except Exception as error:
        print("Update settings error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to update settings"
        )