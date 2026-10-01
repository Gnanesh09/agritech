import React, { createContext, useContext, useEffect, useState } from "react";

import { apiRequest } from "./api";

import {
  getAccessToken,
  removeAccessToken,
  saveAccessToken,
} from "./auth-storage";

type User = {
  id: string;
  username: string;
  email: string;
  verified?: boolean;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session when app starts
  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await getAccessToken();

      if (!token) {
        setAccessToken(null);
        setUser(null);
        return;
      }

      // Keep token available to the rest of the app
      setAccessToken(token);

      const data = await apiRequest("/auth/get-me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(data.user);
    } catch (error) {
      console.log("Session restore failed:", error);

      await removeAccessToken();

      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    await saveAccessToken(data.accessToken);

    // Keep token in memory
    setAccessToken(data.accessToken);

    setUser(data.user);
  }

  async function logout() {
    try {
      const token = await getAccessToken();

      if (token) {
        await apiRequest("/auth/logout", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.log("Logout API error:", error);
    } finally {
      await removeAccessToken();

      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
