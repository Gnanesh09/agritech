"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

import { loginServerAction } from "../actions/auth";
import { setAccessToken } from "../lib/axios";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      const result = await loginServerAction(email, password);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // ==========================================
      // STORE ACCESS TOKEN IN MEMORY
      // ==========================================

      if (result.accessToken) {
        setAccessToken(result.accessToken);
      }

      // ==========================================
      // REFRESH SERVER COMPONENTS
      // ==========================================

      router.refresh();

      // ==========================================
      // GO TO AUTHENTICATED AREA
      // ==========================================

      router.push("/home");
    } catch (error) {
      console.error("Login error:", error);

      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
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

        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* FORM */}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL */}

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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="Email address"
              autoComplete="email"
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
                                transition-all
                                placeholder:text-gray-400
                                focus:border-black
                                focus:bg-white
                                focus:ring-2
                                focus:ring-black/5
                            "
            />
          </div>

          {/* PASSWORD */}

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
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              autoComplete="current-password"
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
                                transition-all
                                placeholder:text-gray-400
                                focus:border-black
                                focus:bg-white
                                focus:ring-2
                                focus:ring-black/5
                            "
            />
          </div>

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={isLoading}
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
                            transition-all
                            hover:bg-gray-900
                            active:scale-[0.98]
                            disabled:cursor-not-allowed
                            disabled:opacity-70
                        "
          >
            {isLoading ? (
              <Loader2
                className="
                                    h-5
                                    w-5
                                    animate-spin
                                "
              />
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* REGISTER */}

        <div className="mt-8 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/auth?mode=register")}
            className="
                            font-medium
                            text-black
                            hover:underline
                        "
          >
            Register here
          </button>
        </div>
      </div>
    </main>
  );
}
