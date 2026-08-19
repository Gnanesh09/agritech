"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

import {
  loginServerAction,
  registerServerAction,
  verifyEmailServerAction,
} from "../actions/auth";

type AuthStep = "LOGIN" | "REGISTER" | "OTP";

type AdminRole = "ADMIN" | "SUPER_ADMIN";

export default function AdminAuthPage() {
  const router = useRouter();

  const [step, setStep] = useState<AuthStep>("LOGIN");

  const [selectedRole, setSelectedRole] = useState<AdminRole>("ADMIN");

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    countryCode: "+91",
    phoneNo: "",
  });

  const [otp, setOtp] = useState("");

  function clearError() {
    setError(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearError();
  }

  function redirectByRole(role: string | undefined) {
    if (role === "SUPER_ADMIN") {
      router.replace("/superadmin");
      return;
    }

    if (role === "ADMIN") {
      router.replace("/admin/dashboard");
      return;
    }

    setError("This account does not have admin access.");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    clearError();
    setIsLoading(true);

    try {
      // ======================================================
      // LOGIN
      // ======================================================

      if (step === "LOGIN") {
        const result = await loginServerAction(
          formData.email,
          formData.password,
        );

        if (!result.success) {
          setError(result.error);
          return;
        }

        const role = result.user?.role;

        redirectByRole(role);

        return;
      }

      // ======================================================
      // REGISTER
      // ======================================================

      if (step === "REGISTER") {
        const result = await registerServerAction({
          username: formData.username,

          email: formData.email,

          password: formData.password,

          countryCode: formData.countryCode,

          phoneNo: formData.phoneNo,

          role: selectedRole,
        });

        if (!result.success) {
          setError(result.error);

          return;
        }

        setOtp("");
        setStep("OTP");

        return;
      }

      // ======================================================
      // VERIFY OTP
      // ======================================================

      if (step === "OTP") {
        const result = await verifyEmailServerAction(formData.email, otp);

        if (!result.success) {
          setError(result.error);

          return;
        }

        const role = result.user?.role;

        redirectByRole(role);

        return;
      }
    } catch (error) {
      console.error("Admin authentication error:", error);

      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleMode() {
    setError(null);

    setStep(step === "LOGIN" ? "REGISTER" : "LOGIN");
  }

  function backFromOtp() {
    setStep("REGISTER");
    setOtp("");
    setError(null);
  }

  const isLogin = step === "LOGIN";

  const isRegister = step === "REGISTER";

  const isOtp = step === "OTP";

  return (
    <main className="min-h-screen bg-[#eef2eb]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* ====================================================
            LEFT BRAND PANEL
        ==================================================== */}

        <section className="relative hidden overflow-hidden bg-[#202720] px-12 py-12 text-white lg:flex lg:flex-col">
          <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#dff37a]/10 blur-3xl" />

          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#74b69b]/10 blur-3xl" />

          {/* LOGO */}

          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
              Agriculture OS
            </p>

            <h1 className="mt-2 text-[42px] font-black tracking-[-0.08em]">
              agri<span className="text-[#dff37a]">.</span>
            </h1>
          </div>

          {/* HERO */}

          <div className="relative z-10 my-auto max-w-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dff37a] text-[#202720]">
              <ShieldCheck size={23} />
            </div>

            <h2 className="mt-7 text-[52px] font-semibold leading-[0.98] tracking-[-0.07em]">
              Operate your
              <br />
              device fleet.
            </h2>

            <p className="mt-6 max-w-md text-[13px] leading-6 text-white/45">
              Manage device models, physical hardware, capabilities, inventory,
              lifecycle and connected agriculture infrastructure from one
              control center.
            </p>

            <div className="mt-9 flex flex-wrap gap-2">
              {[
                "Device Models",
                "Hardware",
                "Telemetry",
                "Capabilities",
                "Fleet Control",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-medium text-white/50"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-[9px] text-white/25">
            Authorized administration only
          </p>
        </section>

        {/* ====================================================
            RIGHT AUTH PANEL
        ==================================================== */}

        <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8">
          <div className="w-full max-w-[430px]">
            {/* TOP */}

            <div className="mb-8">
              {isOtp && (
                <button
                  type="button"
                  onClick={backFromOtp}
                  className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f3ee] text-[#62695f]"
                >
                  <ArrowLeft size={16} />
                </button>
              )}

              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dff37a] text-[#263020]">
                  {step === "REGISTER" ? (
                    <User size={17} />
                  ) : step === "OTP" ? (
                    <KeyRound size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}
                </div>

                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#879084]">
                  Admin Portal
                </span>
              </div>

              <h1 className="mt-5 text-[38px] font-semibold tracking-[-0.07em] text-[#202720]">
                {isLogin && "Welcome back"}

                {isRegister && "Create your account"}

                {isOtp && "Verify your email"}
              </h1>

              <p className="mt-2 max-w-sm text-[11px] leading-5 text-[#929a90]">
                {isLogin && "Sign in to access the administration console."}

                {isRegister && "Create an authorized administration account."}

                {isOtp &&
                  `Enter the verification code sent to ${formData.email}.`}
              </p>
            </div>

            {/* ERROR */}

            {error && (
              <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[11px] font-medium text-red-600">
                {error}
              </div>
            )}

            {/* ROLE */}

            {!isOtp && (
              <div className="mb-5">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8d968b]">
                  Account type
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("ADMIN");
                      clearError();
                    }}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-[10px] font-semibold transition ${
                      selectedRole === "ADMIN"
                        ? "border-[#202720] bg-[#202720] text-white"
                        : "border-[#e5e9e2] bg-[#fafbf9] text-[#687067]"
                    }`}
                  >
                    <ShieldCheck size={15} />
                    Admin
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("SUPER_ADMIN");
                      clearError();
                    }}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-[10px] font-semibold transition ${
                      selectedRole === "SUPER_ADMIN"
                        ? "border-[#202720] bg-[#202720] text-white"
                        : "border-[#e5e9e2] bg-[#fafbf9] text-[#687067]"
                    }`}
                  >
                    <Crown size={15} />
                    Super Admin
                  </button>
                </div>
              </div>
            )}

            {/* FORM */}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* REGISTER USERNAME */}

              {isRegister && (
                <Input
                  icon={<User size={17} />}
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              )}

              {/* PHONE */}

              {isRegister && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <Input
                    icon={<Globe size={16} />}
                    name="countryCode"
                    placeholder="+91"
                    value={formData.countryCode}
                    onChange={handleChange}
                    required
                  />

                  <Input
                    icon={<Phone size={16} />}
                    name="phoneNo"
                    placeholder="Phone number"
                    value={formData.phoneNo}
                    onChange={handleChange}
                    autoComplete="tel"
                    required
                  />
                </div>
              )}

              {/* OTP */}

              {isOtp ? (
                <Input
                  icon={<KeyRound size={17} />}
                  name="otp"
                  placeholder="6-digit verification code"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);

                    setOtp(value);
                    clearError();
                  }}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  center
                />
              ) : (
                <>
                  {/* EMAIL */}

                  <Input
                    icon={<Mail size={17} />}
                    name="email"
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />

                  {/* PASSWORD */}

                  <Input
                    icon={<Lock size={17} />}
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                  />
                </>
              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={isLoading || (isOtp && otp.length !== 6)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#202720] py-4 text-[11px] font-bold text-white transition hover:bg-[#293128] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <>
                    {isLogin && "Sign in"}

                    {isRegister && "Create account"}

                    {isOtp && "Verify account"}

                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* MODE SWITCH */}

            {!isOtp && (
              <div className="mt-7 border-t border-[#edf0eb] pt-6 text-center">
                <p className="text-[10px] text-[#979f95]">
                  {isLogin
                    ? "Need an admin account?"
                    : "Already have an account?"}

                  <button
                    type="button"
                    onClick={toggleMode}
                    className="ml-1.5 font-bold text-[#202720] hover:underline"
                  >
                    {isLogin ? "Create one" : "Sign in"}
                  </button>
                </p>
              </div>
            )}

            {/* OTP FOOTER */}

            {isOtp && (
              <p className="mt-6 text-center text-[9px] leading-4 text-[#a2aaa0]">
                We use email verification to protect administration access.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

// ============================================================
// INPUT
// ============================================================

function Input({
  icon,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
  inputMode,
  maxLength,
  required,
  center = false,
}: {
  icon: React.ReactNode;
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  inputMode?:
    | "text"
    | "numeric"
    | "decimal"
    | "tel"
    | "email"
    | "url"
    | "search"
    | "none";
  maxLength?: number;
  required?: boolean;
  center?: boolean;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a1aaa0]">
        {icon}
      </div>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        className={`h-[54px] w-full rounded-2xl border border-[#e5e9e2] bg-[#fafbf9] pr-4 text-[11px] font-medium text-[#202720] outline-none transition focus:border-[#81945f] focus:bg-white focus:ring-4 focus:ring-[#dff37a]/20 ${
          center ? "pl-14 text-center tracking-[0.28em]" : "pl-11"
        }`}
      />
    </div>
  );
}
