import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TransactionTable({
  transactions = [],
  onDelete,
}) {
  const navigate = useNavigate();

  const [showAll, setShowAll] = useState(false);

  const displayedTransactions = showAll
    ? transactions
    : transactions.slice(0, 7);

  const handleTransactionClick = (
    transactionId
  ) => {
    navigate(`/transactions/${transactionId}`);
  };

  const handleDelete = (
    event,
    transactionId
  ) => {
    event.stopPropagation();

    if (onDelete) {
      onDelete(transactionId);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-5">

        <div>

          <h3 className="font-semibold text-white">
            Recent Transactions
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            Latest monitored UPI transactions
          </p>

        </div>

        {transactions.length > 7 && (

          <button
            onClick={() =>
              setShowAll((previous) => !previous)
            }
            className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
          >
            {showAll
              ? "Show recent"
              : `View all (${transactions.length})`}
          </button>

        )}

      </div>

      {/* Empty */}
      {transactions.length === 0 ? (

        <div className="p-10 text-center">

          <p className="text-sm text-zinc-500">
            No transactions found.
          </p>

        </div>

      ) : (

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="text-xs text-zinc-500">

              <tr className="border-b border-zinc-800">

                <th className="px-5 py-4 font-medium">
                  Transaction ID
                </th>

                <th className="px-5 py-4 font-medium">
                  Sender
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

                <th className="px-5 py-4 text-right font-medium">
                  Delete
                </th>

              </tr>

            </thead>

            <tbody>

              {displayedTransactions.map(
                (transaction) => (

                  <tr
                    key={transaction.transaction_id}
                    onClick={() =>
                      handleTransactionClick(
                        transaction.transaction_id
                      )
                    }
                    className="cursor-pointer border-b border-zinc-800/70 transition hover:bg-zinc-800/50 last:border-0"
                  >

                    <td className="px-5 py-4 font-medium text-cyan-400">
                      {transaction.transaction_id}
                    </td>

                    <td className="px-5 py-4 text-zinc-400">
                      {transaction.sender_id}
                    </td>

                    <td className="px-5 py-4 text-zinc-300">

                      ₹
                      {Number(
                        transaction.amount
                      ).toLocaleString("en-IN")}

                    </td>

                    <td className="px-5 py-4 font-medium text-white">

                      {Number(
                        transaction.risk_score
                      ).toFixed(2)}

                    </td>

                    <td className="px-5 py-4">

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          transaction.risk_level ===
                          "High"
                            ? "bg-orange-500/10 text-orange-400"
                            : transaction.risk_level ===
                              "Critical"
                            ? "bg-red-500/10 text-red-400"
                            : transaction.risk_level ===
                              "Medium"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {transaction.risk_level}

                      </span>

                    </td>

                    <td className="px-5 py-4 text-right">

                      <button
                        onClick={(event) =>
                          handleDelete(
                            event,
                            transaction.transaction_id
                          )
                        }
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                        title="Remove from dashboard"
                      >

                        <Trash2 size={16} />

                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}