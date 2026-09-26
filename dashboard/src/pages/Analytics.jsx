import { useEffect, useMemo, useState } from "react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import {
  Activity,
  AlertTriangle,
  IndianRupee,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  Clock3,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import {
  getAnalytics,
  getActivity,
  getTransactions,
  getAlerts,
} from "../services/api";


const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;


export default function Analytics() {

  const [analytics, setAnalytics] = useState({});
  const [activity, setActivity] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // ==================================================
  // LOAD DATA
  // ==================================================

  const loadAnalytics = async () => {

    try {

      setLoading(true);
      setError("");

      const [
        analyticsResult,
        activityResult,
        transactionsResult,
        alertsResult,
      ] = await Promise.all([
        getAnalytics().catch((error) => {
          console.error("Analytics API error:", error);
          return {};
        }),

        getActivity().catch((error) => {
          console.error("Activity API error:", error);
          return {};
        }),

        getTransactions(100).catch((error) => {
          console.error("Transactions API error:", error);
          return {};
        }),

        getAlerts(100).catch((error) => {
          console.error("Alerts API error:", error);
          return {};
        }),
      ]);


      setAnalytics(
        analyticsResult || {}
      );


      setActivity(
        Array.isArray(activityResult)
          ? activityResult
          : activityResult?.data ||
            activityResult?.activity ||
            []
      );


      setTransactions(
        Array.isArray(transactionsResult)
          ? transactionsResult
          : transactionsResult?.data ||
            transactionsResult?.transactions ||
            []
      );


      setAlerts(
        Array.isArray(alertsResult)
          ? alertsResult
          : alertsResult?.alerts ||
            alertsResult?.data ||
            []
      );


    } catch (err) {

      console.error(
        "Analytics loading error:",
        err
      );

      setError(
        "Unable to load analytics data."
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadAnalytics();

  }, []);


  // ==================================================
  // NORMALIZE TRANSACTIONS
  // ==================================================

  const normalizedTransactions = useMemo(() => {

    if (!Array.isArray(transactions)) {
      return [];
    }

    return transactions.map((item) => {

      const risk =
        item.prediction_risk_level ||
        item.risk_level ||
        item.risk ||
        "Low";


      const amount = Number(
        item.amount ??
        item.transaction_amount ??
        item.value ??
        0
      );


      const timestamp =
        item.timestamp ||
        item.created_at ||
        item.time ||
        null;


      /*
       * IMPORTANT:
       *
       * Fraud and risk are two different things.
       *
       * fraud_prediction = 1
       *     => Fraud
       *
       * risk_level = High/Critical
       *     => High/Critical risk
       *
       * High/Critical must NOT automatically become fraud.
       */

      const fraud =
        Number(item.fraud_prediction) === 1;


      return {
        ...item,
        risk,
        amount,
        timestamp,
        fraud,
      };

    });

  }, [transactions]);


  // ==================================================
  // SUMMARY METRICS
  // ==================================================

  const totalTransactions =
    Number(
      analytics?.total_transactions ??
      analytics?.transactions ??
      analytics?.total ??
      normalizedTransactions.length
    );


  const fraudTransactions =
    Number(
      analytics?.fraud_transactions ??
      analytics?.fraudulent_transactions ??
      analytics?.fraud ??
      analytics?.fraud_count ??
      normalizedTransactions.filter(
        (item) => item.fraud
      ).length
    );


  // ==================================================
  // AVERAGE TRANSACTION AMOUNT
  // ==================================================

  const averageAmount = useMemo(() => {

    const backendValue =
      analytics?.average_transaction_amount ??
      analytics?.avg_transaction_amount ??
      analytics?.average_amount ??
      analytics?.avg_amount;


    if (
      backendValue !== undefined &&
      backendValue !== null
    ) {

      return Number(backendValue);

    }


    if (!normalizedTransactions.length) {
      return 0;
    }


    const total =
      normalizedTransactions.reduce(
        (sum, item) =>
          sum + item.amount,
        0
      );


    return (
      total /
      normalizedTransactions.length
    );

  }, [
    analytics,
    normalizedTransactions,
  ]);


  // ==================================================
  // FRAUD RATE
  // ==================================================

  const fraudRate = useMemo(() => {

    const backendValue =
      analytics?.fraud_rate;


    if (
      backendValue !== undefined &&
      backendValue !== null
    ) {

      return Number(
        backendValue
      );

    }


    if (!totalTransactions) {
      return 0;
    }


    return (
      (fraudTransactions /
        totalTransactions) *
      100
    );

  }, [
    analytics,
    totalTransactions,
    fraudTransactions,
  ]);


  // ==================================================
  // RISK DISTRIBUTION
  // ==================================================

  const riskData = useMemo(() => {

    const counts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };


    normalizedTransactions.forEach(
      (transaction) => {

        const risk =
          transaction.risk;


        if (
          counts[risk] !== undefined
        ) {

          counts[risk]++;

        }

      }
    );


    /*
     * If transaction data is unavailable,
     * use alerts for High/Critical.
     */

    if (
      normalizedTransactions.length === 0 &&
      Array.isArray(alerts)
    ) {

      alerts.forEach((alert) => {

        const risk =
          alert.risk_level;


        if (
          counts[risk] !== undefined
        ) {

          counts[risk]++;

        }

      });

    }


    return [
      {
        risk: "Low",
        count: counts.Low,
      },
      {
        risk: "Medium",
        count: counts.Medium,
      },
      {
        risk: "High",
        count: counts.High,
      },
      {
        risk: "Critical",
        count: counts.Critical,
      },
    ];

  }, [
    normalizedTransactions,
    alerts,
  ]);


  // ==================================================
  // HOURLY PATTERN
  // ==================================================

  const hourlyData = useMemo(() => {

    const hours = Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        transactions: 0,
        fraud: 0,
      })
    );


    normalizedTransactions.forEach(
      (transaction) => {

        if (
          !transaction.timestamp
        ) {

          return;

        }


        const date =
          new Date(
            transaction.timestamp
          );


        if (
          Number.isNaN(
            date.getTime()
          )
        ) {

          return;

        }


        const hour =
          date.getHours();


        hours[hour].transactions++;


        /*
         * Fraud count is based ONLY
         * on fraud_prediction.
         */

        if (
          transaction.fraud
        ) {

          hours[hour].fraud++;

        }

      }
    );


    return hours.map((item) => ({

      hour:
        `${String(
          item.hour
        ).padStart(
          2,
          "0"
        )}:00`,

      transactions:
        item.transactions,

      fraud:
        item.fraud,

    }));

  }, [
    normalizedTransactions,
  ]);


  // ==================================================
  // DAILY TREND
  // ==================================================

  const dailyData = useMemo(() => {

    const map = {};


    normalizedTransactions.forEach(
      (transaction) => {

        if (
          !transaction.timestamp
        ) {

          return;

        }


        const date =
          new Date(
            transaction.timestamp
          );


        if (
          Number.isNaN(
            date.getTime()
          )
        ) {

          return;

        }


        const key =
          date.toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
            }
          );


        if (!map[key]) {

          map[key] = {
            date: key,
            transactions: 0,
            fraud: 0,
            amount: 0,
          };

        }


        map[key].transactions++;


        map[key].amount +=
          transaction.amount;


        /*
         * Again:
         * High/Critical risk is NOT fraud.
         */

        if (
          transaction.fraud
        ) {

          map[key].fraud++;

        }

      }
    );


    return Object.values(
      map
    ).slice(-14);

  }, [
    normalizedTransactions,
  ]);


  // ==================================================
  // AMOUNT RANGE
  // ==================================================

  const amountData = useMemo(() => {

    const buckets = [

      {
        range: "₹0–1K",
        min: 0,
        max: 1000,
        count: 0,
        fraud: 0,
      },

      {
        range: "₹1K–5K",
        min: 1000,
        max: 5000,
        count: 0,
        fraud: 0,
      },

      {
        range: "₹5K–10K",
        min: 5000,
        max: 10000,
        count: 0,
        fraud: 0,
      },

      {
        range: "₹10K–25K",
        min: 10000,
        max: 25000,
        count: 0,
        fraud: 0,
      },

      {
        range: "₹25K+",
        min: 25000,
        max: Infinity,
        count: 0,
        fraud: 0,
      },

    ];


    normalizedTransactions.forEach(
      (transaction) => {

        const bucket =
          buckets.find(
            (item) =>
              transaction.amount >=
                item.min &&
              transaction.amount <
                item.max
          );


        if (!bucket) {
          return;
        }


        bucket.count++;


        if (
          transaction.fraud
        ) {

          bucket.fraud++;

        }

      }
    );


    return buckets.map(
      ({
        range,
        count,
        fraud,
      }) => ({

        range,

        transactions:
          count,

        fraud,

      })
    );

  }, [
    normalizedTransactions,
  ]);


  // ==================================================
  // ACTIVITY DATA
  // ==================================================

  const activityData = useMemo(() => {

    if (
      !Array.isArray(activity)
    ) {

      return [];

    }


    return activity.map(
      (item) => ({

        time: item.time
          ? new Date(
              item.time
            ).toLocaleString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }
            )
          : "",


        transactions:
          Number(
            item.transactions ||
            0
          ),


        fraud:
          Number(
            item.fraud ||
            0
          ),

      })
    );

  }, [
    activity,
  ]);


  // ==================================================
  // RENDER
  // ==================================================

  return (

    <div className="min-h-screen bg-zinc-950 text-white">

      <Sidebar />

      <main className="ml-64">

        <Topbar />


        <div className="px-6 pb-8 pt-23">


          {/* ================================================== */}
          {/* HEADER */}
          {/* ================================================== */}

          <div className="mb-8 flex items-start justify-between">

            <div>

              <h1 className="text-2xl font-bold text-white">
                Analytics
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Historical transaction and fraud analysis
              </p>

            </div>


            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >

              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh

            </button>

          </div>


          {/* ================================================== */}
          {/* ERROR */}
          {/* ================================================== */}

          {error && (

            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">

              {error}

            </div>

          )}


          {/* ================================================== */}
          {/* KPI CARDS */}
          {/* ================================================== */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">


            {/* TOTAL TRANSACTIONS */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm text-zinc-500">
                    Total Transactions
                  </p>

                  <p className="mt-2 text-2xl font-bold">

                    {loading
                      ? "..."
                      : formatNumber(
                          totalTransactions
                        )}

                  </p>

                </div>


                <div className="rounded-xl bg-cyan-400/10 p-3">

                  <Activity className="h-5 w-5 text-cyan-400" />

                </div>

              </div>

            </div>


            {/* FRAUD RATE */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm text-zinc-500">
                    Fraud Rate
                  </p>

                  <p className="mt-2 text-2xl font-bold">

                    {loading
                      ? "..."
                      : `${fraudRate.toFixed(
                          2
                        )}%`}

                  </p>

                </div>


                <div className="rounded-xl bg-red-500/10 p-3">

                  <ShieldAlert className="h-5 w-5 text-red-400" />

                </div>

              </div>

            </div>


            {/* FRAUD TRANSACTIONS */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm text-zinc-500">
                    Fraud Transactions
                  </p>

                  <p className="mt-2 text-2xl font-bold">

                    {loading
                      ? "..."
                      : formatNumber(
                          fraudTransactions
                        )}

                  </p>

                </div>


                <div className="rounded-xl bg-orange-500/10 p-3">

                  <AlertTriangle className="h-5 w-5 text-orange-400" />

                </div>

              </div>

            </div>


            {/* AVERAGE TRANSACTION */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm text-zinc-500">
                    Avg Transaction
                  </p>

                  <p className="mt-2 text-2xl font-bold">

                    {loading
                      ? "..."
                      : formatCurrency(
                          averageAmount
                        )}

                  </p>

                </div>


                <div className="rounded-xl bg-emerald-500/10 p-3">

                  <IndianRupee className="h-5 w-5 text-emerald-400" />

                </div>

              </div>

            </div>

          </div>


          {/* ================================================== */}
          {/* TRANSACTION + FRAUD TREND */}
          {/* ================================================== */}

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">

            <div className="mb-5">

              <div className="flex items-center gap-2">

                <TrendingUp className="h-5 w-5 text-cyan-400" />

                <h2 className="text-lg font-semibold">
                  Transaction & Fraud Trend
                </h2>

              </div>

              <p className="mt-1 text-xs text-zinc-500">
                Historical transaction volume and detected fraud
              </p>

            </div>


            <div className="h-[330px]">

              {dailyData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <AreaChart
                    data={dailyData}
                  >

                    <defs>

                      <linearGradient
                        id="transactionFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="0%"
                          stopColor="#22d3ee"
                          stopOpacity={0.28}
                        />

                        <stop
                          offset="100%"
                          stopColor="#22d3ee"
                          stopOpacity={0}
                        />

                      </linearGradient>

                    </defs>


                    <CartesianGrid
                      stroke="#27272a"
                      strokeDasharray="3 3"
                    />


                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      tickLine={false}
                      axisLine={false}
                    />


                    <YAxis
                      stroke="#71717a"
                      tickLine={false}
                      axisLine={false}
                    />


                    <Tooltip
                      contentStyle={{
                        backgroundColor:
                          "#18181b",
                        border:
                          "1px solid #3f3f46",
                        borderRadius:
                          "12px",
                      }}
                    />


                    <Legend />


                    <Area
                      type="monotone"
                      dataKey="transactions"
                      name="Transactions"
                      stroke="#22d3ee"
                      fill="url(#transactionFill)"
                      strokeWidth={2}
                    />


                    <Area
                      type="monotone"
                      dataKey="fraud"
                      name="Fraud"
                      stroke="#ef4444"
                      fill="none"
                      strokeWidth={2}
                    />

                  </AreaChart>

                </ResponsiveContainer>

              ) : (

                <EmptyState
                  icon={
                    <Activity className="h-6 w-6" />
                  }
                  text="Waiting for transaction history"
                />

              )}

            </div>

          </div>


          {/* ================================================== */}
          {/* RISK DISTRIBUTION + HOURLY PATTERN */}
          {/* ================================================== */}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">


            {/* RISK DISTRIBUTION */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">

              <div className="mb-5">

                <h2 className="text-lg font-semibold">
                  Risk Distribution
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Transactions grouped by detected risk level
                </p>

              </div>


              <div className="h-[320px]">

                {riskData.some(
                  (item) =>
                    item.count > 0
                ) ? (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <BarChart
                      data={riskData}
                      layout="vertical"
                      margin={{
                        left: 20,
                        right: 20,
                      }}
                    >

                      <CartesianGrid
                        stroke="#27272a"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        type="number"
                        stroke="#71717a"
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        dataKey="risk"
                        type="category"
                        stroke="#a1a1aa"
                        tickLine={false}
                        axisLine={false}
                        width={70}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor:
                            "#18181b",
                          border:
                            "1px solid #3f3f46",
                          borderRadius:
                            "12px",
                        }}
                      />

                      <Bar
                        dataKey="count"
                        name="Transactions"
                        radius={[
                          0,
                          8,
                          8,
                          0,
                        ]}
                        fill="#22d3ee"
                      />

                    </BarChart>

                  </ResponsiveContainer>

                ) : (

                  <EmptyState
                    icon={
                      <ShieldAlert className="h-6 w-6" />
                    }
                    text="Risk data will appear after transactions are available"
                  />

                )}

              </div>

            </div>


            {/* HOURLY PATTERN */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">

              <div className="mb-5">

                <div className="flex items-center gap-2">

                  <Clock3 className="h-5 w-5 text-cyan-400" />

                  <h2 className="text-lg font-semibold">
                    Time-Based Pattern
                  </h2>

                </div>

                <p className="mt-1 text-xs text-zinc-500">
                  Transaction activity by hour of day
                </p>

              </div>


              <div className="h-[320px]">

                {hourlyData.some(
                  (item) =>
                    item.transactions > 0
                ) ? (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <BarChart
                      data={hourlyData}
                    >

                      <CartesianGrid
                        stroke="#27272a"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="hour"
                        stroke="#71717a"
                        tickLine={false}
                        axisLine={false}
                        interval={2}
                      />

                      <YAxis
                        stroke="#71717a"
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor:
                            "#18181b",
                          border:
                            "1px solid #3f3f46",
                          borderRadius:
                            "12px",
                        }}
                      />

                      <Legend />

                      <Bar
                        dataKey="transactions"
                        name="Transactions"
                        fill="#22d3ee"
                        radius={[
                          6,
                          6,
                          0,
                          0,
                        ]}
                      />

                      <Bar
                        dataKey="fraud"
                        name="Fraud"
                        fill="#ef4444"
                        radius={[
                          6,
                          6,
                          0,
                          0,
                        ]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                ) : (

                  <EmptyState
                    icon={
                      <Clock3 className="h-6 w-6" />
                    }
                    text="Time pattern will appear after timestamped transactions are available"
                  />

                )}

              </div>

            </div>

          </div>


          {/* ================================================== */}
          {/* AMOUNT PATTERN */}
          {/* ================================================== */}

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">

            <div className="mb-5">

              <h2 className="text-lg font-semibold">
                Transaction Amount Pattern
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Transaction volume and fraud across amount ranges
              </p>

            </div>


            <div className="h-[320px]">

              {amountData.some(
                (item) =>
                  item.transactions > 0
              ) ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={amountData}
                  >

                    <CartesianGrid
                      stroke="#27272a"
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="range"
                      stroke="#71717a"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      stroke="#71717a"
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor:
                          "#18181b",
                        border:
                          "1px solid #3f3f46",
                        borderRadius:
                          "12px",
                      }}
                    />

                    <Legend />

                    <Bar
                      dataKey="transactions"
                      name="Transactions"
                      fill="#22d3ee"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                    <Bar
                      dataKey="fraud"
                      name="Fraud"
                      fill="#f97316"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              ) : (

                <EmptyState
                  icon={
                    <IndianRupee className="h-6 w-6" />
                  }
                  text="Amount analysis will appear after transaction amounts are available"
                />

              )}

            </div>

          </div>


          {/* ================================================== */}
          {/* ACTIVITY API FALLBACK */}
          {/* ================================================== */}

          {activityData.length > 0 && (

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">

              <div className="mb-5">

                <h2 className="text-lg font-semibold">
                  Live Activity History
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Activity records returned by the analytics service
                </p>

              </div>


              <div className="h-[280px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={activityData}
                  >

                    <CartesianGrid
                      stroke="#27272a"
                      strokeDasharray="3 3"
                    />


                    <XAxis
                      dataKey="time"
                      stroke="#71717a"
                      tickLine={false}
                      axisLine={false}
                    />


                    <YAxis
                      stroke="#71717a"
                      tickLine={false}
                      axisLine={false}
                    />


                    <Tooltip
                      contentStyle={{
                        backgroundColor:
                          "#18181b",
                        border:
                          "1px solid #3f3f46",
                        borderRadius:
                          "12px",
                      }}
                    />


                    <Legend />


                    <Line
                      type="monotone"
                      dataKey="transactions"
                      name="Transactions"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={false}
                    />


                    <Line
                      type="monotone"
                      dataKey="fraud"
                      name="Fraud"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            </div>

          )}

        </div>

      </main>

    </div>

  );

}


// ==================================================
// EMPTY STATE
// ==================================================

function EmptyState({
  icon,
  text,
}) {

  return (

    <div className="flex h-full flex-col items-center justify-center">

      <div className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-600">

        {icon}

      </div>

      <p className="text-center text-sm text-zinc-600">

        {text}

      </p>

    </div>

  );

}