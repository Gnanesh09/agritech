"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  User,
  Phone,
  Check,
  ChevronLeft,
} from "lucide-react";

import { loginServerAction, registerServerAction } from "../actions/auth";

import { setAccessToken } from "../lib/axios";

// ============================================================
// TYPES
// ============================================================

type Screen = "login" | "register" | "registered";

// ============================================================
// PAGE
// ============================================================

export default function LoginPage() {
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>("login");

  // ==========================================================
  // LOGIN
  // ==========================================================

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  // ==========================================================
  // REGISTER
  // ==========================================================

  const [username, setUsername] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");

  const [registerPassword, setRegisterPassword] = useState("");

  const [countryCode, setCountryCode] = useState("+91");

  const [phoneNo, setPhoneNo] = useState("");

  // ==========================================================
  // UI
  // ==========================================================

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  // ==========================================================
  // LOGIN
  // ==========================================================

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      console.log("[LOGIN] Logging in...");

      const result = await loginServerAction(email.trim(), password);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // ------------------------------------------------------
      // Store access token in memory
      // ------------------------------------------------------

      if (result.accessToken) {
        setAccessToken(result.accessToken);
      }

      console.log("[LOGIN] Login successful");

      // ------------------------------------------------------
      // Go to home
      // ------------------------------------------------------

      router.replace("/home");
      router.refresh();
    } catch (err) {
      console.error("[LOGIN] Error:", err);

      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ==========================================================
  // REGISTER
  // ==========================================================

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      console.log("[REGISTER] Registering...");

      // ------------------------------------------------------
      // Frontend validation
      // ------------------------------------------------------

      if (!username.trim()) {
        setError("Username is required.");
        return;
      }

      if (!registerEmail.trim()) {
        setError("Email is required.");
        return;
      }

      if (!registerPassword) {
        setError("Password is required.");
        return;
      }

      if (!countryCode.trim()) {
        setError("Country code is required.");
        return;
      }

      if (!phoneNo.trim()) {
        setError("Phone number is required.");
        return;
      }

      // ------------------------------------------------------
      // Register
      //
      // Public registration ALWAYS creates USER.
      // ------------------------------------------------------

      const result = await registerServerAction({
        username: username.trim(),

        email: registerEmail.trim().toLowerCase(),

        password: registerPassword,

        countryCode: countryCode.trim(),

        phoneNo: phoneNo.trim(),

        role: "USER",
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      console.log("[REGISTER] Registration successful");

      // ------------------------------------------------------
      // Show success screen
      // ------------------------------------------------------

      setSuccess(result.message || "Account created successfully.");

      setScreen("registered");
    } catch (err) {
      console.error("[REGISTER] Error:", err);

      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ==========================================================
  // SWITCH TO LOGIN
  // ==========================================================

  function goToLogin() {
    setScreen("login");

    setError(null);
    setSuccess(null);

    // Optional cleanup
    setPassword("");
  }

  // ==========================================================
  // SWITCH TO REGISTER
  // ==========================================================

  function goToRegister() {
    setScreen("register");

    setError(null);
    setSuccess(null);
  }

  // ==========================================================
  // REGISTERED SUCCESS
  // ==========================================================

  function continueToLogin() {
    setScreen("login");

    setEmail(registerEmail.trim());

    setPassword("");

    setError(null);
    setSuccess(null);
  }

  // ==========================================================
  // LOGIN SCREEN
  // ==========================================================

  if (screen === "login") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md">
          {/* HEADER */}

          <div className="mb-12">
            <h1 className="text-5xl font-semibold tracking-tight text-green-900">
              Welcome back
            </h1>

            <p className="mt-3 text-sm text-gray-500">
              Sign in to access your account
            </p>
          </div>

          {/* ERROR */}

          {error && <ErrorBox message={error} />}

          {/* FORM */}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* EMAIL */}

            <Input
              icon={<Mail className="h-5 w-5" />}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(value) => {
                setEmail(value);
                setError(null);
              }}
              autoComplete="email"
            />

            {/* PASSWORD */}

            <Input
              icon={<Lock className="h-5 w-5" />}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setError(null);
              }}
              autoComplete="current-password"
            />

            {/* LOGIN */}

            <PrimaryButton
              loading={isLoading}
              text="Sign In"
              loadingText="Signing in..."
            />
          </form>

          {/* REGISTER */}

          <div className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={goToRegister}
              className="font-medium text-black hover:underline"
            >
              Register here
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // REGISTER SCREEN
  // ==========================================================

  if (screen === "register") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
        <div className="w-full max-w-md">
          {/* BACK */}

          <button
            type="button"
            onClick={goToLogin}
            className="mb-8 flex items-center gap-1 text-sm text-gray-500"
          >
            <ChevronLeft className="h-4 w-4" />
            Sign in
          </button>

          {/* HEADER */}

          <div className="mb-8">
            <h1 className="text-5xl font-semibold tracking-tight text-green-900">
              Create account
            </h1>

            <p className="mt-3 text-sm text-gray-500">
              Join us and start managing your devices.
            </p>
          </div>

          {/* ERROR */}

          {error && <ErrorBox message={error} />}

          {/* FORM */}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* USERNAME */}

            <Input
              icon={<User className="h-5 w-5" />}
              type="text"
              placeholder="Username"
              value={username}
              onChange={(value) => {
                setUsername(value);
                setError(null);
              }}
              autoComplete="username"
            />

            {/* EMAIL */}

            <Input
              icon={<Mail className="h-5 w-5" />}
              type="email"
              placeholder="Email address"
              value={registerEmail}
              onChange={(value) => {
                setRegisterEmail(value);
                setError(null);
              }}
              autoComplete="email"
            />

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
                aria-label="Country code"
                className="
                  w-20
                  rounded-xl
                  border
                  border-gray-200
                  bg-gray-50
                  px-3
                  py-3
                  text-center
                  outline-none
                  transition
                  focus:border-black
                  focus:bg-white
                "
              />

              <div className="relative flex-1">
                <Phone
                  className="
                  absolute
                  left-3
                  top-3
                  h-5
                  w-5
                  text-gray-400
                "
                />

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
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    py-3
                    pl-10
                    pr-4
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:border-black
                    focus:bg-white
                    focus:ring-2
                    focus:ring-black/5
                  "
                />
              </div>
            </div>

            {/* PASSWORD */}

            <Input
              icon={<Lock className="h-5 w-5" />}
              type="password"
              placeholder="Password"
              value={registerPassword}
              onChange={(value) => {
                setRegisterPassword(value);
                setError(null);
              }}
              autoComplete="new-password"
            />

            {/* REGISTER */}

            <PrimaryButton
              loading={isLoading}
              text="Create Account"
              loadingText="Creating account..."
            />
          </form>

          {/* FOOTER */}

          <div className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={goToLogin}
              className="font-medium text-black hover:underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // REGISTRATION SUCCESS SCREEN
  // ==========================================================

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6ffe6] px-6">
      {/* Decorative circles */}

      <div
        className="
        absolute
        -right-24
        -top-24
        h-72
        w-72
        rounded-full
        bg-white/20
      "
      />

      <div
        className="
        absolute
        -bottom-32
        -left-24
        h-80
        w-80
        rounded-full
        bg-black/5
      "
      />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* SUCCESS ICON */}

        <div
          className="
          mx-auto
          flex
          h-24
          w-24
          items-center
          justify-center
          rounded-full
          bg-black
        "
        >
          <Check
            className="
              h-12
              w-12
              text-[#a5fd02]
            "
          />
        </div>

        <h1
          className="
          mt-8
          text-4xl
          font-bold
          tracking-tight
          text-black
        "
        >
          Account created
        </h1>

        <p
          className="
          mx-auto
          mt-4
          max-w-sm
          text-sm
          leading-6
          text-black/60
        "
        >
          Your AgriTech account has been created successfully. You can now sign
          in and start managing your devices.
        </p>

        <div
          className="
          mx-auto
          mt-4
          w-fit
          rounded-full
          bg-black/10
          px-4
          py-2
          text-sm
          font-semibold
          text-black
        "
        >
          {registerEmail}
        </div>

        {/* LOGIN */}

        <button
          type="button"
          onClick={continueToLogin}
          className="
            mt-8
            flex
            h-14
            w-full
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-black
            text-sm
            font-semibold
            text-white
            transition
            active:scale-[0.98]
          "
        >
          Continue to Sign In
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}

// ============================================================
// INPUT
// ============================================================

function Input({
  icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <div
        className="
        absolute
        left-3
        top-3
        text-gray-400
      "
      >
        {icon}
      </div>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="
          w-full
          rounded-xl
          border
          border-gray-200
          bg-gray-50
          py-3
          pl-10
          pr-4
          outline-none
          transition
          placeholder:text-gray-400
          focus:border-black
          focus:bg-white
          focus:ring-2
          focus:ring-black/5
        "
      />
    </div>
  );
}

// ============================================================
// PRIMARY BUTTON
// ============================================================

function PrimaryButton({
  loading,
  text,
  loadingText,
}: {
  loading: boolean;
  text: string;
  loadingText: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        mt-2
        flex
        w-full
        items-center
        justify-center
        gap-2
        rounded-xl
        bg-black
        py-3
        font-medium
        text-white
        transition
        hover:bg-gray-900
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-70
      "
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {text}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

// ============================================================
// ERROR
// ============================================================

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="
      mb-5
      rounded-xl
      border
      border-red-100
      bg-red-50
      px-4
      py-3
      text-sm
      text-red-600
    "
    >
      {message}
    </div>
  );
}
