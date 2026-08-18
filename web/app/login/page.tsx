"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2, User, Phone } from "lucide-react";

import api, { setAccessToken } from "../lib/axios";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [username, setUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNo, setPhoneNo] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("🔥 LOGIN BUTTON HANDLER FIRED");

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      console.log("🔥 ABOUT TO CALL AXIOS");
      console.log("Email:", email);

      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      console.log("🔥 LOGIN RESPONSE:", response.data);

      const accessToken = response.data?.accessToken;

      if (!accessToken) {
        console.error("❌ Login response did not contain accessToken");

        throw new Error("Login succeeded but no access token was returned.");
      }

      // Store access token in memory
      setAccessToken(accessToken);

      console.log("🔥 ACCESS TOKEN STORED");
      console.log("🔥 REDIRECTING TO /home");

      router.replace("/home");
    } catch (err: any) {
      console.error("❌ LOGIN ERROR:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed. Please try again.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // REGISTER
  // =========================================================

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("🔥 REGISTER BUTTON HANDLER FIRED");

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      console.log("🔥 ABOUT TO CALL REGISTER API");

      const response = await api.post("/auth/register", {
        username: username.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
        countryCode: countryCode.trim(),
        phoneNo: phoneNo.trim(),
        role: "USER",
      });

      console.log("🔥 REGISTER RESPONSE:", response.data);

      setSuccess(
        response.data?.message ||
          "Registration successful. Please verify your email.",
      );

      /*
       * Your backend registration flow uses email
       * verification, so we don't log the user in here.
       */

      setTimeout(() => {
        router.push(
          `/auth?mode=verify&email=${encodeURIComponent(registerEmail.trim())}`,
        );
      }, 700);
    } catch (err: any) {
      console.error("❌ REGISTER ERROR:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Registration failed. Please try again.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // SWITCH LOGIN / REGISTER
  // =========================================================

  const switchMode = (newMode: Mode) => {
    console.log("Switching mode:", newMode);

    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">
          <h1 className="text-5xl font-semibold tracking-tight text-green-900">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            {mode === "login"
              ? "Sign in to access your account"
              : "Create your account to get started"}
          </p>
        </div>

        {/* =================================================
            LOGIN / REGISTER SWITCH
        ================================================= */}

        <div className="mb-7 flex rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
              mode === "login"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
              mode === "register"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Register
          </button>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (
          <div className="mb-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* =================================================
            LOGIN FORM
        ================================================= */}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* EMAIL */}

            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Email address"
                autoComplete="email"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5 disabled:opacity-60"
              />
            </div>

            {/* PASSWORD */}

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Password"
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5 disabled:opacity-60"
              />
            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* =================================================
            REGISTER FORM
        ================================================= */}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* USERNAME */}

            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="Username"
                autoComplete="username"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5 disabled:opacity-60"
              />
            </div>

            {/* EMAIL */}

            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

              <input
                type="email"
                value={registerEmail}
                onChange={(e) => {
                  setRegisterEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Email address"
                autoComplete="email"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5 disabled:opacity-60"
              />
            </div>

            {/* PHONE */}

            <div className="flex gap-2">
              <input
                type="text"
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setError(null);
                }}
                placeholder="+91"
                required
                disabled={isLoading}
                className="w-20 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center outline-none focus:border-black focus:bg-white disabled:opacity-60"
              />

              <div className="relative flex-1">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

                <input
                  type="tel"
                  value={phoneNo}
                  onChange={(e) => {
                    setPhoneNo(e.target.value);
                    setError(null);
                  }}
                  placeholder="Phone number"
                  autoComplete="tel"
                  required
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5 disabled:opacity-60"
                />
              </div>
            </div>

            {/* PASSWORD */}

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

              <input
                type="password"
                value={registerPassword}
                onChange={(e) => {
                  setRegisterPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5 disabled:opacity-60"
              />
            </div>

            {/* REGISTER BUTTON */}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-8 text-center text-sm text-gray-500">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-medium text-black hover:underline"
              >
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-medium text-black hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
