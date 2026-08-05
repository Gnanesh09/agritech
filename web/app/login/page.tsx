"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // 1. IMPORT ROUTER
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

import { useAuth } from "../hooks/useAuth";
import { loginServerAction } from "../actions/auth"; // 2. IMPORT ACTION

type AuthStep = "LOGIN" | "REGISTER" | "OTP";

export default function AuthPage() {
  const router = useRouter(); // 3. INITIALIZE ROUTER
  const [step, setStep] = useState<AuthStep>("LOGIN");

  // Keep register and verifyOtp from your hook
  const {
    register,
    verifyOtp,
    isLoading: authLoading,
    error: authError,
    setError: setAuthError,
  } = useAuth();

  // Local state specifically for the Server Action Login
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    countryCode: "+91",
    phoneNo: "",
  });
  const [otp, setOtp] = useState("");

  // Unified Loading & Error State for the UI
  const isLoading = authLoading || loginLoading;
  const error = loginError || authError;

  const clearErrors = () => {
    setLoginError(null);
    if (setAuthError) setAuthError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === "LOGIN") {
      // 4. USE THE SERVER ACTION WITH SAFE ROUTING
      setLoginLoading(true);
      setLoginError(null);

      const result = await loginServerAction(formData.email, formData.password);

      if (result.success) {
        router.refresh(); // Syncs the new cookie with the Next.js router
        router.push("/home"); // Safely transitions without crashing!
      } else {
        setLoginError(result.error);
        setLoginLoading(false);
      }
    } else if (step === "REGISTER") {
      const success = await register(formData);
      if (success) {
        setStep("OTP");
      }
    } else if (step === "OTP") {
      await verifyOtp(formData.email, otp);
    }
  };

  const toggleMode = () => {
    setStep(step === "LOGIN" ? "REGISTER" : "LOGIN");
    clearErrors();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 transition-all">
        {/* Header */}
        <div className="text-center mb-8 relative">
          {step === "OTP" && (
            <button
              onClick={() => setStep("REGISTER")}
              className="absolute left-0 top-1 text-gray-400 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {step === "LOGIN" && "Welcome back"}
            {step === "REGISTER" && "Create an account"}
            {step === "OTP" && "Verify your email"}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {step === "LOGIN" && "Enter your details to access your account"}
            {step === "REGISTER" && "Fill in your details to get started"}
            {step === "OTP" && `We sent a code to ${formData.email}`}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === "OTP" ? (
            /* OTP Input Field */
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="otp"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (error) clearErrors();
                }}
                maxLength={6}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all tracking-widest text-center text-lg font-medium"
              />
            </div>
          ) : (
            /* Standard Login / Register Fields */
            <>
              {step === "REGISTER" && (
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="username"
                      placeholder="Username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="relative w-1/3">
                      <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="countryCode"
                        placeholder="+91"
                        value={formData.countryCode}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                      />
                    </div>
                    <div className="relative w-2/3">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phoneNo"
                        placeholder="Phone Number"
                        value={formData.phoneNo}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                />
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-black text-white py-2.5 rounded-xl font-medium hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

        {/* Toggle View (Hidden on OTP step) */}
        {step !== "OTP" && (
          <div className="mt-8 text-center text-sm text-gray-500">
            {step === "LOGIN"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-black hover:underline focus:outline-none"
            >
              {step === "LOGIN" ? "Register here" : "Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
