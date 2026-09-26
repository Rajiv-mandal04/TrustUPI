// ============================================================
// TOPBAR - TrustUPI
// ============================================================

// ============================================================
// IMPORTS
// ============================================================

import {
  Bell,
  LogOut,
  Settings,
  User,
  CheckCheck,
  AlertTriangle,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  getAlerts,
} from "../services/api";


// ============================================================
// MAIN TOPBAR COMPONENT
// ============================================================

export default function Topbar() {

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigate = useNavigate();


  // ==========================================================
  // ADMIN DATA
  // ==========================================================

  const adminData =
    localStorage.getItem("trustupi_admin");

  const admin = adminData
    ? JSON.parse(adminData)
    : null;

  const adminName =
    admin?.name || "Admin";

  const adminRole =
    admin?.role || "Admin";

  const adminDesignation =
    admin?.designation || "Fraud Analyst";


  // ==========================================================
  // STATE - DROPDOWNS
  // ==========================================================

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [notificationOpen, setNotificationOpen] =
    useState(false);


  // ==========================================================
  // STATE - NOTIFICATIONS
  // ==========================================================

  const [notifications, setNotifications] =
    useState([]);

  const [notificationLoading, setNotificationLoading] =
    useState(false);

  // IDs of notifications that admin has already read
  const [readNotificationIds, setReadNotificationIds] =
    useState(() => {

      try {

        const saved =
          localStorage.getItem(
            "trustupi_read_notifications"
          );

        return saved
          ? JSON.parse(saved)
          : [];

      } catch {
        return [];
      }

    });


  // ==========================================================
  // REFS - OUTSIDE CLICK DETECTION
  // ==========================================================

  const profileRef = useRef(null);

  const notificationRef =
    useRef(null);


  // ==========================================================
  // ADMIN INITIALS
  // ==========================================================

  const getInitials = (name) => {

    if (!name) {
      return "AD";
    }

    return name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  };


  const initials =
    getInitials(adminName);


  // ==========================================================
  // LOAD FRAUD ALERTS
  // Real notification data from PostgreSQL
  // ==========================================================

  const loadNotifications = async () => {

    try {

      setNotificationLoading(true);

      const data =
        await getAlerts(100);

      let alertList = [];

      // API returns array
      if (Array.isArray(data)) {

        alertList = data;

      }

      // API returns { alerts: [] }
      else if (
        Array.isArray(data?.alerts)
      ) {

        alertList = data.alerts;

      }

      // API returns { data: [] }
      else if (
        Array.isArray(data?.data)
      ) {

        alertList = data.data;

      }

      setNotifications(alertList);

    } catch (error) {

      console.error(
        "Topbar notification error:",
        error
      );

      setNotifications([]);

    } finally {

      setNotificationLoading(false);

    }

  };


  // ==========================================================
  // INITIAL DATA LOAD
  // ==========================================================

  useEffect(() => {

    loadNotifications();

  }, []);


  // ==========================================================
  // WEBSOCKET - REAL TIME FRAUD ALERTS
  // ==========================================================

  useEffect(() => {

    let socket = null;

    let reconnectTimer = null;

    let isUnmounted = false;


    const connectWebSocket = () => {

      if (isUnmounted) {
        return;
      }


      // ------------------------------------------------------
      // Connect to existing TrustUPI dashboard WebSocket
      // ------------------------------------------------------

      socket =
        new WebSocket(
          "wss://trustupi.onrender.com/ws/dashboard"
        );


      // ------------------------------------------------------
      // WebSocket Connected
      // ------------------------------------------------------

      socket.onopen = () => {

        console.log(
          "🔔 Topbar WebSocket connected"
        );

      };


      // ------------------------------------------------------
      // WebSocket Message
      // ------------------------------------------------------

      socket.onmessage = async (event) => {

        try {

          const message =
            JSON.parse(event.data);

          console.log(
            "🔔 Topbar WebSocket:",
            message
          );


          // --------------------------------------------------
          // New fraud event
          //
          // We don't depend on one exact event name.
          // Whenever backend broadcasts prediction/fraud
          // related event, refresh notifications.
          // --------------------------------------------------

          const eventType =
            String(
              message?.type ||
              message?.event ||
              ""
            ).toLowerCase();


          const isFraudEvent =
            eventType.includes("fraud") ||
            eventType.includes("alert") ||
            eventType.includes("prediction") ||
            message?.fraud_prediction === 1 ||
            message?.risk_level;


          if (isFraudEvent) {

            // Refresh real fraud alerts
            await loadNotifications();

          }

        } catch (error) {

          console.error(
            "Topbar WebSocket message error:",
            error
          );

        }

      };


      // ------------------------------------------------------
      // WebSocket Closed
      // ------------------------------------------------------

      socket.onclose = () => {

        console.log(
          "🔌 Topbar WebSocket disconnected"
        );


        if (!isUnmounted) {

          reconnectTimer =
            setTimeout(() => {

              connectWebSocket();

            }, 3000);

        }

      };


      // ------------------------------------------------------
      // WebSocket Error
      // ------------------------------------------------------

      socket.onerror = (error) => {

        console.error(
          "Topbar WebSocket error:",
          error
        );

      };

    };


    connectWebSocket();


    // --------------------------------------------------------
    // Cleanup
    // --------------------------------------------------------

    return () => {

      isUnmounted = true;

      if (reconnectTimer) {

        clearTimeout(
          reconnectTimer
        );

      }

      if (socket) {

        socket.close();

      }

    };

  }, []);


  // ==========================================================
  // OUTSIDE CLICK
  // Closes profile / notification
  // ==========================================================

  useEffect(() => {

    const handleOutsideClick = (event) => {

      // ------------------------------------------------------
      // Profile
      // ------------------------------------------------------

      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target
        )
      ) {

        setProfileOpen(false);

      }


      // ------------------------------------------------------
      // Notification
      // ------------------------------------------------------

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target
        )
      ) {

        setNotificationOpen(false);

      }

    };


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

    };

  }, []);


  // ==========================================================
  // PROFILE BUTTON
  // ==========================================================

  const handleProfileClick = () => {

    setProfileOpen(
      (previous) => !previous
    );

    // Close notification
    setNotificationOpen(false);

  };


  // ==========================================================
  // NOTIFICATION BUTTON
  // ==========================================================

  const handleNotificationClick = () => {

    setNotificationOpen(
      (previous) => !previous
    );

    // Close profile
    setProfileOpen(false);

    // Refresh alerts whenever notification opens
    loadNotifications();

  };


  // ==========================================================
  // OPEN TRANSACTION FROM NOTIFICATION
  // ==========================================================

  const handleNotificationClickItem = (
    notification
  ) => {

    const transactionId =
      notification?.transaction_id;


    if (!transactionId) {
      return;
    }


    // Mark this notification as read
    markNotificationAsRead(
      notification.id
    );


    // Close dropdown
    setNotificationOpen(false);


    // Navigate
    navigate(
      `/transactions/${encodeURIComponent(
        transactionId
      )}`
    );

  };


  // ==========================================================
  // MARK ONE NOTIFICATION AS READ
  // ==========================================================

  const markNotificationAsRead = (
    notificationId
  ) => {

    if (!notificationId) {
      return;
    }


    setReadNotificationIds(
      (previous) => {

        if (
          previous.includes(
            notificationId
          )
        ) {

          return previous;

        }


        const updated = [
          ...previous,
          notificationId,
        ];


        // Save locally
        localStorage.setItem(
          "trustupi_read_notifications",
          JSON.stringify(updated)
        );


        return updated;

      }
    );

  };


  // ==========================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ==========================================================

  const markAllNotificationsAsRead = () => {

    const allIds =
      notifications
        .map(
          (notification) =>
            notification?.id
        )
        .filter(Boolean);


    setReadNotificationIds(
      allIds
    );


    localStorage.setItem(
      "trustupi_read_notifications",
      JSON.stringify(allIds)
    );

  };


  // ==========================================================
  // UNREAD NOTIFICATIONS
  // ==========================================================

  const unreadNotifications =
    notifications.filter(
      (notification) =>
        !readNotificationIds.includes(
          notification?.id
        )
    );


  // ==========================================================
  // NOTIFICATION COUNT
  // ==========================================================

  const notificationCount =
    unreadNotifications.length;


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {

    localStorage.removeItem(
      "trustupi_token"
    );

    localStorage.removeItem(
      "trustupi_admin"
    );

    navigate(
      "/login",
      {
        replace: true,
      }
    );

  };


  // ==========================================================
  // SETTINGS
  // ==========================================================

  const handleSettings = () => {

    setProfileOpen(false);

    navigate("/settings");

  };


  // ==========================================================
  // DATE FORMATTER
  // Used inside notifications
  // ==========================================================

  const formatNotificationTime = (
    timestamp
  ) => {

    if (!timestamp) {
      return "";
    }


    try {

      return new Date(
        timestamp
      ).toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

    } catch {

      return "";

    }

  };


  // ==========================================================
  // RISK COLOR
  // ==========================================================

  const getRiskColor = (
    riskLevel
  ) => {

    const level =
      String(
        riskLevel || ""
      ).toUpperCase();


    if (level === "CRITICAL") {

      return "text-red-400";

    }


    if (level === "HIGH") {

      return "text-orange-400";

    }


    if (level === "MEDIUM") {

      return "text-yellow-400";

    }


    return "text-cyan-400";

  };


  // ==========================================================
  // JSX
  // ==========================================================

  return (

    <>

      {/* ====================================================
          HIDE NOTIFICATION SCROLLBAR
          Scrolling will still work.
      ==================================================== */}

      <style>
        {`
          .trustupi-notification-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .trustupi-notification-scroll::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }
        `}
      </style>


      <header
        className="
          fixed
          left-64
          right-0
          top-0
          z-30
          flex
          h-20
          items-center
          justify-between
          border-b
          border-zinc-800
          bg-zinc-950/90
          px-8
          backdrop-blur-xl
        "
      >

        {/* ==================================================
            LEFT SIDE - PAGE TITLE
        ================================================== */}

        <div>

          <h2 className="text-xl font-semibold text-white">
            Dashboard
          </h2>

          <p className="text-sm text-zinc-500">
            Monitor UPI transactions and fraud activity
          </p>

        </div>


        {/* ==================================================
            RIGHT SIDE
        ================================================== */}

        <div className="flex items-center gap-5">


          {/* ==================================================
              NOTIFICATION SECTION
          ================================================== */}

          <div
            ref={notificationRef}
            className="relative"
          >

            {/* ----------------------------------------------
                NOTIFICATION BUTTON
            ---------------------------------------------- */}

            <button
              onClick={handleNotificationClick}
              className={`
                relative
                rounded-xl
                border
                bg-zinc-900
                p-2.5
                transition-all
                duration-200

                ${
                  notificationOpen
                    ? "border-white/80 text-white shadow-[0_0_14px_rgba(255,255,255,0.22)]"
                    : "border-white/25 text-zinc-400 hover:border-white/60 hover:text-white hover:shadow-[0_0_12px_rgba(255,255,255,0.14)]"
                }
              `}
            >

              <Bell className="h-5 w-5" />


              {/* Notification Count */}

              {notificationCount > 0 && (

                <span
                  className="
                    absolute
                    -right-1
                    -top-1
                    flex
                    h-[18px]
                    min-w-[18px]
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                    px-1
                    text-[10px]
                    font-bold
                    text-white
                  "
                >

                  {notificationCount > 10
                    ? "10+"
                    : notificationCount}

                </span>

              )}

            </button>


            {/* ----------------------------------------------
                NOTIFICATION DETAIL BOX
                WHOLE BOX HAS GLOW
            ---------------------------------------------- */}

            {notificationOpen && (

              <div
                className="
                  absolute
                  right-0
                  top-14
                  w-80
                  overflow-hidden
                  rounded-xl
                  border
                  border-white/50
                  bg-zinc-900
                  shadow-[0_0_18px_rgba(255,255,255,0.16)]
                "
              >

                {/* Notification Header */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-zinc-800
                    px-4
                    py-3
                  "
                >

                  <div>

                    <h3 className="text-sm font-semibold text-white">
                      Notifications
                    </h3>

                    <p className="text-xs text-zinc-500">
                      Fraud detection alerts
                    </p>

                  </div>


                  {/* Mark All Read */}

                  {notifications.length > 0 && (

                    <button
                      onClick={markAllNotificationsAsRead}
                      className="
                        text-xs
                        text-cyan-400
                        transition
                        hover:text-cyan-300
                      "
                    >

                      <span className="flex items-center gap-1">

                        <CheckCheck
                          className="
                            h-3.5
                            w-3.5
                          "
                        />

                        Mark all read

                      </span>

                    </button>

                  )}

                </div>


                {/* Notification Loading */}

                {notificationLoading ? (

                  <div
                    className="
                      px-5
                      py-10
                      text-center
                    "
                  >

                    <Bell
                      className="
                        mx-auto
                        mb-3
                        h-5
                        w-5
                        animate-pulse
                        text-zinc-600
                      "
                    />

                    <p className="text-sm text-zinc-400">
                      Loading alerts...
                    </p>

                  </div>

                ) : notifications.length === 0 ? (

                  /* No Notifications */

                  <div
                    className="
                      px-5
                      py-10
                      text-center
                    "
                  >

                    <div
                      className="
                        mx-auto
                        mb-3
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-full
                        bg-zinc-800
                      "
                    >

                      <Bell
                        className="
                          h-5
                          w-5
                          text-zinc-500
                        "
                      />

                    </div>


                    <p className="text-sm text-zinc-300">
                      No new notifications
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      New fraud alerts will appear here.
                    </p>

                  </div>

                ) : (

                  /* Notification List */

                  <div
                    className="
                      trustupi-notification-scroll
                      max-h-96
                      overflow-y-auto
                    "
                  >

                    {notifications.map(
                      (notification) => {

                        const isRead =
                          readNotificationIds.includes(
                            notification?.id
                          );


                        return (

                          <button
                            key={
                              notification?.id ||
                              notification?.transaction_id
                            }
                            onClick={() =>
                              handleNotificationClickItem(
                                notification
                              )
                            }
                            className={`
                              flex
                              w-full
                              gap-3
                              border-b
                              border-zinc-800
                              px-4
                              py-3
                              text-left
                              transition
                              hover:bg-zinc-800

                              ${
                                isRead
                                  ? "opacity-60"
                                  : ""
                              }
                            `}
                          >

                            {/* Alert Icon */}

                            <div
                              className="
                                mt-0.5
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-red-500/10
                              "
                            >

                              <AlertTriangle
                                className="
                                  h-4
                                  w-4
                                  text-red-400
                                "
                              />

                            </div>


                            {/* Alert Content */}

                            <div className="min-w-0 flex-1">

                              <div
                                className="
                                  flex
                                  items-center
                                  justify-between
                                  gap-2
                                "
                              >

                                <p
                                  className="
                                    truncate
                                    text-sm
                                    font-medium
                                    text-white
                                  "
                                >
                                  {notification?.risk_level
                                    ? `${notification.risk_level} Fraud Alert`
                                    : "Fraud Alert"}
                                </p>


                                {!isRead && (

                                  <span
                                    className="
                                      h-1.5
                                      w-1.5
                                      shrink-0
                                      rounded-full
                                      bg-red-500
                                    "
                                  />

                                )}

                              </div>


                              {/* Transaction */}

                              <p
                                className="
                                  mt-1
                                  truncate
                                  text-xs
                                  text-zinc-500
                                "
                              >
                                Transaction:{" "}
                                {notification?.transaction_id ||
                                  "N/A"}
                              </p>


                              {/* Risk */}

                              <p
                                className={`
                                  mt-1
                                  text-xs
                                  font-medium
                                  ${getRiskColor(
                                    notification?.risk_level
                                  )}
                                `}
                              >
                                Risk Score:{" "}
                                {notification?.risk_score ??
                                  "N/A"}
                              </p>


                              {/* Time */}

                              <p
                                className="
                                  mt-1
                                  text-[11px]
                                  text-zinc-600
                                "
                              >
                                {formatNotificationTime(
                                  notification?.created_at
                                )}
                              </p>

                            </div>

                          </button>

                        );

                      }
                    )}

                  </div>

                )}

              </div>

            )}

          </div>


          {/* ==================================================
              PROFILE SECTION
          ================================================== */}

          <div
            ref={profileRef}
            className="relative"
          >

            {/* ----------------------------------------------
                PROFILE BUTTON
            ---------------------------------------------- */}

            <button
              onClick={handleProfileClick}
              className="flex items-center gap-3"
            >

              {/* Profile Circle */}

              <div
                className={`
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  text-sm
                  font-semibold
                  transition-all
                  duration-200

                  ${
                    profileOpen
                      ? "border border-white/80 bg-cyan-400/15 text-cyan-300 shadow-[0_0_14px_rgba(255,255,255,0.28)]"
                      : "border border-white/30 bg-cyan-400/10 text-cyan-400 hover:border-white/70 hover:shadow-[0_0_12px_rgba(255,255,255,0.20)]"
                  }
                `}
              >

                {initials}

              </div>


              {/* Closed Profile Text */}

              <div
                className="
                  hidden
                  text-left
                  sm:block
                "
              >

                <p className="text-sm font-medium text-white">
                  Admin
                </p>

                <p className="text-xs text-zinc-500">
                  Fraud Analyst
                </p>

              </div>

            </button>


            {/* ----------------------------------------------
                PROFILE DETAIL BOX
                WHOLE BOX HAS GLOW
            ---------------------------------------------- */}

            {profileOpen && (

              <div
                className="
                  absolute
                  right-0
                  top-14
                  w-64
                  overflow-hidden
                  rounded-xl
                  border
                  border-white/50
                  bg-zinc-900
                  shadow-[0_0_18px_rgba(255,255,255,0.16)]
                "
              >

                {/* Profile Information */}

                <div
                  className="
                    border-b
                    border-zinc-800
                    px-4
                    py-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >

                    {/* Avatar */}

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white/40
                        bg-cyan-400/10
                        font-semibold
                        text-cyan-400
                        shadow-[0_0_10px_rgba(255,255,255,0.10)]
                      "
                    >

                      {initials}

                    </div>


                    {/* Name + Email */}

                    <div className="min-w-0">

                      <p
                        className="
                          truncate
                          text-sm
                          font-medium
                          text-white
                        "
                      >
                        {adminName}
                      </p>

                      <p
                        className="
                          truncate
                          text-xs
                          text-zinc-500
                        "
                      >
                        {admin?.email || ""}
                      </p>

                    </div>

                  </div>


                  {/* Role + Designation */}

                  <div
                    className="
                      mt-3
                      flex
                      flex-wrap
                      gap-2
                    "
                  >

                    <span
                      className="
                        rounded-md
                        bg-zinc-800
                        px-2
                        py-1
                        text-xs
                        text-zinc-300
                      "
                    >
                      {adminRole}
                    </span>

                    <span
                      className="
                        rounded-md
                        bg-cyan-400/10
                        px-2
                        py-1
                        text-xs
                        text-cyan-400
                      "
                    >
                      {adminDesignation}
                    </span>

                  </div>

                </div>


                {/* Account Settings */}

                <button
                  onClick={handleSettings}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    px-4
                    py-3
                    text-sm
                    text-zinc-300
                    transition
                    hover:bg-zinc-800
                    hover:text-white
                  "
                >

                  <Settings className="h-4 w-4" />

                  Account Settings

                </button>


                {/* My Profile */}

                <button
                  onClick={() => {

                    setProfileOpen(false);

                    navigate("/settings");

                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    px-4
                    py-3
                    text-sm
                    text-zinc-300
                    transition
                    hover:bg-zinc-800
                    hover:text-white
                  "
                >

                  <User className="h-4 w-4" />

                  My Profile

                </button>


                {/* Logout Section */}

                <div
                  className="
                    border-t
                    border-zinc-800
                    p-2
                  "
                >

                  <button
                    onClick={handleLogout}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-lg
                      px-3
                      py-2.5
                      text-sm
                      text-red-400
                      transition
                      hover:bg-red-500/10
                      hover:text-red-300
                    "
                  >

                    <LogOut className="h-4 w-4" />

                    Logout

                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      </header>

    </>

  );

}