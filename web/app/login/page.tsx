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
} from "lucide-react";

import {
  loginServerAction,
  registerServerAction,
  verifyEmailServerAction,
} from "../actions/auth";

type AuthStep = "LOGIN" | "REGISTER" | "OTP";

export default function AuthPage() {
  const router = useRouter();

  // ---------------------------------------------------------
  // AUTH STEP
  // ---------------------------------------------------------

  const [step, setStep] = useState<AuthStep>("LOGIN");

  // ---------------------------------------------------------
  // LOADING / ERROR STATES
  // ---------------------------------------------------------

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // FORM STATES
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
  // FORM SUBMIT
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

        if (result.success) {
          /*
           * Refresh Next.js so server components
           * receive the newly-created authentication cookie.
           */
          router.refresh();

          /*
           * Move the user to the authenticated area.
           */
          router.push("/home");
        } else {
          setError(result.error);
        }

        return;
      }

      // =====================================================
      // REGISTER
      // =====================================================

      if (step === "REGISTER") {
        const result = await registerServerAction({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          countryCode: formData.countryCode,
          phoneNo: formData.phoneNo,
          role: "USER",
        });

        if (result.success) {
          /*
           * Registration succeeded.
           *
           * Backend has created the user and
           * sent the OTP email.
           */
          setOtp("");
          setStep("OTP");
        } else {
          setError(result.error);
        }

        return;
      }

      // =====================================================
      // OTP VERIFICATION
      // =====================================================

      if (step === "OTP") {
        const result = await verifyEmailServerAction(formData.email, otp);

        if (result.success) {
          /*
           * The Server Action has already captured
           * the refreshToken cookie from Express.
           */
          router.refresh();

          router.push("/home");
        } else {
          setError(result.error);
        }

        return;
      }
    } catch (err) {
      console.error("Authentication error:", err);

      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // LOGIN <-> REGISTER
  // ---------------------------------------------------------

  const toggleMode = () => {
    setStep(step === "LOGIN" ? "REGISTER" : "LOGIN");

    clearErrors();
  };

  // ---------------------------------------------------------
  // BACK TO REGISTER FROM OTP
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
        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="relative mb-20 text-center">
          {/* Back button on OTP */}
          {step === "OTP" && (
            <button
              type="button"
              onClick={handleBackToRegister}
              className="
                absolute
                left-0
                top-1
                flex
                items-center
                justify-center
                h-9
                w-9
                rounded-lg
                text-gray-400
                hover:text-black
                hover:bg-gray-100
                transition-all
              "
              aria-label="Back to registration"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {/* Title */}
          <h1 className="text-6xl font-semibold tracking-tight text-green-900 text-left">
            {step === "LOGIN" && "Welcome back"}
            {step === "REGISTER" && "Create an account"}
            {step === "OTP" && "Verify your email"}
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-sm text-gray-500 text-left">
            {step === "LOGIN" && "Enter your details to access your account"}

            {step === "REGISTER" && "Fill in your details to get started"}

            {step === "OTP" && `We sent a code to ${formData.email}`}
          </p>
        </div>

        {/* ===================================================
            ERROR MESSAGE
        =================================================== */}

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

        {/* ===================================================
            FORM
        =================================================== */}

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
                  /*
                   * Only allow numbers.
                   */
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
              {/* =============================================
                  REGISTER ONLY FIELDS
              ============================================= */}

              {step === "REGISTER" && (
                <div className="space-y-4">
                  {/* Username */}
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

                  {/* Country Code + Phone */}
                  <div className="flex gap-3">
                    {/* Country Code */}
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
                          placeholder:text-gray-400
                          focus:border-black
                          focus:bg-white
                          focus:ring-2
                          focus:ring-black/5
                        "
                      />
                    </div>

                    {/* Phone Number */}
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
                          placeholder:text-gray-400
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

              {/* =============================================
                  EMAIL
              ============================================= */}

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

              {/* =============================================
                  PASSWORD
              ============================================= */}

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
                {step === "LOGIN" && "Sign In"}
                {step === "REGISTER" && "Create Account"}
                {step === "OTP" && "Verify & Continue"}

                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* ===================================================
            LOGIN / REGISTER TOGGLE
        =================================================== */}

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
