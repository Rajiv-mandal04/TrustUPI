import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import { getAlerts, getTransaction } from "../services/api";

const DONE_ALERTS_KEY = "trustupi_done_alerts";

const FraudAlerts = () => {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [details, setDetails] = useState({});
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [doneAlerts, setDoneAlerts] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(DONE_ALERTS_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAlerts(100);
      const alertData = response?.alerts || [];

      // Only High / Critical alerts
      const fraudAlerts = alertData.filter(
        (alert) =>
          alert.risk_level === "High" ||
          alert.risk_level === "Critical"
      );

      setAlerts(fraudAlerts);

      // Get transaction details
      const results = await Promise.allSettled(
        fraudAlerts.map((alert) =>
          getTransaction(alert.transaction_id)
        )
      );

      const detailsMap = {};

      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;

        const transaction =
          result.value?.data ||
          result.value?.transaction ||
          result.value;

        if (transaction) {
          detailsMap[fraudAlerts[index].transaction_id] =
            transaction;
        }
      });

      setDetails(detailsMap);
    } catch (err) {
      console.error("Fraud alerts error:", err);
      setError("Failed to load fraud alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const markAsDone = (transactionId) => {
    setDoneAlerts((previous) => {
      if (previous.includes(transactionId)) {
        return previous;
      }

      const updated = [...previous, transactionId];

      localStorage.setItem(
        DONE_ALERTS_KEY,
        JSON.stringify(updated)
      );

      // Tell Sidebar immediately
      window.dispatchEvent(
        new Event("fraud-alerts-updated")
      );

      return updated;
    });
  };

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alert) => {
        if (riskFilter === "All") return true;

        return alert.risk_level === riskFilter;
      })
      .filter((alert) => {
        const query = search.toLowerCase().trim();

        if (!query) return true;

        const transaction =
          details[alert.transaction_id];

        return (
          alert.transaction_id
            ?.toLowerCase()
            .includes(query) ||
          transaction?.sender_id
            ?.toLowerCase()
            .includes(query) ||
          transaction?.receiver_id
            ?.toLowerCase()
            .includes(query)
        );
      });
  }, [alerts, details, search, riskFilter]);

  const highCount = alerts.filter(
    (alert) => alert.risk_level === "High"
  ).length;

  const criticalCount = alerts.filter(
    (alert) => alert.risk_level === "Critical"
  ).length;

  const pendingCount = alerts.filter(
    (alert) => !doneAlerts.includes(alert.transaction_id)
  ).length;

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <div className="ml-64 min-h-screen">
        <Topbar />

        {/* Added top spacing so heading doesn't get cut */}
        <main className="px-6 pb-8 pt-23">
          {/* Header */}
          <div className="mb-7 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold leading-tight">
                Fraud Alerts
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Monitor high-risk and suspicious transactions
              </p>
            </div>

            <button
              onClick={loadAlerts}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Total Alerts
              </p>

              <p className="mt-2 text-3xl font-semibold">
                {alerts.length}
              </p>
            </div>

            <div className="rounded-xl border border-orange-500/20 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                High Risk
              </p>

              <p className="mt-2 text-3xl font-semibold text-orange-400">
                {highCount}
              </p>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Critical Risk
              </p>

              <p className="mt-2 text-3xl font-semibold text-red-400">
                {criticalCount}
              </p>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Pending
              </p>

              <p className="mt-2 text-3xl font-semibold text-yellow-400">
                {pendingCount}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                placeholder="Search transaction, sender, receiver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-500"
              />
            </div>

            <div className="flex gap-2">
              {["All", "High", "Critical"].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setRiskFilter(risk)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    riskFilter === risk
                      ? "bg-slate-700 text-white"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Alerts Table */}
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="border-b border-slate-800 bg-slate-950/50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Transaction
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Sender
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Risk Score
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Risk
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Detected
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Action
                    </th>

                    <th className="px-5 py-4"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Loading fraud alerts...
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        No fraud alerts found.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => {
                      const transaction =
                        details[alert.transaction_id];

                      const isCritical =
                        alert.risk_level === "Critical";

                      const isDone =
                        doneAlerts.includes(
                          alert.transaction_id
                        );

                      return (
                        <tr
                          key={alert.id}
                          onClick={() =>
                            navigate(
                              `/transactions/${alert.transaction_id}`
                            )
                          }
                          className={`cursor-pointer transition hover:bg-slate-800/50 ${
                            isDone ? "opacity-60" : ""
                          }`}
                        >
                          {/* Transaction */}
                          <td className="px-5 py-4">
                            <span className="font-mono text-sm text-slate-200">
                              {alert.transaction_id}
                            </span>
                          </td>

                          {/* Sender */}
                          <td className="px-5 py-4 text-sm text-slate-400">
                            {transaction?.sender_id ||
                              "Loading..."}
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 text-sm font-medium text-white">
                            {transaction?.amount !== undefined
                              ? `₹${Number(
                                  transaction.amount
                                ).toLocaleString("en-IN")}`
                              : "Loading..."}
                          </td>

                          {/* Score */}
                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold">
                              {alert.risk_score}
                            </span>
                          </td>

                          {/* Risk */}
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                isCritical
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-orange-500/10 text-orange-400"
                              }`}
                            >
                              {alert.risk_level}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                isDone
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-yellow-500/10 text-yellow-400"
                              }`}
                            >
                              {isDone ? "DONE" : "PENDING"}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-5 py-4 text-sm text-slate-400">
                            {formatDate(alert.created_at)}
                          </td>

                          {/* Action */}
                          <td
                            className="px-5 py-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                markAsDone(
                                  alert.transaction_id
                                )
                              }
                              disabled={isDone}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                                isDone
                                  ? "cursor-default bg-green-500/10 text-green-400"
                                  : "bg-slate-800 text-slate-300 hover:bg-green-500/10 hover:text-green-400"
                              }`}
                            >
                              <Check size={14} />

                              {isDone
                                ? "Done"
                                : "Mark Done"}
                            </button>
                          </td>

                          {/* Details arrow */}
                          <td className="px-5 py-4 text-right">
                            <ChevronRight
                              size={18}
                              className="text-slate-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FraudAlerts;