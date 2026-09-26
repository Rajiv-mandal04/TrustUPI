import {
  AlertTriangle,
  ChevronRight,
  Trash2,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const levelStyles = {
  High: "bg-orange-500/10 text-orange-400",
  Critical: "bg-red-500/10 text-red-400",
};

export default function AlertTable({
  alerts = [],
  onDelete,
}) {
  const navigate = useNavigate();

  const [showAll, setShowAll] = useState(false);

  const displayedAlerts = showAll
    ? alerts
    : alerts.slice(0, 7);

  const handleAlertClick = (transactionId) => {
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

          <h3 className="flex items-center gap-2 font-semibold text-white">

            <AlertTriangle className="h-4 w-4 text-orange-400" />

            Recent Fraud Alerts

          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            High-risk transactions requiring attention
          </p>

        </div>

        {/* VIEW ALL */}
        {alerts.length > 7 && (

          <button
            onClick={() =>
              setShowAll((previous) => !previous)
            }
            className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
          >
            {showAll
              ? "Show recent"
              : `View all (${alerts.length})`}
          </button>

        )}

      </div>

      {/* Empty */}
      {alerts.length === 0 ? (

        <div className="p-10 text-center">

          <p className="text-sm text-zinc-500">
            No fraud alerts found.
          </p>

        </div>

      ) : (

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="text-xs text-zinc-500">

              <tr className="border-b border-zinc-800">

                <th className="px-5 py-4 font-medium">
                  Transaction
                </th>

                <th className="px-5 py-4 font-medium">
                  Risk Score
                </th>

                <th className="px-5 py-4 font-medium">
                  Level
                </th>

                <th className="px-5 py-4 font-medium">
                  Status
                </th>

                <th className="px-5 py-4 text-right font-medium">
                  View
                </th>

                <th className="px-5 py-4 text-right font-medium">
                  Delete
                </th>

              </tr>

            </thead>

            <tbody>

              {displayedAlerts.map((alert) => (

                <tr
                  key={alert.id}
                  onClick={() =>
                    handleAlertClick(
                      alert.transaction_id
                    )
                  }
                  className="cursor-pointer border-b border-zinc-800/70 transition hover:bg-zinc-800/50 last:border-0"
                >

                  <td className="px-5 py-4">

                    <div className="font-medium text-cyan-400">
                      {alert.transaction_id}
                    </div>

                  </td>

                  <td className="px-5 py-4 text-zinc-300">

                    {Number(
                      alert.risk_score
                    ).toFixed(2)}

                  </td>

                  <td className="px-5 py-4">

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        levelStyles[
                          alert.risk_level
                        ] ||
                        "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {alert.risk_level}
                    </span>

                  </td>

                  <td className="px-5 py-4">

                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                      {alert.alert_status}
                    </span>

                  </td>

                  <td className="px-5 py-4 text-right">

                    <ChevronRight
                      size={16}
                      className="ml-auto text-zinc-600"
                    />

                  </td>

                  <td className="px-5 py-4 text-right">

                    <button
                      onClick={(event) =>
                        handleDelete(
                          event,
                          alert.transaction_id
                        )
                      }
                      className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                      title="Remove from dashboard"
                    >
                      <Trash2 size={16} />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}