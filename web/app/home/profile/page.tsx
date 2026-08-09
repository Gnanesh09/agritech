"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Pencil,
  ChevronRight,
  Smartphone,
  ShieldCheck,
  LogOut,
  CircleHelp,
  FileText,
  Lock,
  X,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

import api, { setAccessToken, clearAccessToken } from "../../lib/axios";
import { useRouter } from "next/navigation";

type UserData = {
  id: string;
  username: string;
  email: string;
  countryCode: string | null;
  phoneNo: string | null;
  role: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [username, setUsername] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phoneNo, setPhoneNo] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // LOAD PROFILE
  // --------------------------------------------------

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        // Refresh access token using httpOnly refresh cookie
        const refreshRes = await api.get("/auth/refresh-token");

        const accessToken = refreshRes.data.accessToken;

        setAccessToken(accessToken);

        // Get authenticated user
        const response = await api.get("/user/profile");

        const profile = response.data.user;

        setUser(profile);

        setUsername(profile.username || "");
        setCountryCode(profile.countryCode || "");
        setPhoneNo(profile.phoneNo || "");
      } catch (err: any) {
        console.error("Profile error:", err);

        setError(
          err?.response?.data?.message || "Unable to load your profile.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // --------------------------------------------------
  // OPEN EDIT
  // --------------------------------------------------

  function openEdit() {
    if (!user) return;

    setUsername(user.username || "");
    setCountryCode(user.countryCode || "");
    setPhoneNo(user.phoneNo || "");

    setError("");
    setEditOpen(true);
  }

  // --------------------------------------------------
  // SAVE CLICK
  // --------------------------------------------------

  function handleSaveClick() {
    setError("");

    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    setConfirmOpen(true);
  }

  // --------------------------------------------------
  // CONFIRM UPDATE
  // --------------------------------------------------

  async function confirmUpdate() {
    try {
      setSaving(true);
      setError("");

      const response = await api.patch("/user/profile", {
        username: username.trim(),
        countryCode: countryCode.trim(),
        phoneNo: phoneNo.trim(),
      });

      setUser(response.data.user);

      setConfirmOpen(false);
      setEditOpen(false);

      setSuccess("Profile updated successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error("Profile update error:", err);

      setConfirmOpen(false);

      setError(
        err?.response?.data?.message || "Unable to update your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await api.get("/auth/logout");

      clearAccessToken();

      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>

          <p className="mt-4 text-sm text-gray-500">
            {error || "Unable to load your profile."}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#f5f7fa] px-3 pb-28 pt-5 sm:px-5">
        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="px-1">
          <h1 className="text-[25px] font-bold tracking-tight text-gray-900">
            Profile
          </h1>

          <p className="mt-1 text-[13px] text-gray-400">
            Manage your account and preferences
          </p>
        </div>

        {/* ==========================================
            SUCCESS
        ========================================== */}

        {success && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500">
              <Check className="h-4 w-4 text-white" />
            </div>

            <span className="text-sm font-medium text-green-700">
              {success}
            </span>
          </div>
        )}

        {/* ==========================================
            PROFILE HEADER CARD
        ========================================== */}

        <section className="mt-6 rounded-[22px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.035)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-blue-50">
              <span className="text-xl font-bold text-blue-600">
                {user.username?.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[17px] font-semibold text-gray-900">
                  {user.username}
                </h2>

                {user.verified && (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" />
                )}
              </div>

              <p className="mt-1 truncate text-[13px] text-gray-400">
                {user.email}
              </p>
            </div>

            <button
              onClick={openEdit}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition active:scale-95"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* ==========================================
            INFO
        ========================================== */}

        <SectionTitle title="INFO" />

        <section className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <InfoRow
            icon={<User className="h-[17px] w-[17px]" />}
            label="Name"
            value={user.username}
          />

          <Divider />

          <InfoRow
            icon={<Mail className="h-[17px] w-[17px]" />}
            label="Email"
            value={user.email}
          />

          <Divider />

          <InfoRow
            icon={<Phone className="h-[17px] w-[17px]" />}
            label="Phone"
            value={
              user.phoneNo
                ? `${user.countryCode || ""} ${user.phoneNo}`
                : "Not added"
            }
          />
        </section>

        {/* ==========================================
            PLAN / UPGRADE
        ========================================== */}

        <section className="mt-4 overflow-hidden rounded-[20px] bg-gradient-to-br from-white to-blue-50 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Upgrade your experience
                </h3>

                <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  PRO
                </span>
              </div>

              <p className="mt-1 max-w-[250px] text-[11px] leading-4 text-gray-400">
                Unlock advanced features and get more from your devices.
              </p>
            </div>
          </div>

          <button className="mt-4 flex py-5 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-[13px] font-semibold text-white shadow-sm transition active:scale-[0.98]">
            Upgrade
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        {/* ==========================================
            APP
        ========================================== */}

        <SectionTitle title="APP" />

        <section className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <button
            onClick={() => {}}
            className="flex w-full items-center justify-between px-4 py-4 text-left transition active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Smartphone className="h-4 w-4 text-blue-600" />
              </div>

              <div>
                <p className="text-[13px] font-medium text-gray-800">
                  My Devices
                </p>

                <p className="mt-0.5 text-[10px] text-gray-400">
                  Manage connected devices
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>

          <Divider />

          <button className="flex w-full items-center justify-between px-4 py-4 text-left transition active:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
                <Lock className="h-4 w-4 text-gray-500" />
              </div>

              <div>
                <p className="text-[13px] font-medium text-gray-800">
                  Privacy & Security
                </p>

                <p className="mt-0.5 text-[10px] text-gray-400">
                  Manage account security
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
        </section>

        {/* ==========================================
            ABOUT
        ========================================== */}

        <SectionTitle title="ABOUT" />

        <section className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <SettingsRow
            icon={<CircleHelp className="h-[17px] w-[17px]" />}
            label="Report a Problem"
          />

          <Divider />

          <SettingsRow
            icon={<FileText className="h-[17px] w-[17px]" />}
            label="Terms of Use"
          />

          <Divider />

          <SettingsRow
            icon={<ShieldCheck className="h-[17px] w-[17px]" />}
            label="Privacy Policy"
          />
        </section>

        {/* ==========================================
            LOGOUT
        ========================================== */}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-6 flex py-5 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 text-sm border-red-500 border-1 font-semibold text-red-500 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition active:scale-[0.99] disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}

          {loggingOut ? "Signing out..." : "Sign out"}
        </button>

        <p className="mt-5 text-center text-[10px] text-gray-300">
          Account · {user.role}
        </p>
      </div>

      {/* ============================================
          EDIT PROFILE SHEET
      ============================================ */}

      {editOpen && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[2px]">
          <div
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-[28px] bg-white p-5 shadow-2xl"
            style={{
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Sheet header */}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[19px] font-bold text-gray-900">
                  Edit profile
                </h2>

                <p className="mt-1 text-[12px] text-gray-400">
                  Update your account information
                </p>
              </div>

              <button
                onClick={() => setEditOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}

            <div className="mt-6 space-y-4">
              <EditField
                label="Username"
                value={username}
                onChange={setUsername}
                icon={<User className="h-4 w-4" />}
              />

              <EditField
                label="Country code"
                value={countryCode}
                onChange={setCountryCode}
                placeholder="+91"
                icon={<Phone className="h-4 w-4" />}
              />

              <EditField
                label="Phone number"
                value={phoneNo}
                onChange={setPhoneNo}
                placeholder="Phone number"
                icon={<Phone className="h-4 w-4" />}
              />
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600">
                {error}
              </div>
            )}

            {/* Save */}

            <button
              onClick={handleSaveClick}
              className="mt-6 h-12 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              Review changes
            </button>
          </div>
        </div>
      )}

      {/* ============================================
          CONFIRMATION MODAL
      ============================================ */}

      {confirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-5 backdrop-blur-sm">
          <div className="w-full max-w-[390px] rounded-[25px] bg-white p-5 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Check className="h-6 w-6 text-blue-600" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-gray-900">
              Save changes?
            </h2>

            <p className="mt-2 text-[13px] leading-5 text-gray-500">
              You're about to update your profile information. Please confirm
              that the details are correct.
            </p>

            {/* Change preview */}

            <div className="mt-4 rounded-2xl bg-gray-50 p-3">
              <ChangePreview label="Username" value={username} />

              <ChangePreview
                label="Phone"
                value={phoneNo ? `${countryCode} ${phoneNo}` : "Not added"}
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="h-11 flex-1 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>

              <button
                onClick={confirmUpdate}
                disabled={saving}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ==================================================
   COMPONENTS
================================================== */

function SectionTitle({ title }: { title: string }) {
  return (
    <p className="mb-2 mt-6 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
      {title}
    </p>
  );
}

function Divider() {
  return <div className="ml-[60px] h-px bg-gray-100" />;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400">{label}</p>

        <p className="mt-0.5 truncate text-[13px] font-medium text-gray-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-gray-50">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
        {icon}
      </div>

      <span className="flex-1 text-[13px] font-medium text-gray-800">
        {label}
      </span>

      <ChevronRight className="h-4 w-4 text-gray-300" />
    </button>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-gray-500">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 transition focus-within:border-blue-500 focus-within:bg-white">
        <span className="text-gray-400">{icon}</span>

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-300"
        />
      </div>
    </div>
  );
}

function ChangePreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-gray-400">{label}</span>

      <span className="max-w-[200px] truncate text-[12px] font-medium text-gray-800">
        {value || "Not added"}
      </span>
    </div>
  );
}
