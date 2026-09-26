# TrustUPI — Secure Every UPI Payment

**TrustUPI** — AI-powered UPI Fraud Detection is an end-to-end fraud detection platform designed to analyze UPI transactions, identify suspicious behavior, calculate transaction risk, and generate fraud alerts.
<br>
<br>
The system combines machine learning, anomaly detection, behavioral analysis, FastAPI, PostgreSQL, and React to provide a real-time fraud monitoring dashboard.
<br>
<br>
**Website:** https://trustupi.vercel.app/ <br>
**API Documentation:** https://trustupi.onrender.com/docs

---

## 🚀 Features

* 🤖 AI-powered UPI fraud detection
* 🔍 IQR-based anomaly detection
* 🌲 Isolation Forest anomaly detection
* 📊 Transaction risk scoring
* 🚨 High & Critical fraud alerts
* 🧠 Behavioral and time-based analysis
* 📈 Fraud and transaction analytics
* ⚡ FastAPI REST API
* 🗄️ PostgreSQL database
* 💻 React dashboard
* 🔄 Real-time dashboard updates

---

## 🛠️ Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Axios, Recharts

**Backend:** Python, FastAPI, SQLAlchemy, Pandas, NumPy, Scikit-learn

**Database:** PostgreSQL

---

## 💻 Run Locally

### Backend

```bash
cd backend
```

Create virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the FastAPI server:

**Option 1:**

```bash
python -m uvicorn src.api.main:app --reload
```

**Option 2:**

```bash
uvicorn src.api.main:app --reload
```

**Backend:** http://127.0.0.1:8000

**Swagger API:** http://127.0.0.1:8000/docs

---

### Frontend

Open a new terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

**Frontend:** http://localhost:5173

---

## 🔌 Fraud Detection API

You can test a UPI transaction directly using the deployed Swagger API:

**Swagger:** https://trustupi.onrender.com/docs

Go to:

**Predictions → POST `/api/v1/predict/`**

Example input:

```json
{
  "transaction_id": "FRESH_ONE_SHOT04",
  "sender_id": "FRESH_ONE_USER1",
  "receiver_id": "FRESH_ONE_RECV",
  "amount": 11000000,
  "timestamp": "2026-09-25T01:36:00",
  "latitude": 28.6149,
  "longitude": 77.2490,
  "device_id": "DEVICE_TEST_0022"
}
```

The API analyzes the transaction and returns the **risk score, risk level, fraud prediction, detection reasons, and alert information**.

---

## 📊 Risk Levels

| Risk Score | Risk Level |
| ---------- | ---------- |
| 0–29       | Low        |
| 30–59      | Medium     |
| 60–79      | High       |
| 80–100     | Critical   |

---

## 🔄 System Workflow

```text
UPI Transaction
       ↓
Feature Engineering
       ↓
Anomaly Detection
       ↓
Risk Scoring
       ↓
Fraud Prediction
       ↓
Alert Generation
       ↓
PostgreSQL
       ↓
FastAPI
       ↓
React Dashboard
```

---

## 👨‍💻 Author

**Rajiv Kumar Mandal**

B.Tech Computer Science Engineering
