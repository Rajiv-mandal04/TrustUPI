import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

// =====================================================
// AUTH
// =====================================================

export const adminLogin = async (email, password) => {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

export const adminSignup = async (
  name,
  email,
  password,
  confirm_password
) => {
  const response = await API.post("/auth/signup", {
    name,
    email,
    password,
    confirm_password,
  });

  return response.data;
};

// =====================================================
// JWT INTERCEPTOR
// =====================================================

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("trustupi_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =====================================================
// ANALYTICS
// =====================================================

export const getAnalytics = async () => {
  const response = await API.get(
    `/analytics/?_t=${Date.now()}`
  );

  return response.data;
};

// =====================================================
// ALERTS
// =====================================================

export const getAlerts = async (limit = 100) => {
  const response = await API.get(
    `/alerts/?limit=${limit}&_t=${Date.now()}`
  );

  return response.data;
};

// =====================================================
// TRANSACTIONS
// =====================================================

export const getTransactions = async (limit = 100) => {
  const response = await API.get(
    `/transactions/?limit=${limit}&_t=${Date.now()}`
  );

  return response.data;
};

export const getTransaction = async (transactionId) => {
  const response = await API.get(
    `/transactions/${transactionId}?_t=${Date.now()}`
  );

  return response.data;
};

// =====================================================
// ACTIVITY
// =====================================================

export const getActivity = async () => {
  const response = await API.get(
    `/analytics/activity?_t=${Date.now()}`
  );

  return response.data;
};

// =====================================================
// API HEALTH
// =====================================================

export const getApiHealth = async () => {
  const response = await axios.get(
    `http://127.0.0.1:8000/health?_t=${Date.now()}`
  );

  return response.data;
};

// ============================================================
// TRUSTUPI SETTINGS
// ============================================================

export const getSettings = async () => {
  const response = await API.get(
    `/settings/?_t=${Date.now()}`
  );

  return response.data;
};


export const updateSettings = async (settings) => {
  const response = await API.put(
    `/settings/?_t=${Date.now()}`,
    settings
  );

  return response.data;
};

export default API;