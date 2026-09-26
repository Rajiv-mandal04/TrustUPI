import { useEffect, useState } from "react";

import {
  User,
  Bell,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import {
  getApiHealth,
  getSettings,
  updateSettings,
} from "../services/api";


export default function Settings() {

  // =====================================================
  // SETTINGS STATE
  // =====================================================

  const [settings, setSettings] = useState({
    name: "",
    email: "",
    fraudAlerts: true,
    criticalAlerts: true,
    realtimeAlerts: true,
  });


  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);

  const [error, setError] = useState("");


  // =====================================================
  // API STATUS
  // =====================================================

  const [apiStatus, setApiStatus] =
    useState("checking");


  // =====================================================
  // DATABASE STATUS
  // =====================================================

  const [databaseStatus, setDatabaseStatus] =
    useState("checking");


  // =====================================================
  // LOAD SETTINGS FROM DATABASE
  // =====================================================

  useEffect(() => {

    const loadSettings = async () => {

      try {

        setLoading(true);
        setError("");


        const data = await getSettings();


        // -------------------------------------------------
        // Get currently logged-in admin profile
        // -------------------------------------------------

        let admin = {};

        try {

          admin = JSON.parse(
            localStorage.getItem(
              "trustupi_admin"
            ) || "{}"
          );

        } catch (error) {

          console.error(
            "Admin profile parse error:",
            error
          );

        }


        setSettings({

          // Logged-in admin profile
          name:
            admin?.name ||
            data?.name ||
            "",

          email:
            admin?.email ||
            data?.email ||
            "",

          // Notification settings
          fraudAlerts:
            data?.fraud_alerts ?? true,

          criticalAlerts:
            data?.critical_alerts ?? true,

          realtimeAlerts:
            data?.realtime_alerts ?? true,

        });


      } catch (error) {

        console.error(
          "Settings load error:",
          error
        );

        setError(
          "Unable to load TrustUPI settings."
        );

      } finally {

        setLoading(false);

      }

    };


    loadSettings();

  }, []);


  // =====================================================
  // API + DATABASE HEALTH
  // =====================================================

  useEffect(() => {

    const checkHealth = async () => {

      try {

        const health =
          await getApiHealth();


        // -------------------------------------------------
        // FastAPI status
        // -------------------------------------------------

        setApiStatus(
          health?.status === "healthy"
            ? "operational"
            : "offline"
        );


        // -------------------------------------------------
        // PostgreSQL status
        // -------------------------------------------------

        setDatabaseStatus(
          health?.database === "connected"
            ? "connected"
            : "offline"
        );


      } catch (error) {

        console.error(
          "API health check failed:",
          error
        );


        setApiStatus(
          "offline"
        );


        setDatabaseStatus(
          "offline"
        );

      }

    };


    checkHealth();

  }, []);


  // =====================================================
  // UPDATE SETTING
  // =====================================================

  const updateSetting = (
    key,
    value
  ) => {

    setSettings(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );

    setSaved(false);
    setError("");

  };


  // =====================================================
  // SAVE SETTINGS
  // =====================================================

  const handleSave = async () => {

    try {

      setSaving(true);
      setSaved(false);
      setError("");


      const updated =
        await updateSettings({

          name:
            settings.name.trim(),

          email:
            settings.email.trim(),

          fraud_alerts:
            settings.fraudAlerts,

          critical_alerts:
            settings.criticalAlerts,

          realtime_alerts:
            settings.realtimeAlerts,

        });


      // -------------------------------------------------
      // Update UI with database response
      // -------------------------------------------------

      if (updated?.settings) {

        const data =
          updated.settings;


        // Keep logged-in admin profile
        let admin = {};

        try {

          admin = JSON.parse(
            localStorage.getItem(
              "trustupi_admin"
            ) || "{}"
          );

        } catch (error) {

          console.error(
            "Admin profile parse error:",
            error
          );

        }


        setSettings({

          name:
            admin?.name ||
            data?.name ||
            "",

          email:
            admin?.email ||
            data?.email ||
            "",

          fraudAlerts:
            data?.fraud_alerts ??
            true,

          criticalAlerts:
            data?.critical_alerts ??
            true,

          realtimeAlerts:
            data?.realtime_alerts ??
            true,

        });

      }


      setSaved(true);


      setTimeout(() => {

        setSaved(false);

      }, 2500);


    } catch (error) {

      console.error(
        "Settings save error:",
        error
      );

      setError(
        error?.response?.data?.detail ||
        "Unable to save settings."
      );

    } finally {

      setSaving(false);

    }

  };


  // =====================================================
  // STATUS FLAGS
  // =====================================================

  const apiOperational =
    apiStatus === "operational";

  const databaseConnected =
    databaseStatus === "connected";


  // =====================================================
  // RETURN
  // =====================================================

  return (

    <div className="min-h-screen bg-zinc-950 text-white">

      <Sidebar />


      <main className="ml-64">

        <Topbar />


        <div className="px-6 pb-10 pt-25">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-8 flex items-start justify-between">

            <div>

              <h1 className="text-2xl font-bold text-white">
                Settings
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Manage TrustUPI profile, notifications and system status
              </p>

            </div>


            <button

              onClick={handleSave}

              disabled={
                saving ||
                loading
              }

              className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"

            >

              {saving ? (

                <RefreshCw
                  className="h-4 w-4 animate-spin"
                />

              ) : (

                <Save
                  className="h-4 w-4"
                />

              )}


              {saving
                ? "Saving..."
                : "Save Changes"}

            </button>

          </div>


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">

              <AlertCircle
                className="h-4 w-4"
              />

              {error}

            </div>

          )}


          {/* =================================================
              SAVED
          ================================================= */}

          {saved && (

            <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">

              <CheckCircle2
                className="h-4 w-4"
              />

              Settings saved successfully

            </div>

          )}


          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">


            {/* =================================================
                PROFILE
            ================================================= */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">

                  <User
                    className="h-5 w-5 text-cyan-400"
                  />

                </div>


                <div>

                  <h2 className="font-semibold text-white">
                    Profile & Preferences
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Manage your TrustUPI profile
                  </p>

                </div>

              </div>


              <div className="space-y-5">


                {/* NAME */}

                <div>

                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Display Name
                  </label>

                  <input

                    type="text"

                    value={
                      settings.name
                    }

                    readOnly

                    className="w-full cursor-default rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"

                  />

                </div>


                {/* EMAIL */}

                <div>

                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Email
                  </label>

                  <input

                    type="email"

                    value={
                      settings.email
                    }

                    readOnly

                    className="w-full cursor-default rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"

                  />

                </div>


              </div>

            </section>


            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">

                  <Bell
                    className="h-5 w-5 text-cyan-400"
                  />

                </div>


                <div>

                  <h2 className="font-semibold text-white">
                    Notifications
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Control TrustUPI fraud notifications
                  </p>

                </div>

              </div>


              <div className="space-y-5">


                <SettingToggle

                  title="Fraud Alerts"

                  description="Receive notifications for detected fraud"

                  checked={
                    settings.fraudAlerts
                  }

                  onChange={(value) =>
                    updateSetting(
                      "fraudAlerts",
                      value
                    )
                  }

                />


                <SettingToggle

                  title="Critical Alerts"

                  description="Notify when a critical-risk transaction is detected"

                  checked={
                    settings.criticalAlerts
                  }

                  onChange={(value) =>
                    updateSetting(
                      "criticalAlerts",
                      value
                    )
                  }

                />


                <SettingToggle

                  title="Real-time Alerts"

                  description="Receive live fraud notifications from TrustUPI"

                  checked={
                    settings.realtimeAlerts
                  }

                  onChange={(value) =>
                    updateSetting(
                      "realtimeAlerts",
                      value
                    )
                  }

                />


              </div>

            </section>


            {/* =================================================
                API SYSTEM
            ================================================= */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 xl:col-span-2">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">

                  <ShieldCheck
                    className="h-5 w-5 text-cyan-400"
                  />

                </div>


                <div>

                  <h2 className="font-semibold text-white">
                    API System
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Live TrustUPI backend status
                  </p>

                </div>

              </div>


              <div className="grid gap-4 md:grid-cols-2">


                {/* =================================================
                    FASTAPI
                ================================================= */}

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <span

                        className={`h-2.5 w-2.5 rounded-full ${
                          apiOperational
                            ? "bg-emerald-400"
                            : apiStatus ===
                              "offline"
                            ? "bg-red-400"
                            : "bg-yellow-400"
                        }`}

                      />


                      <div>

                        <p className="text-sm font-medium text-white">
                          FastAPI Backend
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          /health endpoint
                        </p>

                      </div>

                    </div>


                    <span

                      className={`text-xs font-medium ${
                        apiOperational
                          ? "text-emerald-400"
                          : apiStatus ===
                            "offline"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}

                    >

                      {apiOperational

                        ? "Operational"

                        : apiStatus ===
                          "offline"

                        ? "Offline"

                        : "Checking..."}

                    </span>

                  </div>

                </div>


                {/* =================================================
                    POSTGRESQL
                ================================================= */}

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <span

                        className={`h-2.5 w-2.5 rounded-full ${
                          databaseConnected
                            ? "bg-emerald-400"
                            : databaseStatus ===
                              "offline"
                            ? "bg-red-400"
                            : "bg-yellow-400"
                        }`}

                      />


                      <div>

                        <p className="text-sm font-medium text-white">
                          PostgreSQL
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          TrustUPI application database
                        </p>

                      </div>

                    </div>


                    <span

                      className={`text-xs font-medium ${
                        databaseConnected
                          ? "text-emerald-400"
                          : databaseStatus ===
                            "offline"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}

                    >

                      {databaseConnected

                        ? "Connected"

                        : databaseStatus ===
                          "offline"

                        ? "Offline"

                        : "Checking..."}

                    </span>

                  </div>

                </div>


              </div>

            </section>


          </div>

        </div>

      </main>

    </div>

  );

}


// =====================================================
// TOGGLE
// =====================================================

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}) {

  return (

    <div className="flex items-center justify-between gap-4">

      <div>

        <p className="text-sm font-medium text-white">
          {title}
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          {description}
        </p>

      </div>


      <button

        type="button"

        role="switch"

        aria-checked={checked}

        onClick={() =>
          onChange(!checked)
        }

        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked
            ? "bg-cyan-400"
            : "bg-zinc-700"
        }`}

      >

        <span

          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}

        />

      </button>

    </div>

  );

}