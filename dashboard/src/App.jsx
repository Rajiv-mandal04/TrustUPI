import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import TransactionDetails from "./pages/TransactionDetails";
import FraudAlerts from "./pages/FraudAlerts";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import ProtectedRoute from "./components/ProtectedRoute";


function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* ========================================= */}
        {/* PUBLIC ROUTES */}
        {/* ========================================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />


        {/* ========================================= */}
        {/* PROTECTED ROUTES */}
        {/* ========================================= */}

        <Route element={<ProtectedRoute />}>

          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/transactions"
            element={<Transactions />}
          />

          <Route
            path="/transactions/:transactionId"
            element={<TransactionDetails />}
          />

          <Route
            path="/fraud-alerts"
            element={<FraudAlerts />}
          />

          <Route
            path="/analytics"
            element={<Analytics />}
          />

          <Route
            path="/settings"
            element={<Settings />}
          />

        </Route>

      </Routes>

    </BrowserRouter>

  );

}


export default App;