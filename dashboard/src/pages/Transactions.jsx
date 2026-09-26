import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ArrowUpDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import {
  getTransactions,
  getAlerts,
  getTransaction,
} from "../services/api";

import {
  createDashboardWebSocket,
} from "../services/websocket";


export default function Transactions() {

  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);

  const [search, setSearch] = useState("");

  const [riskFilter, setRiskFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sortOrder, setSortOrder] =
    useState("newest");

  const [wsStatus, setWsStatus] =
    useState("connecting");


  // ============================================================
  // HELPER: fetch missing sender / receiver / amount / timestamp
  // Alerts endpoint does not return these fields, so we fill them
  // from getTransaction(id).
  // ============================================================

  const fillMissingDetails = async (items) => {

    const incomplete = items.filter(
      (item) =>
        !item.sender_id ||
        !item.receiver_id ||
        !item.amount ||
        !item.timestamp
    );

    if (incomplete.length === 0) {
      return items;
    }

    const results = await Promise.allSettled(
      incomplete.map((item) =>
        getTransaction(item.transaction_id)
      )
    );

    const detailsById = new Map();

    results.forEach((result, index) => {

      if (result.status !== "fulfilled") {
        return;
      }

      const response = result.value;

      // Handles { data: {...} }, { transaction: {...} } or plain object
      const detail =
        response?.data ||
        response?.transaction ||
        response ||
        {};

      detailsById.set(
        incomplete[index].transaction_id,
        detail
      );

    });

    return items.map((item) => {

      const detail =
        detailsById.get(item.transaction_id);

      if (!detail) {
        return item;
      }

      return {
        ...item,
        sender_id:
          item.sender_id || detail.sender_id,
        receiver_id:
          item.receiver_id || detail.receiver_id,
        amount:
          item.amount || detail.amount,
        timestamp:
          item.timestamp || detail.timestamp,
      };

    });

  };


  // ============================================================
  // LOAD TRANSACTIONS + ALERTS (merged, no duplicates)
  // ============================================================

  const loadTransactions = async () => {

    try {

      setLoading(true);
      setError("");

      const [transactionsData, alertsData] =
        await Promise.all([
          getTransactions(100),
          getAlerts(100),
        ]);

      // Merge by transaction_id so nothing appears twice
      const merged = new Map();

      (transactionsData?.data || []).forEach(
        (item) => {
          merged.set(item.transaction_id, item);
        }
      );

      (alertsData?.alerts || []).forEach(
        (item) => {
          merged.set(item.transaction_id, {
            ...merged.get(item.transaction_id),
            ...item,
          });
        }
      );

      const completed =
        await fillMissingDetails(
          Array.from(merged.values())
        );

      setTransactions(completed);

    } catch (err) {

      console.error(
        "Transactions API Error:",
        err
      );

      setError(
        "Unable to load transactions."
      );

    } finally {

      setLoading(false);

    }
  };


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {

    loadTransactions();

  }, []);


  // ============================================================
  // REAL-TIME WEBSOCKET
  // Backend sends: { type: "new_prediction", data: {...} }
  // ============================================================

  useEffect(() => {

    const websocket =
      createDashboardWebSocket({

        onStatusChange: (status) => {

          setWsStatus(status);

        },

        onMessage: (message) => {

          if (
            message?.type ===
            "connection_established"
          ) {
            setWsStatus("connected");
            return;
          }

          if (
            message?.type !==
            "new_prediction"
          ) {
            return;
          }


          const transaction =
            message.data;

          if (!transaction) {
            return;
          }


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


              return [
                newTransaction,
                ...previous,
              ];

            }
          );

        },

      });


    return () => {

      websocket.close();

    };

  }, []);


  // ============================================================
  // SEARCH + FILTER + SORT
  // ============================================================

  const filteredTransactions =
    useMemo(() => {

      let result = [
        ...transactions,
      ];


      // --------------------------------------------------------
      // SEARCH
      // --------------------------------------------------------

      const searchValue =
        search
          .trim()
          .toLowerCase();


      if (searchValue) {

        result =
          result.filter(
            (transaction) => {

              return (

                String(
                  transaction.transaction_id ||
                  ""
                )
                  .toLowerCase()
                  .includes(searchValue)

                ||

                String(
                  transaction.sender_id ||
                  ""
                )
                  .toLowerCase()
                  .includes(searchValue)

                ||

                String(
                  transaction.receiver_id ||
                  ""
                )
                  .toLowerCase()
                  .includes(searchValue)

              );

            }
          );

      }


      // --------------------------------------------------------
      // RISK FILTER
      // --------------------------------------------------------

      if (riskFilter !== "All") {

        result =
          result.filter(
            (transaction) =>
              transaction.risk_level ===
              riskFilter
          );

      }


      // --------------------------------------------------------
      // SORT
      // --------------------------------------------------------

      result.sort(
        (a, b) => {

          const dateA =
            new Date(
              a.timestamp
            ).getTime() || 0;

          const dateB =
            new Date(
              b.timestamp
            ).getTime() || 0;


          return sortOrder === "newest"
            ? dateB - dateA
            : dateA - dateB;

        }
      );


      return result;

    }, [
      transactions,
      search,
      riskFilter,
      sortOrder,
    ]);


  // ============================================================
  // RISK STYLE
  // ============================================================

  const getRiskStyle = (
    level
  ) => {

    if (level === "Critical") {

      return "bg-red-500/10 text-red-400";

    }

    if (level === "High") {

      return "bg-orange-500/10 text-orange-400";

    }

    if (level === "Medium") {

      return "bg-yellow-500/10 text-yellow-400";

    }

    return "bg-emerald-500/10 text-emerald-400";

  };


  // ============================================================
  // WEBSOCKET STATUS
  // ============================================================

  const websocketStatus = {

    connected: {
      label: "Connected",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },

    connecting: {
      label: "Connecting...",
      text: "text-yellow-400",
      dot: "bg-yellow-400",
    },

    reconnecting: {
      label: "Reconnecting...",
      text: "text-yellow-400",
      dot: "bg-yellow-400",
    },

    disconnected: {
      label: "Disconnected",
      text: "text-red-400",
      dot: "bg-red-400",
    },

  };


  const currentStatus =
    websocketStatus[
      wsStatus
    ] ||
    websocketStatus.connecting;


  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="min-h-screen bg-zinc-950 text-white">

      <Sidebar />

      <main className="ml-64">

        <Topbar />


        {/* pt-28 keeps content below the fixed Topbar */}
        <div className="p-8 pt-23">

          {/* ================================================== */}
          {/* HEADER */}
          {/* ================================================== */}

          <div className="mb-8 flex items-center justify-between">

            <div>

              <p className="text-xs font-medium uppercase tracking-wider text-cyan-400">
                Transaction Monitoring
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Transactions
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                Search, filter and inspect monitored UPI transactions.
              </p>

            </div>


            {/* WebSocket Status */}

            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5">

              <span
                className={`h-2.5 w-2.5 rounded-full ${currentStatus.dot}`}
              />

              <span
                className={`text-xs font-medium ${currentStatus.text}`}
              >
                {currentStatus.label}
              </span>

            </div>

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
          {/* FILTER BAR */}
          {/* ================================================== */}

          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">

            <div className="flex flex-col gap-3 lg:flex-row">

              {/* Search */}

              <div className="relative flex-1">

                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search transaction ID, sender or receiver..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500/50"
                />

              </div>


              {/* Risk Filter */}

              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500/50"
              >

                <option value="All">
                  All Risk Levels
                </option>

                <option value="Low">
                  Low
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="High">
                  High
                </option>

                <option value="Critical">
                  Critical
                </option>

              </select>


              {/* Sort */}

              <button
                onClick={() =>
                  setSortOrder(
                    (previous) =>
                      previous === "newest"
                        ? "oldest"
                        : "newest"
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >

                <ArrowUpDown
                  size={16}
                />

                {sortOrder === "newest"
                  ? "Newest"
                  : "Oldest"}

              </button>


              {/* Reload */}

              <button
                onClick={loadTransactions}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >

                <RefreshCw
                  size={16}
                />

                Refresh

              </button>

            </div>

          </div>


          {/* ================================================== */}
          {/* RESULTS INFO */}
          {/* ================================================== */}

          <div className="mb-4 flex items-center justify-between">

            <p className="text-sm text-zinc-500">

              Showing{" "}

              <span className="font-medium text-zinc-300">
                {filteredTransactions.length}
              </span>

              {" "}of{" "}

              <span className="font-medium text-zinc-300">
                {transactions.length}
              </span>

              {" "}transactions

            </p>

            <p className="text-xs text-zinc-600">
              Live monitored data
            </p>

          </div>


          {/* ================================================== */}
          {/* TABLE */}
          {/* ================================================== */}

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">

            {loading ? (

              <div className="flex min-h-[400px] items-center justify-center">

                <div className="text-center">

                  <RefreshCw
                    className="mx-auto animate-spin text-cyan-400"
                    size={30}
                  />

                  <p className="mt-4 text-sm text-zinc-500">
                    Loading transactions...
                  </p>

                </div>

              </div>

            ) : filteredTransactions.length === 0 ? (

              <div className="flex min-h-[350px] items-center justify-center">

                <div className="text-center">

                  <Search
                    className="mx-auto text-zinc-700"
                    size={34}
                  />

                  <p className="mt-4 text-sm text-zinc-400">
                    No transactions found.
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    Try changing your search or risk filter.
                  </p>

                </div>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead className="border-b border-zinc-800 text-xs text-zinc-500">

                    <tr>

                      <th className="px-5 py-4 font-medium">
                        Transaction ID
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Sender
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Receiver
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Amount
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Risk Score
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Level
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Timestamp
                      </th>

                      <th className="px-5 py-4 text-right font-medium">
                        View
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredTransactions.map(
                      (transaction) => (

                        <tr
                          key={
                            transaction.transaction_id
                          }
                          onClick={() =>
                            navigate(
                              `/transactions/${transaction.transaction_id}`
                            )
                          }
                          className="cursor-pointer border-b border-zinc-800/70 transition hover:bg-zinc-800/40 last:border-0"
                        >

                          <td className="px-5 py-4">

                            <span className="font-medium text-cyan-400">
                              {
                                transaction.transaction_id
                              }
                            </span>

                            {transaction.source ===
                              "live" && (

                              <span className="ml-2 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                                LIVE
                              </span>

                            )}

                          </td>


                          <td className="px-5 py-4 text-zinc-400">

                            {
                              transaction.sender_id ||
                              "N/A"
                            }

                          </td>


                          <td className="px-5 py-4 text-zinc-400">

                            {
                              transaction.receiver_id ||
                              "N/A"
                            }

                          </td>


                          <td className="px-5 py-4 text-zinc-300">

                            ₹
                            {Number(
                              transaction.amount || 0
                            ).toLocaleString(
                              "en-IN"
                            )}

                          </td>


                          <td className="px-5 py-4 font-medium text-white">

                            {Number(
                              transaction.risk_score || 0
                            ).toFixed(2)}

                          </td>


                          <td className="px-5 py-4">

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${getRiskStyle(
                                transaction.risk_level
                              )}`}
                            >

                              {
                                transaction.risk_level ||
                                "Low"
                              }

                            </span>

                          </td>


                          <td className="whitespace-nowrap px-5 py-4 text-xs text-zinc-500">

                            {transaction.timestamp
                              ? new Date(
                                  transaction.timestamp
                                ).toLocaleString(
                                  "en-IN"
                                )
                              : "N/A"}

                          </td>


                          <td className="px-5 py-4 text-right">

                            <ChevronRight
                              size={17}
                              className="ml-auto text-zinc-600"
                            />

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>


          {/* ================================================== */}
          {/* FOOTER */}
          {/* ================================================== */}

          <footer className="mt-8 border-t border-zinc-800 py-6 text-center">

            <p className="text-xs text-zinc-600">
              TrustUPI — AI-powered fraud detection for UPI transactions
            </p>

          </footer>

        </div>

      </main>

    </div>

  );

}