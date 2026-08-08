"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Phone,
  Globe,
  ArrowRight,
  Loader2,
  KeyRound,
  ArrowLeft,
  ShieldCheck,
  Crown,
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

  // ---------------------------------------------------------
  // AUTH STEP
  // ---------------------------------------------------------

  const [step, setStep] = useState<AuthStep>("LOGIN");

  // ---------------------------------------------------------
  // ADMIN ROLE
  // ---------------------------------------------------------

  const [selectedRole, setSelectedRole] = useState<AdminRole>("ADMIN");

  // ---------------------------------------------------------
  // LOADING / ERROR
  // ---------------------------------------------------------

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // FORM DATA
  // ---------------------------------------------------------

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    countryCode: "+91",
    phoneNo: "",
  });

  const [otp, setOtp] = useState("");

  // ---------------------------------------------------------
  // CLEAR ERRORS
  // ---------------------------------------------------------

  const clearErrors = () => {
    setError(null);
  };

  // ---------------------------------------------------------
  // INPUT CHANGE
  // ---------------------------------------------------------

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      clearErrors();
    }
  };

  // ---------------------------------------------------------
  // REDIRECT BASED ON ROLE
  // ---------------------------------------------------------

  const redirectByRole = (role: string) => {
    if (role === "SUPER_ADMIN") {
      router.refresh();
      router.push("/superadmin");
      return;
    }

    if (role === "ADMIN") {
      router.refresh();
      router.push("/admin/dashboard");
      return;
    }

    // USER or unknown role
    setError("You do not have permission to access the admin portal.");
  };

  // ---------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    clearErrors();
    setIsLoading(true);

    try {
      // =====================================================
      // LOGIN
      // =====================================================

      if (step === "LOGIN") {
        const result = await loginServerAction(
          formData.email,
          formData.password,
        );

        if (!result.success) {
          setError(result.error);
          return;
        }

        /*
         * IMPORTANT:
         *
         * We do NOT trust selectedRole here.
         *
         * The backend/database role is the real role.
         */
        const actualRole = result.user?.role;

        if (actualRole !== "ADMIN" && actualRole !== "SUPER_ADMIN") {
          setError("This account does not have admin access.");
          return;
        }

        /*
         * Optional protection:
         *
         * If the user selected ADMIN but their actual
         * account is SUPERADMIN, still send them to the
         * correct dashboard.
         *
         * The database role always wins.
         */
        redirectByRole(actualRole);

        return;
      }

      // =====================================================
      // REGISTER
      // =====================================================

      if (step === "REGISTER") {
        /*
         * IMPORTANT:
         *
         * Do NOT blindly allow the browser to create a
         * SUPERADMIN account.
         *
         * Your backend should validate whether this user
         * is authorized to create an ADMIN/SUPERADMIN.
         *
         * This sends the selected role to the backend.
         * Your backend MUST validate it.
         */
        const result = await registerServerAction({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          countryCode: formData.countryCode,
          phoneNo: formData.phoneNo,

          // Admin registration role
          role: selectedRole,
        } as any);

        if (result.success) {
          setOtp("");
          setStep("OTP");
        } else {
          setError(result.error);
        }

        return;
      }

      // =====================================================
      // OTP
      // =====================================================

      if (step === "OTP") {
        const result = await verifyEmailServerAction(formData.email, otp);

        if (!result.success) {
          setError(result.error);
          return;
        }

        const actualRole = result.user?.role;

        if (actualRole !== "ADMIN" && actualRole !== "SUPER_ADMIN") {
          setError("This account does not have admin access.");
          return;
        }

        redirectByRole(actualRole);

        return;
      }
    } catch (err) {
      console.error("Admin authentication error:", err);

      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // TOGGLE LOGIN / REGISTER
  // ---------------------------------------------------------

  const toggleMode = () => {
    setStep(step === "LOGIN" ? "REGISTER" : "LOGIN");

    clearErrors();
  };

  // ---------------------------------------------------------
  // BACK FROM OTP
  // ---------------------------------------------------------

  const handleBackToRegister = () => {
    setStep("REGISTER");
    setOtp("");
    clearErrors();
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="relative mb-8 text-center">
          {/* Back button */}
          {step === "OTP" && (
            <button
              type="button"
              onClick={handleBackToRegister}
              className="
                absolute
                left-0
                top-1
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                text-gray-400
                transition-all
                hover:bg-gray-100
                hover:text-black
              "
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {/* Admin icon */}
          {step !== "OTP" && (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
              {selectedRole === "SUPER_ADMIN" ? (
                <Crown className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>
          )}

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            {step === "LOGIN" && "Admin Portal"}
            {step === "REGISTER" && "Create Admin Account"}
            {step === "OTP" && "Verify your email"}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {step === "LOGIN" && "Sign in to access the administration portal"}

            {step === "REGISTER" && "Create your administration account"}

            {step === "OTP" &&
              `We sent a verification code to ${formData.email}`}
          </p>
        </div>

        {/* =================================================
            ROLE SELECTOR
        ================================================= */}

        {step !== "OTP" && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Account type
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* ADMIN */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("ADMIN");
                  clearErrors();
                }}
                className={`
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  px-4
                  py-3
                  text-sm
                  font-medium
                  transition-all
                  ${
                    selectedRole === "ADMIN"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                  }
                `}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </button>

              {/* SUPERADMIN */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("SUPER_ADMIN");
                  clearErrors();
                }}
                className={`
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  px-4
                  py-3
                  text-sm
                  font-medium
                  transition-all
                  ${
                    selectedRole === "SUPER_ADMIN"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                  }
                `}
              >
                <Crown className="h-4 w-4" />
                Super Admin
              </button>
            </div>
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className="
              mb-6
              rounded-xl
              border
              border-red-100
              bg-red-50
              px-4
              py-3
              text-center
              text-sm
              text-red-600
            "
          >
            {error}
          </div>
        )}

        {/* =================================================
            FORM
        ================================================= */}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* =================================================
              OTP
          ================================================= */}

          {step === "OTP" ? (
            <div className="relative">
              <KeyRound
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
                type="text"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);

                  setOtp(value);

                  if (error) {
                    clearErrors();
                  }
                }}
                maxLength={6}
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
                  text-center
                  text-lg
                  font-medium
                  tracking-[0.35em]
                  outline-none
                  transition-all
                  placeholder:tracking-normal
                  placeholder:text-gray-400
                  focus:border-black
                  focus:bg-white
                  focus:ring-2
                  focus:ring-black/5
                "
              />
            </div>
          ) : (
            <>
              {/* =================================================
                  USERNAME - REGISTER
              ================================================= */}

              {step === "REGISTER" && (
                <div className="space-y-4">
                  <div className="relative">
                    <User
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
                      type="text"
                      name="username"
                      placeholder="Username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      autoComplete="username"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        py-2.5
                        pl-10
                        pr-4
                        outline-none
                        transition-all
                        placeholder:text-gray-400
                        focus:border-black
                        focus:bg-white
                        focus:ring-2
                        focus:ring-black/5
                      "
                    />
                  </div>

                  {/* PHONE */}

                  <div className="flex gap-3">
                    <div className="relative w-1/3">
                      <Globe
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
                        type="text"
                        name="countryCode"
                        placeholder="+91"
                        value={formData.countryCode}
                        onChange={handleChange}
                        required
                        className="
                          w-full
                          rounded-xl
                          border
                          border-gray-200
                          bg-gray-50
                          py-2.5
                          pl-10
                          pr-3
                          outline-none
                          transition-all
                          focus:border-black
                          focus:bg-white
                          focus:ring-2
                          focus:ring-black/5
                        "
                      />
                    </div>

                    <div className="relative w-2/3">
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
                        name="phoneNo"
                        placeholder="Phone Number"
                        value={formData.phoneNo}
                        onChange={handleChange}
                        required
                        autoComplete="tel"
                        className="
                          w-full
                          rounded-xl
                          border
                          border-gray-200
                          bg-gray-50
                          py-2.5
                          pl-10
                          pr-4
                          outline-none
                          transition-all
                          focus:border-black
                          focus:bg-white
                          focus:ring-2
                          focus:ring-black/5
                        "
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================
                  EMAIL
              ================================================= */}

              <div className="relative">
                <Mail
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
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    py-2.5
                    pl-10
                    pr-4
                    outline-none
                    transition-all
                    placeholder:text-gray-400
                    focus:border-black
                    focus:bg-white
                    focus:ring-2
                    focus:ring-black/5
                  "
                />
              </div>

              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div className="relative">
                <Lock
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
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete={
                    step === "LOGIN" ? "current-password" : "new-password"
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    py-2.5
                    pl-10
                    pr-4
                    outline-none
                    transition-all
                    placeholder:text-gray-400
                    focus:border-black
                    focus:bg-white
                    focus:ring-2
                    focus:ring-black/5
                  "
                />
              </div>
            </>
          )}

          {/* =================================================
              SUBMIT BUTTON
          ================================================= */}

          <button
            type="submit"
            disabled={isLoading || (step === "OTP" && otp.length !== 6)}
            className="
              mt-2
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-black
              py-2.5
              font-medium
              text-white
              transition-all
              hover:bg-gray-900
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-70
            "
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {step === "LOGIN" && "Admin Sign In"}
                {step === "REGISTER" && "Create Admin Account"}
                {step === "OTP" && "Verify & Continue"}

                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* =================================================
            LOGIN / REGISTER TOGGLE
        ================================================= */}

        {step !== "OTP" && (
          <div className="mt-8 text-center text-sm text-gray-500">
            {step === "LOGIN"
              ? "Don't have an account? "
              : "Already have an account? "}

            <button
              type="button"
              onClick={toggleMode}
              className="
                font-medium
                text-black
                hover:underline
                focus:outline-none
              "
            >
              {step === "LOGIN" ? "Register here" : "Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
