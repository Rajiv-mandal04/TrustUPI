const WS_URL =
  "wss://trustupi.onrender.com/ws/dashboard";


export function createDashboardWebSocket({
  onMessage,
  onStatusChange,
}) {

  let socket = null;
  let reconnectTimer = null;
  let manuallyClosed = false;


  const connect = () => {

    if (manuallyClosed) {
      return;
    }


    onStatusChange?.(
      "connecting"
    );


    socket =
      new WebSocket(
        WS_URL
      );


    // =================================================
    // CONNECTED
    // =================================================

    socket.onopen = () => {

      console.log(
        "TrustUPI WebSocket connected"
      );


      onStatusChange?.(
        "connected"
      );


      if (reconnectTimer) {

        clearTimeout(
          reconnectTimer
        );

        reconnectTimer = null;

      }

    };


    // =================================================
    // MESSAGE
    // =================================================

    socket.onmessage = (
      event
    ) => {

      try {

        const message =
          JSON.parse(
            event.data
          );


        console.log(
          "TrustUPI WebSocket event:",
          message
        );


        onMessage?.(
          message
        );


      } catch (error) {

        console.error(
          "Invalid WebSocket message:",
          error
        );

      }

    };


    // =================================================
    // ERROR
    // =================================================

    socket.onerror = (
      error
    ) => {

      console.error(
        "TrustUPI WebSocket error:",
        error
      );


      onStatusChange?.(
        "reconnecting"
      );

    };


    // =================================================
    // CLOSED
    // =================================================

    socket.onclose = () => {

      socket = null;


      if (manuallyClosed) {

        onStatusChange?.(
          "disconnected"
        );

        return;

      }


      onStatusChange?.(
        "reconnecting"
      );


      reconnectTimer =
        setTimeout(() => {

          connect();

        }, 3000);

    };

  };


  // =====================================================
  // SEND
  // =====================================================

  const send = (
    message
  ) => {

    if (
      socket &&
      socket.readyState ===
        WebSocket.OPEN
    ) {

      socket.send(
        JSON.stringify(
          message
        )
      );

    }

  };


  // =====================================================
  // CLOSE
  // =====================================================

  const close = () => {

    manuallyClosed = true;


    if (reconnectTimer) {

      clearTimeout(
        reconnectTimer
      );

      reconnectTimer = null;

    }


    if (socket) {

      socket.close();

      socket = null;

    }

  };


  // =====================================================
  // INITIAL CONNECTION
  // =====================================================

  connect();


  return {
    send,
    close,
  };

}