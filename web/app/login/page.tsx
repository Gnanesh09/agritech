"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  User,
  Phone,
  Check,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";

import {
  loginServerAction,
  registerServerAction,
  verifyEmailServerAction,
} from "../actions/auth";

import { setAccessToken } from "../lib/axios";

// ============================================================
// TYPES
// ============================================================

type Screen = "login" | "register" | "registered" | "verify";

// ============================================================
// PAGE
// ============================================================

export default function LoginPage() {
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>("login");

  // ----------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  // ----------------------------------------------------------
  // REGISTER
  // ----------------------------------------------------------

  const [username, setUsername] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");

  const [registerPassword, setRegisterPassword] = useState("");

  const [countryCode, setCountryCode] = useState("+91");

  const [phoneNo, setPhoneNo] = useState("");

  // ----------------------------------------------------------
  // OTP
  // ----------------------------------------------------------

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [otpTime, setOtpTime] = useState(60);

  // ----------------------------------------------------------
  // UI STATE
  // ----------------------------------------------------------

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  // ==========================================================
  // OTP TIMER
  // ==========================================================

  useEffect(() => {
    if (screen !== "verify") {
      return;
    }

    if (otpTime <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setOtpTime((time) => (time > 0 ? time - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, otpTime]);

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
      // Go home
      // ------------------------------------------------------

      router.refresh();

      router.push("/home");
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

      const result = await registerServerAction({
        username: username.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
        countryCode: countryCode.trim(),
        phoneNo: phoneNo.trim(),

        // IMPORTANT
        // Normal public registration should
        // always create a USER.
        role: "USER",
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      console.log("[REGISTER] Registration successful");

      // ------------------------------------------------------
      // Show beautiful success screen
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
  // OPEN OTP SCREEN
  // ==========================================================

  function openVerification() {
    setError(null);
    setSuccess(null);

    setOtp(["", "", "", "", "", ""]);

    setOtpTime(60);

    setScreen("verify");

    setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 100);
  }

  // ==========================================================
  // OTP INPUT
  // ==========================================================

  function handleOtpChange(index: number, value: string) {
    const cleanValue = value.replace(/\D/g, "");

    if (!cleanValue) {
      const next = [...otp];
      next[index] = "";

      setOtp(next);
      return;
    }

    // --------------------------------------------------------
    // Handle paste / multiple digits
    // --------------------------------------------------------

    if (cleanValue.length > 1) {
      const digits = cleanValue.slice(0, 6);

      const next = [...otp];

      digits.split("").forEach((digit, i) => {
        if (index + i < 6) {
          next[index + i] = digit;
        }
      });

      setOtp(next);

      const focusIndex = Math.min(index + digits.length, 5);

      setTimeout(() => {
        otpRefs.current[focusIndex]?.focus();
      }, 0);

      return;
    }

    const next = [...otp];

    next[index] = cleanValue;

    setOtp(next);

    // --------------------------------------------------------
    // Move to next box
    // --------------------------------------------------------

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  // ==========================================================
  // OTP BACKSPACE
  // ==========================================================

  function handleOtpKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  // ==========================================================
  // VERIFY OTP
  // ==========================================================

  async function handleVerify() {
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit code.");

      return;
    }

    if (otpTime <= 0) {
      setError("This OTP has expired. Please request a new code.");

      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      console.log("[VERIFY] Verifying OTP...");

      const result = await verifyEmailServerAction(
        registerEmail.trim(),
        otpValue,
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      // ------------------------------------------------------
      // IMPORTANT
      //
      // verifyEmail creates:
      //
      // refreshToken cookie
      // accessToken
      // authenticated session
      // ------------------------------------------------------

      if (result.accessToken) {
        setAccessToken(result.accessToken);
      }

      console.log("[VERIFY] Account verified");

      setSuccess("Your account is verified.");

      // ------------------------------------------------------
      // Go home
      // ------------------------------------------------------

      router.refresh();

      router.push("/home");
    } catch (err) {
      console.error("[VERIFY] Error:", err);

      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ==========================================================
  // SKIP VERIFICATION
  // ==========================================================

  async function handleSkipVerification() {
    /*
     * IMPORTANT:
     *
     * Registration itself does NOT create an
     * authenticated session.
     *
     * Therefore this only attempts to continue
     * to the application.
     *
     * If your backend requires verified=true
     * before login, /home will correctly send
     * the user back to authentication.
     */

    setError(null);
    setIsLoading(true);

    try {
      router.push("/home");
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

            {/* BUTTON */}

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
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="+91"
                className="w-20 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center outline-none transition focus:border-black focus:bg-white"
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
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5"
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

  if (screen === "registered") {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#a5fd02] px-6">
        {/* Decorative circles */}

        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20" />

        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-black/5" />

        <div className="relative z-10 w-full max-w-md text-center">
          {/* SUCCESS ICON */}

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-black">
            <Check className="h-12 w-12 text-[#a5fd02]" />
          </div>

          <h1 className="mt-8 text-4xl font-bold tracking-tight text-black">
            You're in.
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-black/60">
            Your account has been created successfully. We've sent a
            verification code to
          </p>

          <div className="mx-auto mt-3 w-fit rounded-full bg-black/10 px-4 py-2 text-sm font-semibold text-black">
            {registerEmail}
          </div>

          {/* VERIFY */}

          <button
            type="button"
            onClick={openVerification}
            className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            Verify account
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* SKIP */}

          <button
            type="button"
            onClick={handleSkipVerification}
            disabled={isLoading}
            className="mt-4 w-full rounded-2xl py-3 text-sm font-medium text-black/60 transition hover:bg-black/5"
          >
            Skip for now
          </button>
        </div>
      </main>
    );
  }

  // ==========================================================
  // OTP SCREEN
  // ==========================================================

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="w-full max-w-md">
        {/* BACK */}

        <button
          type="button"
          onClick={() => {
            setError(null);
            setScreen("registered");
          }}
          className="mb-10 flex items-center gap-1 text-sm text-gray-500"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {/* ICON */}

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a5fd02]/20">
          <ShieldCheck className="h-7 w-7 text-black" />
        </div>

        {/* HEADER */}

        <h1 className="mt-7 text-4xl font-semibold tracking-tight text-gray-900">
          Verify your account
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Enter the 6-digit code we sent to
        </p>

        <p className="mt-1 text-sm font-semibold text-gray-900">
          {registerEmail}
        </p>

        {/* ERROR */}

        {error && <ErrorBox message={error} />}

        {/* OTP */}

        <div className="mt-8 flex justify-between gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                otpRefs.current[index] = element;
              }}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              maxLength={6}
              className="h-14 w-12 rounded-xl border border-gray-200 bg-gray-50 text-center text-xl font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5 sm:h-16 sm:w-14"
            />
          ))}
        </div>

        {/* TIMER */}

        <div className="mt-6 text-center">
          {otpTime > 0 ? (
            <p className="text-sm text-gray-400">
              Code expires in{" "}
              <span className="font-semibold text-gray-900">
                00:
                {otpTime.toString().padStart(2, "0")}
              </span>
            </p>
          ) : (
            <p className="text-sm font-medium text-red-500">Code expired</p>
          )}
        </div>

        {/* VERIFY BUTTON */}

        <button
          type="button"
          onClick={handleVerify}
          disabled={isLoading || otp.join("").length !== 6 || otpTime <= 0}
          className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify account
              <Check className="h-4 w-4" />
            </>
          )}
        </button>

        {/* SKIP */}

        <button
          type="button"
          onClick={handleSkipVerification}
          className="mt-4 w-full rounded-xl py-3 text-sm font-medium text-gray-400 hover:text-gray-700"
        >
          Skip for now
        </button>

        {/* FOOTER */}

        <p className="mt-8 text-center text-[11px] leading-5 text-gray-400">
          Verification helps keep your account secure.
        </p>
      </div>
    </main>
  );
}

// ============================================================
// INPUT COMPONENT
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
      <div className="absolute left-3 top-3 text-gray-400">{icon}</div>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none transition placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/5"
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
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
// ERROR BOX
// ============================================================

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
      {message}
    </div>
  );
}
