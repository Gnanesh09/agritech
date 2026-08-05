import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/axios"; // Adjust this path to where your axios instance is saved
export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post("/auth/login", credentials);
      router.push("/home");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post("/auth/register", {
        ...userData,
        role: "USER",
      });
      // Return true to tell the UI to switch to the OTP screen
      return true;
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Assuming your backend expects { email, otp } for verification
      await api.post("/auth/verify-email", { email, otp });
      router.push("/home");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid verification code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { login, register, verifyOtp, isLoading, error, setError };
};