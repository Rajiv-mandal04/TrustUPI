import {
  LayoutDashboard,
  ArrowLeftRight,
  ShieldAlert,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAlerts } from "../services/api";

const DONE_ALERTS_KEY = "trustupi_done_alerts";

const menuItems = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    name: "Transactions",
    icon: ArrowLeftRight,
    path: "/transactions",
  },
  {
    name: "Fraud Alerts",
    icon: ShieldAlert,
    path: "/fraud-alerts",
  },
  {
    name: "Analytics",
    icon: BarChart3,
    path: "/analytics",
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const [alertCount, setAlertCount] = useState(0);

  const loadAlertCount = async () => {
    try {
      const response = await getAlerts(100);

      const alerts = response?.alerts || [];

      let doneAlerts = [];

      try {
        doneAlerts = JSON.parse(
          localStorage.getItem(DONE_ALERTS_KEY) || "[]"
        );
      } catch {
        doneAlerts = [];
      }

      const pendingAlerts = alerts.filter((alert) => {
        const isFraudAlert =
          alert.risk_level === "High" ||
          alert.risk_level === "Critical";

        const isDone = doneAlerts.includes(alert.transaction_id);

        return isFraudAlert && !isDone;
      });

      setAlertCount(pendingAlerts.length);
    } catch (error) {
      console.error("Failed to load fraud alert count:", error);
    }
  };

  useEffect(() => {
    loadAlertCount();

    const handleAlertUpdate = () => {
      loadAlertCount();
    };

    window.addEventListener(
      "fraud-alerts-updated",
      handleAlertUpdate
    );

    const handleStorageChange = (event) => {
      if (event.key === DONE_ALERTS_KEY) {
        loadAlertCount();
      }
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "fraud-alerts-updated",
        handleAlertUpdate
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">

      {/* ================================================== */}
      {/* LOGO */}
      {/* ================================================== */}

      <div className="flex h-20 items-center border-b border-zinc-800 px-6">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">

            <ShieldCheck className="h-6 w-6 text-cyan-400" />

          </div>

          <div>

            <h1 className="text-xl font-bold tracking-tight text-white">

              Trust
              <span className="text-cyan-400">
                UPI
              </span>

            </h1>

            <p className="text-[10px] text-zinc-500">
              Secure every payment
            </p>

          </div>

        </div>

      </div>

      {/* ================================================== */}
      {/* NAVIGATION */}
      {/* ================================================== */}

      <nav className="flex-1 space-y-2 px-4 py-6">

        <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          Overview
        </p>

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  isActive
                    ? "bg-cyan-400/10 text-cyan-400"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`
              }
            >

              <Icon className="h-5 w-5" />

              <span>
                {item.name}
              </span>

              {item.name === "Fraud Alerts" && alertCount > 0 && (

                <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                  {alertCount}
                </span>

              )}

            </NavLink>
          );
        })}

        {/* ================================================== */}
        {/* SYSTEM */}
        {/* ================================================== */}

        <div className="pt-6">

          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            System
          </p>

          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >

            <Settings className="h-5 w-5" />

            Settings

          </button>

        </div>

      </nav>

      {/* ================================================== */}
      {/* BOTTOM SYSTEM STATUS */}
      {/* ================================================== */}

      <div className="border-t border-zinc-800 p-4">

        <div className="rounded-xl bg-zinc-900 p-4">

          <div className="flex items-center gap-2">

            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-xs text-zinc-400">
              API System
            </span>

          </div>

          <p className="mt-2 text-sm font-medium text-white">
            Operational
          </p>

        </div>

      </div>

    </aside>
  );
}