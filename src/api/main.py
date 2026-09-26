from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes.transactions import router as transactions_router
from src.api.routes.alerts import router as alerts_router
from src.api.routes.analytics import router as analytics_router
from src.api.routes.predictions import router as predictions_router
from src.api.routes.settings import router as settings_router
from src.api.routes.auth import router as auth_router

from src.api.websocket_manager import manager
from src.api.database import engine

from sqlalchemy import text


app = FastAPI(
    title="TrustUPI API",
    description="AI-powered real-time UPI fraud detection platform",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTES
# ============================================================

app.include_router(transactions_router)
app.include_router(alerts_router)
app.include_router(analytics_router)
app.include_router(predictions_router)
app.include_router(settings_router)
app.include_router(auth_router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "TrustUPI API is running"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    try:

        with engine.connect() as connection:

            connection.execute(
                text("SELECT 1")
            )

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as error:

        print(
            "Database health check failed:",
            error
        )

        return {
            "status": "healthy",
            "database": "disconnected"
        }


# ============================================================
# WEBSOCKET
# ============================================================

@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):

    await manager.connect(websocket)

    try:

        await websocket.send_json({
            "type": "connection_established",
            "message": "TrustUPI real-time connection established"
        })

        while True:

            await websocket.receive_text()

    except WebSocketDisconnect:

        manager.disconnect(websocket)

    except Exception:

        manager.disconnect(websocket)