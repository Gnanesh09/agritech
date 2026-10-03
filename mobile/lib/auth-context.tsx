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

  setSession: (accessToken: string, user: User) => Promise<void>;

  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await getAccessToken();

      if (!token) {
        setUser(null);
        setAccessToken(null);
        return;
      }

      setAccessToken(token);

      const data = await apiRequest("/auth/get-me");

      if (!data?.user) {
        throw new Error("Invalid user session.");
      }

      setUser(data.user);
    } catch (error) {
      console.log("[AUTH] Session restore failed:", error);

      await removeAccessToken();

      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      skipRefresh: true,
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    if (!data?.accessToken || !data?.user) {
      throw new Error("Login succeeded but session data was not returned.");
    }

    await setSession(data.accessToken, data.user);
  }

  async function setSession(token: string, authenticatedUser: User) {
    await saveAccessToken(token);

    setAccessToken(token);
    setUser(authenticatedUser);
  }

  async function logout() {
    try {
      await apiRequest("/auth/logout");
    } catch (error) {
      console.log("[AUTH] Logout API error:", error);
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
        setSession,
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
