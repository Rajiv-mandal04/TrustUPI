import { useCallback, useEffect, useState } from "react";

import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  Wallet,
  Radio,
  RefreshCw,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import RiskOverview from "../components/RiskOverview";
import AlertTable from "../components/AlertTable";
import TransactionTable from "../components/TransactionTable";
import ActivityChart from "../components/ActivityChart";

import {
  getAnalytics,
  getAlerts,
  getTransactions,
  getActivity,
} from "../services/api";

import {
  createDashboardWebSocket,
} from "../services/websocket";

export default function Dashboard() {
  // =====================================================
  // DASHBOARD DATA
  // =====================================================

  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activity, setActivity] = useState([]);

  // =====================================================
  // UI STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // WEBSOCKET STATUS
  // =====================================================

  const [wsStatus, setWsStatus] = useState("connecting");
  const [lastUpdated, setLastUpdated] = useState(null);

  // =====================================================
  // SESSION-BASED HIDDEN ITEMS
  // =====================================================

  const getSessionIds = (key) => {
    try {
      const stored = sessionStorage.getItem(key);

      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(
        "Unable to read session storage:",
        error
      );

      return [];
    }
  };

  const [hiddenAlertIds, setHiddenAlertIds] = useState(() =>
    getSessionIds("trustupi_hidden_alerts")
  );

  const [
    hiddenTransactionIds,
    setHiddenTransactionIds,
  ] = useState(() =>
    getSessionIds("trustupi_hidden_transactions")
  );

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  const loadDashboard = useCallback(
    async (initialLoad = false) => {
      try {
        if (initialLoad) {
          setLoading(true);
        }

        const [
          analyticsData,
          alertsData,
          transactionsData,
          activityData,
        ] = await Promise.all([
          getAnalytics(),
          getAlerts(100),
          getTransactions(100),
          getActivity(),
        ]);

        // =================================================
        // ANALYTICS
        // =================================================

        setAnalytics(analyticsData);

        // =================================================
        // ALERTS
        // =================================================

        setAlerts(
          alertsData.alerts || []
        );

        // =================================================
        // TRANSACTIONS
        // =================================================

        setTransactions(
          transactionsData.data || []
        );

        // =================================================
        // ACTIVITY
        // =================================================

        setActivity(
          activityData.data || []
        );

        // =================================================
        // SUCCESSFUL SYNC
        // =================================================

        setLastUpdated(new Date());
        setError("");
      } catch (err) {
        console.error(
          "Dashboard API Error:",
          err
        );

        setError(
          "Unable to connect to TrustUPI API. Make sure FastAPI is running."
        );
      } finally {
        if (initialLoad) {
          setLoading(false);
        }
      }
    },
    []
  );

  // =====================================================
  // INITIAL REST LOAD
  // =====================================================

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  // =====================================================
  // FIXED 5 SECOND AUTO REFRESH
  //
  // This was already part of the dashboard behavior.
  // No Settings dependency.
  // =====================================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard(false);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [loadDashboard]);

  // =====================================================
  // REAL-TIME WEBSOCKET
  // =====================================================

  useEffect(() => {
    const websocket =
      createDashboardWebSocket({
        // =================================================
        // CONNECTION STATUS
        // =================================================

        onStatusChange: (status) => {
          setWsStatus(status);
        },

        // =================================================
        // REAL-TIME EVENT
        // =================================================

        onMessage: async (message) => {
          console.log(
            "TrustUPI dashboard event:",
            message
          );

          // =================================================
          // CONNECTION ESTABLISHED
          // =================================================

          if (
            message?.type ===
            "connection_established"
          ) {
            setWsStatus("connected");
            return;
          }

          // =================================================
          // NEW PREDICTION
          // =================================================

          if (
            message?.type !==
            "new_prediction"
          ) {
            return;
          }

          const transaction =
            message.data;

          if (!transaction) {
            console.warn(
              "TrustUPI: new_prediction received without data"
            );

            return;
          }

          console.log(
            "TrustUPI new prediction:",
            transaction
          );

          // =================================================
          // UPDATE LAST EVENT TIME
          // =================================================

          setLastUpdated(new Date());

          // =================================================
          // RISK CLASSIFICATION
          // =================================================

          const isFraudAlert =
            transaction.risk_level ===
              "High" ||
            transaction.risk_level ===
              "Critical";

          // =================================================
          // IMMEDIATE TRANSACTION UPDATE
          // =================================================

          if (!isFraudAlert) {
            const newTransaction = {
              transaction_id:
                transaction.transaction_id,

              sender_id:
                transaction.sender_id,

              receiver_id:
                transaction.receiver_id,

              amount:
                transaction.amount,

              timestamp:
                transaction.timestamp,

              risk_score:
                transaction.risk_score,

              risk_level:
                transaction.risk_level,

              fraud_prediction:
                transaction.fraud_prediction,

              source: "live",
            };

            setTransactions(
              (previous) => {
                const exists =
                  previous.some(
                    (item) =>
                      item.transaction_id ===
                      newTransaction.transaction_id
                  );

                // UPDATE EXISTING

                if (exists) {
                  return previous.map(
                    (item) =>
                      item.transaction_id ===
                      newTransaction.transaction_id
                        ? {
                            ...item,
                            ...newTransaction,
                          }
                        : item
                  );
                }

                // ADD NEW

                return [
                  newTransaction,
                  ...previous,
                ];
              }
            );
          }

          // =================================================
          // EVENT-DRIVEN SERVER SYNCHRONIZATION
          // =================================================

          try {
            const [
              analyticsData,
              alertsData,
              transactionsData,
              activityData,
            ] = await Promise.all([
              getAnalytics(),
              getAlerts(100),
              getTransactions(100),
              getActivity(),
            ]);

            // =================================================
            // ANALYTICS
            // =================================================

            setAnalytics(
              analyticsData
            );

            // =================================================
            // ALERTS
            // =================================================

            setAlerts(
              alertsData.alerts || []
            );

            // =================================================
            // TRANSACTIONS
            // =================================================

            setTransactions(
              transactionsData.data || []
            );

            // =================================================
            // ACTIVITY
            // =================================================

            setActivity(
              activityData.data || []
            );

            // =================================================
            // SUCCESSFUL REAL-TIME SYNC
            // =================================================

            setLastUpdated(
              new Date()
            );

            setError("");

            console.log(
              "TrustUPI dashboard synchronized successfully"
            );
          } catch (error) {
            console.error(
              "Unable to synchronize dashboard after WebSocket event:",
              error
            );
          }
        },
      });

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      websocket.close();
    };
  }, []);

  // =====================================================
  // UI ONLY - HIDE ALERT
  // =====================================================

  const hideAlert = (transactionId) => {
    setHiddenAlertIds((previous) => {
      if (
        previous.includes(
          transactionId
        )
      ) {
        return previous;
      }

      const updated = [
        ...previous,
        transactionId,
      ];

      sessionStorage.setItem(
        "trustupi_hidden_alerts",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  // =====================================================
  // UI ONLY - HIDE TRANSACTION
  // =====================================================

  const hideTransaction = (transactionId) => {
    setHiddenTransactionIds(
      (previous) => {
        if (
          previous.includes(
            transactionId
          )
        ) {
          return previous;
        }

        const updated = [
          ...previous,
          transactionId,
        ];

        sessionStorage.setItem(
          "trustupi_hidden_transactions",
          JSON.stringify(updated)
        );

        return updated;
      }
    );
  };

  // =====================================================
  // VISIBLE ALERTS
  // =====================================================

  const visibleAlerts =
    alerts.filter(
      (alert) =>
        !hiddenAlertIds.includes(
          alert.transaction_id
        )
    );

  // =====================================================
  // VISIBLE TRANSACTIONS
  // =====================================================

  const visibleTransactions =
    transactions.filter(
      (transaction) => {
        const isHighRisk =
          transaction.risk_level ===
            "High" ||
          transaction.risk_level ===
            "Critical";

        if (isHighRisk) {
          return false;
        }

        return !hiddenTransactionIds.includes(
          transaction.transaction_id
        );
      }
    );

  // =====================================================
  // WEBSOCKET STATUS UI
  // =====================================================

  const websocketStatus = {
    connected: {
      label: "Connected",
      textClass:
        "text-emerald-400",
      dotClass:
        "bg-emerald-400",
      ping: true,
    },

    connecting: {
      label: "Connecting...",
      textClass:
        "text-yellow-400",
      dotClass:
        "bg-yellow-400",
      ping: true,
    },

    reconnecting: {
      label: "Reconnecting...",
      textClass:
        "text-yellow-400",
      dotClass:
        "bg-yellow-400",
      ping: true,
    },

    disconnected: {
      label: "Disconnected",
      textClass:
        "text-red-400",
      dotClass:
        "bg-red-400",
      ping: false,
    },
  };

  const currentWsStatus =
    websocketStatus[
      wsStatus
    ] ||
    websocketStatus.connecting;

  // =====================================================
  // LAST UPDATED
  // =====================================================

  const lastUpdatedText =
    lastUpdated
      ? `Updated ${lastUpdated.toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        )}`
      : "Waiting for connection...";

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-zinc-950">

      <Sidebar />

      <Topbar />

      <main className="ml-64 pt-17">

        <div className="p-8">

          {/* HEADER */}

          <div className="mb-8 flex items-end justify-between">

            <div>

              <p className="mb-2 text-sm font-medium text-cyan-400">
                AI-POWERED FRAUD MONITORING
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-white">
                TrustUPI Security Overview
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                Monitor transaction activity, detect anomalies,
                and manage fraud alerts in real time.
              </p>

            </div>

            {/* WEBSOCKET STATUS */}

            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5">

                <span className="relative flex h-2.5 w-2.5">

                  {currentWsStatus.ping && (
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full ${currentWsStatus.dotClass} opacity-60`}
                    />
                  )}

                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${currentWsStatus.dotClass}`}
                  />

                </span>

                <div className="flex flex-col">

                  <span
                    className={`text-xs font-medium ${currentWsStatus.textClass}`}
                  >
                    {currentWsStatus.label}
                  </span>

                  <span className="text-[10px] text-zinc-500">
                    {lastUpdatedText}
                  </span>

                </div>

                <Radio
                  className={`ml-1 h-4 w-4 ${currentWsStatus.textClass}`}
                />

              </div>

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* INITIAL LOADING */}

          {loading && !analytics ? (

            <div className="flex min-h-[400px] items-center justify-center">

              <div className="text-center">

                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-cyan-400" />

                <p className="mt-4 text-sm text-zinc-500">
                  Loading TrustUPI data...
                </p>

              </div>

            </div>

          ) : (

            <>

              {/* STATS */}

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard
                  title="Total Transactions"
                  value={
                    analytics?.total_transactions?.toLocaleString() ??
                    "0"
                  }
                  description="Transactions monitored"
                  icon={Activity}
                />

                <StatCard
                  title="Fraudulent Transactions"
                  value={
                    analytics?.fraudulent_transactions?.toLocaleString() ??
                    "0"
                  }
                  description={
                    analytics?.total_transactions
                      ? `${
                          (
                            (
                              analytics.fraudulent_transactions /
                              analytics.total_transactions
                            ) * 100
                          ).toFixed(2)
                        }% of total transactions`
                      : "0% of total transactions"
                  }
                  icon={ShieldAlert}
                  iconClass="text-red-400"
                />

                <StatCard
                  title="High Risk"
                  value={
                    analytics?.high_risk?.toLocaleString() ??
                    "0"
                  }
                  description="Transactions requiring attention"
                  icon={AlertTriangle}
                  iconClass="text-orange-400"
                />

                <StatCard
                  title="Average Risk Score"
                  value={
                    analytics?.average_risk_score ??
                    "0"
                  }
                  description="Overall transaction risk"
                  icon={Wallet}
                  iconClass="text-emerald-400"
                />

              </div>

              {/* RISK + ACTIVITY */}

              <div className="mt-6 grid gap-6 xl:grid-cols-5">

                {/* RISK */}

                <div className="xl:col-span-2">

                  <RiskOverview
                    analytics={analytics}
                  />

                </div>

                {/* ACTIVITY */}

                <div className="xl:col-span-3">

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">

                    <div className="flex items-center justify-between">

                      <div>

                        <h3 className="font-semibold text-white">
                          Transaction Activity
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          Transaction volume over time
                        </p>

                      </div>

                      <div className="flex items-center gap-2">

                        <span className="h-2 w-2 rounded-full bg-cyan-400" />

                        <span className="text-xs text-zinc-500">
                          Live monitoring
                        </span>

                      </div>

                    </div>

                    <ActivityChart
                      data={activity}
                    />

                  </div>

                </div>

              </div>

              {/* FRAUD ALERTS */}

              <div className="mt-6">

                <AlertTable
                  alerts={visibleAlerts}
                  onDelete={hideAlert}
                />

              </div>

              {/* TRANSACTIONS */}

              <div className="mt-6">

                <TransactionTable
                  transactions={
                    visibleTransactions
                  }
                  onDelete={
                    hideTransaction
                  }
                />

              </div>

              {/* FOOTER */}

              <footer className="mt-8 border-t border-zinc-800 py-6 text-center">

                <p className="text-xs text-zinc-600">
                  TrustUPI — AI-powered fraud detection for UPI transactions
                </p>

              </footer>

            </>

          )}

        </div>

      </main>

    </div>
  );
}