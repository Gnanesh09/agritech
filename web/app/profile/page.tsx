"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Loader2,
  ArrowLeft,
  Mail,
  User as UserIcon,
} from "lucide-react";
import api from "../lib/axios";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<{
    username: string;
    email: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const refreshRes = await api.get("/auth/refresh-token");
        const accessToken = refreshRes.data.accessToken;

        const userRes = await api.get("/auth/get-me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        setUserData(userRes.data.user);
      } catch (error) {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.get("/auth/logout");
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/home"
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex items-center gap-4">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
              <UserIcon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                My Profile
              </h2>
              <p className="text-sm text-gray-500">
                Manage your account information
              </p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Username
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-900 font-medium">
                  {userData?.username}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <Mail className="h-5 w-5 text-gray-400" />
                <span className="text-gray-900 font-medium">
                  {userData?.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
