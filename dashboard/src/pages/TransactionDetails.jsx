import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  CreditCard,
  MapPin,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { getTransaction } from "../services/api";

export default function TransactionDetails() {
  const { transactionId } = useParams();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTransaction = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getTransaction(transactionId);
        setTransaction(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load transaction details.");
      } finally {
        setLoading(false);
      }
    };
    loadTransaction();
  }, [transactionId]);

  const getRiskColor = (level) => {
    if (level === "Critical") {
      return "text-red-400 bg-red-500/10 border-red-500/20";
    }
    if (level === "High") {
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    }
    if (level === "Medium") {
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    }
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="flex min-h-[80vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400" />
              <p className="mt-4 text-sm text-zinc-500">
                Loading transaction...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Sidebar />
        <main className="ml-64">
          <Topbar />
          <div className="p-8">
            <button
              onClick={() => navigate(-1)}
              className="mb-6 flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <AlertTriangle className="mx-auto text-red-400" size={32} />
              <p className="mt-4 text-white">
                {error || "Transaction not found."}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // BASIC TRANSACTION DATA
  // ============================================================

  const riskLevel =
    transaction.prediction_risk_level ||
    transaction.risk_level ||
    "Low";

  const riskScore = Number(
    transaction.prediction_risk_score ??
      transaction.risk_score ??
      0
  );

  const fraudPrediction =
    Number(transaction.fraud_prediction) === 1
      ? "Potential Fraud"
      : "Normal Transaction";

  const isFraud = Number(transaction.fraud_prediction) === 1;

  const reasons = Array.isArray(transaction.reasons)
    ? transaction.reasons
    : [];

  const device =
    transaction.device_id ||
    transaction.registered_device ||
    "N/A";

  const hasLocation =
    transaction.latitude !== undefined &&
    transaction.latitude !== null &&
    transaction.longitude !== undefined &&
    transaction.longitude !== null;

  const location = hasLocation
    ? `${transaction.latitude}, ${transaction.longitude}`
    : "N/A";

  // ============================================================
  // RISK BREAKDOWN
  // ============================================================

  const riskBreakdown = transaction.risk_breakdown || {};

  const iqrRisk = Number(riskBreakdown.iqr ?? transaction.risk_iqr ?? 0);
  const isolationRisk = Number(
    riskBreakdown.isolation ?? transaction.risk_isolation ?? 0
  );
  const timeSeriesRisk = Number(
    riskBreakdown.time_series ?? transaction.risk_time_series ?? 0
  );
  const extremeAmountRisk = Number(
    riskBreakdown.extreme_amount ?? transaction.risk_extreme_amount ?? 0
  );
  const velocityRisk = Number(
    riskBreakdown.velocity ?? transaction.risk_velocity ?? 0
  );
  const newDeviceRisk = Number(
    riskBreakdown.new_device ?? transaction.risk_new_device ?? 0
  );
  const newRecipientRisk = Number(
    riskBreakdown.new_recipient ?? transaction.risk_new_recipient ?? 0
  );
  const impossibleTravelRisk = Number(
    riskBreakdown.impossible_travel ??
      transaction.risk_impossible_travel ??
      0
  );
  const amountBehaviorRisk = Number(
    riskBreakdown.amount_behavior ??
      transaction.risk_amount_behavior ??
      0
  );

  // ============================================================
  // ANOMALY SIGNALS
  // ============================================================

  const iqrDetected =
    iqrRisk > 0 ||
    Number(transaction.amount_iqr_flag) === 1 ||
    transaction.amount_iqr_flag === true;

  const isolationDetected =
    isolationRisk > 0 ||
    Number(transaction.isolation_anomaly_flag) === 1 ||
    transaction.isolation_anomaly_flag === true;

  const timeSeriesDetected =
    timeSeriesRisk > 0 ||
    Number(transaction.time_series_anomaly_flag) === 1 ||
    transaction.time_series_anomaly_flag === true;

  const extremeAmountDetected = extremeAmountRisk > 0;

  const newDeviceDetected =
    newDeviceRisk > 0 ||
    Number(transaction.is_new_device) === 1 ||
    transaction.is_new_device === true;

  const newRecipientDetected =
    newRecipientRisk > 0 ||
    Number(transaction.is_new_recipient) === 1 ||
    transaction.is_new_recipient === true;

  const impossibleTravelDetected =
    impossibleTravelRisk > 0 ||
    Number(transaction.impossible_travel_flag) === 1 ||
    transaction.impossible_travel_flag === true;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar />
      <main className="ml-64">
        <Topbar />

        <div className="p-22">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Transactions
          </button>

          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-cyan-400">
                Transaction Details
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">
                {transaction.transaction_id}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Detailed fraud analysis and transaction intelligence
              </p>
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${getRiskColor(
                riskLevel
              )}`}
            >
              {riskLevel === "Low" ? (
                <ShieldCheck size={18} />
              ) : (
                <ShieldAlert size={18} />
              )}
              <span className="text-sm font-medium">
                {riskLevel} Risk
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-3">
                  <ShieldAlert size={22} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Risk Score</p>
                  <p className="text-3xl font-semibold text-white">
                    {riskScore.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-zinc-500">Risk Level</span>
                  <span className="text-zinc-300">{riskLevel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${
                      riskLevel === "Critical"
                        ? "bg-red-500"
                        : riskLevel === "High"
                        ? "bg-orange-500"
                        : riskLevel === "Medium"
                        ? "bg-yellow-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(riskScore, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <CreditCard size={22} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">
                    Transaction Amount
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    ₹
                    {Number(transaction.amount || 0).toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2 }
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-3 ${
                    isFraud ? "bg-red-500/10" : "bg-emerald-500/10"
                  }`}
                >
                  {isFraud ? (
                    <AlertTriangle size={22} className="text-red-400" />
                  ) : (
                    <CheckCircle2 size={22} className="text-emerald-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-zinc-500">
                    Fraud Prediction
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold ${
                      isFraud ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {fraudPrediction}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h2 className="mb-6 font-semibold text-white">
                Transaction Information
              </h2>
              <div className="space-y-5">
                <InfoRow
                  icon={<User size={17} />}
                  label="Sender"
                  value={transaction.sender_id}
                />
                <InfoRow
                  icon={<User size={17} />}
                  label="Receiver"
                  value={transaction.receiver_id}
                />
                <InfoRow
                  icon={<Clock size={17} />}
                  label="Timestamp"
                  value={
                    transaction.timestamp
                      ? new Date(transaction.timestamp).toLocaleString(
                          "en-IN"
                        )
                      : "N/A"
                  }
                />
                <InfoRow
                  icon={<Smartphone size={17} />}
                  label="Device"
                  value={device}
                />
                <InfoRow
                  icon={<MapPin size={17} />}
                  label="Location"
                  value={location}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h2 className="mb-6 font-semibold text-white">
                Anomaly Signals
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Signal label="IQR Anomaly" active={iqrDetected} />
                <Signal
                  label="Isolation Forest"
                  active={isolationDetected}
                />
                <Signal
                  label="Time-Series"
                  active={timeSeriesDetected}
                />
                <Signal
                  label="Extreme Amount"
                  active={extremeAmountDetected}
                />
                <Signal
                  label="New Device"
                  active={newDeviceDetected}
                />
                <Signal
                  label="New Recipient"
                  active={newRecipientDetected}
                />
                <Signal
                  label="Impossible Travel"
                  active={impossibleTravelDetected}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-6 font-semibold text-white">
              Risk Score Breakdown
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <RiskMetric label="IQR" value={iqrRisk} />
              <RiskMetric
                label="Isolation Forest"
                value={isolationRisk}
              />
              <RiskMetric
                label="Time Series"
                value={timeSeriesRisk}
              />
              <RiskMetric
                label="Extreme Amount"
                value={extremeAmountRisk}
              />
              <RiskMetric label="Velocity" value={velocityRisk} />
              <RiskMetric
                label="New Device"
                value={newDeviceRisk}
              />
              <RiskMetric
                label="New Recipient"
                value={newRecipientRisk}
              />
              <RiskMetric
                label="Impossible Travel"
                value={impossibleTravelRisk}
              />
              <RiskMetric
                label="Amount Behavior"
                value={amountBehaviorRisk}
              />
            </div>
          </div>

          {transaction.fraud_scenario && (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h2 className="mb-3 font-semibold text-white">
                Fraud Scenario
              </h2>
              <p className="text-sm text-zinc-400">
                {transaction.fraud_scenario}
              </p>
            </div>
          )}

          {reasons.length > 0 && (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="mb-5">
                <h2 className="font-semibold text-white">
                  Detection Reasons
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Explainable signals identified by the TrustUPI fraud
                  engine
                </p>
              </div>
              <div className="space-y-3">
                {reasons.map((reason, index) => (
                  <div
                    key={`${reason}-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                      <AlertTriangle
                        size={13}
                        className="text-red-400"
                      />
                    </div>
                    <p className="text-sm leading-5 text-zinc-300">
                      {reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   INFO ROW
============================================================ */

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 pb-4 last:border-0 last:pb-0">
      <div className="flex items-center gap-3 text-zinc-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="max-w-[60%] truncate text-right text-sm text-zinc-200">
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   SIGNAL
============================================================ */

function Signal({ label, active }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            active
              ? "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]"
              : "bg-emerald-400"
          }`}
        />
      </div>
      <p
        className={`mt-2 text-sm font-medium ${
          active ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {active ? "Detected" : "Normal"}
      </p>
    </div>
  );
}

/* ============================================================
   RISK METRIC
============================================================ */

function RiskMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">
        {Number(value || 0).toFixed(2)}
      </p>
    </div>
  );
}