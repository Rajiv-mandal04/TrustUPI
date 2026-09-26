import pandas as pd

from connection import engine


CSV_PATH = r"D:\Machine Learning\upi_fraud_detection\data\processed\risk_scored_transactions.csv"

df = pd.read_csv(CSV_PATH)

print("CSV loaded successfully!")
print("Shape:", df.shape)

df.to_sql(
    "transactions",
    engine,
    if_exists="replace",
    index=False
)

print("Data successfully loaded into PostgreSQL!")