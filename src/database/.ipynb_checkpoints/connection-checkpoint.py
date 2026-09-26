import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

load_dotenv()

DB_USER = os.getenv("postgres")
DB_PASSWORD = os.getenv("rajiv123")
DB_HOST = os.getenv("localhost")
DB_PORT = os.getenv("5432")
DB_NAME = os.getenv("upi_fraud_detection")

database_url = URL.create(
    drivername="postgresql+psycopg2",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT),
    database=DB_NAME
)

engine = create_engine(
    database_url,
    pool_pre_ping=True
)

print("Database connection configured successfully.")