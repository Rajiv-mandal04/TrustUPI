from sqlalchemy import text
from src.api.database import engine


with engine.begin() as connection:

    # -----------------------------
    # FRAUD PREDICTIONS
    # -----------------------------
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS fraud_predictions (
            id SERIAL PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            risk_score DOUBLE PRECISION NOT NULL,
            risk_level TEXT NOT NULL,
            fraud_prediction INTEGER NOT NULL,
            reasons JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # -----------------------------
    # FRAUD ALERTS
    # -----------------------------
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS fraud_alerts (
            id SERIAL PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            risk_score DOUBLE PRECISION NOT NULL,
            risk_level TEXT NOT NULL,
            alert_status TEXT DEFAULT 'OPEN',
            reasons JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # -----------------------------
    # ADMIN USERS
    # -----------------------------
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS admin_users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'Admin',
            designation VARCHAR(100) NOT NULL DEFAULT 'Fraud Analyst',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            last_login TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """))


print("API tables created successfully!")