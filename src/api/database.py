from sqlalchemy import create_engine
from src.database.connection import database_url

engine = create_engine(
    database_url,
    pool_pre_ping=True
)