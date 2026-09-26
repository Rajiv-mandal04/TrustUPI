import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Loader2,
} from "lucide-react";

import { adminSignup } from "../services/api";

function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await adminSignup(
        name,
        email,
        password,
        confirmPassword
      );

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Admin account created successfully. Please login.",
        },
      });

    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Signup failed. Please try again.";

      setError(message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">

          <div className="flex justify-center mb-4">

            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center">

              <ShieldCheck
                size={30}
                className="text-white"
              />

            </div>

          </div>

          <h1 className="text-3xl font-bold text-white">
            TrustUPI
          </h1>

          <p className="text-slate-400 mt-2">
            Admin Dashboard
          </p>

        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-xl">

          <h2 className="text-xl font-semibold text-white mb-1">
            Create Admin Account
          </h2>

          <p className="text-sm text-slate-400 mb-6">
            Create your TrustUPI administrator account.
          </p>

          <form
            onSubmit={handleSignup}
            className="space-y-4"
          >

            {/* Name */}
            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Full Name
              </label>

              <div className="relative">

                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter full name"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500"
                />

              </div>

            </div>

            {/* Email */}
            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Email
              </label>

              <div className="relative">

                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="admin@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500"
                />

              </div>

            </div>

            {/* Password */}
            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Password
              </label>

              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500"
                />

              </div>

            </div>

            {/* Confirm */}
            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Confirm Password
              </label>

              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500"
                />

              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >

              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}

            </button>

          </form>

          <div className="text-center mt-6 text-sm text-slate-400">

            Already have an account?{" "}

            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300"
            >
              Sign In
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Signup;