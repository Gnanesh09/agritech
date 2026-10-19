import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";

import { apiRequest } from "../../lib/api";

import { useAuth } from "../../lib/auth-context";

import AppText from "@/components/ui/AppText";

type User = {
  id: string;

  username: string;

  email: string;

  countryCode?: string | null;

  phoneNo?: string | null;

  role?: string;

  verified?: boolean;

  createdAt?: string;

  updatedAt?: string;
};

type Sheet = "profile" | "settings" | "security" | "terms" | null;

export default function ProfileScreen() {
  const { logout } = useAuth();

  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [sheet, setSheet] = useState<Sheet>(null);

  const [username, setUsername] = useState("");

  const [phoneNo, setPhoneNo] = useState("");

  const [countryCode, setCountryCode] = useState("");

  const [notifications, setNotifications] = useState(true);

  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const data = await apiRequest("/user/profile");

      setUser(data.user);

      setUsername(data.user.username ?? "");

      setPhoneNo(data.user.phoneNo ?? "");

      setCountryCode(data.user.countryCode ?? "");
    } catch (error: any) {
      console.error("Profile load error:", error);

      Alert.alert(
        "Unable to load profile",

        error?.message || "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Username required", "Please enter a username.");

      return;
    }

    try {
      setSaving(true);

      const data = await apiRequest("/user/profile", {
        method: "PATCH",

        body: JSON.stringify({
          username: username.trim(),

          phoneNo: phoneNo.trim(),

          countryCode: countryCode.trim(),
        }),
      });

      setUser(data.user);

      setUsername(data.user.username ?? "");

      setPhoneNo(data.user.phoneNo ?? "");

      setCountryCode(data.user.countryCode ?? "");

      setSheet(null);

      Alert.alert(
        "Profile updated",

        "Your profile has been saved successfully.",
      );
    } catch (error: any) {
      Alert.alert(
        "Update failed",

        error?.message || "Unable to update your profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      {
        text: "Cancel",

        style: "cancel",
      },

      {
        text: "Log out",

        style: "destructive",

        onPress: async () => {
          try {
            await logout();
          } finally {
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      "Log out everywhere",

      "This will sign you out from all active sessions.",

      [
        {
          text: "Cancel",

          style: "cancel",
        },

        {
          text: "Continue",

          style: "destructive",

          onPress: async () => {
            try {
              await apiRequest("/auth/logout-all");
            } catch (error: any) {
              console.error("Logout all error:", error);
            } finally {
              await logout();

              router.replace("/(auth)/login");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#E7EF58" />
        </View>
      </SafeAreaView>
    );
  }

  const initials =
    user?.username?.slice(0, 1)?.toUpperCase() ||
    user?.email?.slice(0, 1)?.toUpperCase() ||
    "U";

  return (
    <SafeAreaView className="flex-1 bg-[#000000]">
      <ScrollView
        showsVerticalScrollIndicator={false}

        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <View className="px-6 pt-5">
          {/* HEADER */}

          <AppText
            weight="semibold"

            className="text-[34px]  tracking-[-1.2px] text-white"
          >
            Profile
          </AppText>

          <AppText className="mt-1 text-[15px] text-zinc-500">
            Your account
          </AppText>

          {/* USER */}

          <View className="mt-8 flex-row items-center">
            <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-primary">
              <AppText className="text-[22px] font-bold text-black">
                {initials}
              </AppText>
            </View>

            <View className="ml-4 flex-1">
              <AppText
                numberOfLines={1}

                className="text-[20px] font-semibold text-white"
              >
                {user?.username || "User"}
              </AppText>

              <AppText
                numberOfLines={1}

                className="mt-1 text-[14px] text-zinc-500"
              >
                {user?.email}
              </AppText>
            </View>
          </View>

          {/* ACCOUNT */}

          <View className="mt-10">
            <AppText className="mb-3 px-1 text-[13px] font-medium uppercase tracking-[1px] text-zinc-500">
              Account
            </AppText>

            <View className="overflow-hidden rounded-[18px] bg-primaryDark1">
              <Pressable
                onPress={() => setSheet("profile")}

                className="flex-row items-center justify-between px-5 py-[19px] active:bg-zinc-900"
              >
                <View>
                  <AppText className="text-[17px] text-white">
                    Personal Information
                  </AppText>

                  <AppText className="mt-1 text-[13px] text-zinc-500">
                    Edit your account details
                  </AppText>
                </View>

                <AppText className="text-[28px] font-light text-zinc-600">
                  ›
                </AppText>
              </Pressable>

              <View className="ml-5 h-px bg-zinc-900" />

              <Pressable
                onPress={() => setSheet("settings")}

                className="flex-row items-center justify-between px-5 py-[19px] active:bg-zinc-900"
              >
                <AppText className="text-[17px] text-white">Settings</AppText>

                <AppText className="text-[28px] font-light text-zinc-600">
                  ›
                </AppText>
              </Pressable>

              <View className="ml-5 h-px bg-zinc-900" />

              <Pressable
                onPress={() => setSheet("security")}

                className="flex-row items-center justify-between px-5 py-[19px] active:bg-zinc-900"
              >
                <AppText className="text-[17px] text-white">Security</AppText>

                <AppText className="text-[28px] font-light text-zinc-600">
                  ›
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* HISTORY */}
          <View className="mt-8">
            <AppText className="mb-3 px-1 text-[13px] font-medium uppercase tracking-[1px] text-zinc-500">
              History
            </AppText>

            <View className="overflow-hidden rounded-[18px] bg-primaryDark1">
              <Pressable
                onPress={() => router.push("/cropHistory")}
                className="flex-row items-center justify-between px-5 py-[19px] active:bg-zinc-900"
                accessibilityRole="button"
                accessibilityLabel="Open crop history"
              >
                <View className="flex-1 pr-3">
                  <AppText className="text-[17px] text-white">
                    Crop History
                  </AppText>
                  <AppText className="mt-1 text-[13px] text-zinc-500">
                    View your planting and harvest records
                  </AppText>
                </View>

                <AppText className="text-[28px] font-light text-zinc-600">
                  ›
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* LEGAL */}

          <View className="mt-8">
            <AppText className="mb-3 px-1 text-[13px] font-medium uppercase tracking-[1px] text-zinc-500">
              Legal
            </AppText>

            <View className="overflow-hidden rounded-[18px] bg-primaryDark1">
              <Pressable
                onPress={() => setSheet("terms")}

                className="flex-row items-center justify-between px-5 py-[19px] active:bg-zinc-900"
              >
                <AppText className="text-[17px] text-white">
                  Terms & Conditions
                </AppText>

                <AppText className="text-[28px] font-light text-zinc-600">
                  ›
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* LOGOUT */}

          <Pressable
            onPress={handleLogout}

            className="mt-10 items-center py-4 active:opacity-60"
          >
            <AppText className="text-[17px] font-medium text-red-500">
              Log out
            </AppText>
          </Pressable>

          <AppText className="mt-5 text-center text-[12px] text-zinc-700">
            {user?.role ? user.role : "Account"}
          </AppText>
        </View>
      </ScrollView>

      {/* PERSONAL INFORMATION */}

      <Modal
        visible={sheet === "profile"}

        animationType="slide"

        transparent

        onRequestClose={() => setSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-[28px] bg-[#0D0D0D] px-6 pb-10 pt-5">
            <View className="mb-6 flex-row items-center justify-between">
              <AppText className="text-[28px] font-bold text-white">
                Personal Information
              </AppText>

              <Pressable
                onPress={() => setSheet(null)}

                className="h-9 w-9 items-center justify-center rounded-full bg-zinc-900"
              >
                <AppText className="text-[20px] text-zinc-400">×</AppText>
              </Pressable>
            </View>

            <AppText className="mb-2 text-[13px] text-zinc-500">Email</AppText>

            <View className="mb-5 rounded-2xl bg-[#151515] px-4 py-4">
              <AppText className="text-[16px] text-zinc-400">
                {user?.email}
              </AppText>
            </View>

            <AppText className="mb-2 text-[13px] text-zinc-500">
              Username
            </AppText>

            <TextInput
              value={username}

              onChangeText={setUsername}

              autoCapitalize="none"

              placeholder="Username"

              placeholderTextColor="#525252"

              className="mb-5 rounded-2xl bg-[#151515] px-4 py-4 text-[16px] text-white"
            />

            <AppText className="mb-2 text-[13px] text-zinc-500">
              Country code
            </AppText>

            <TextInput
              value={countryCode}

              onChangeText={setCountryCode}

              placeholder="+91"

              placeholderTextColor="#525252"

              className="mb-5 rounded-2xl bg-[#151515] px-4 py-4 text-[16px] text-white"
            />

            <AppText className="mb-2 text-[13px] text-zinc-500">
              Phone number
            </AppText>

            <TextInput
              value={phoneNo}

              onChangeText={setPhoneNo}

              keyboardType="phone-pad"

              placeholder="Phone number"

              placeholderTextColor="#525252"

              className="rounded-2xl bg-[#151515] px-4 py-4 text-[16px] text-white"
            />

            <Pressable
              onPress={saveProfile}

              disabled={saving}

              className="mt-7 h-[56px] items-center justify-center rounded-2xl bg-[#E7EF58] active:opacity-80"
            >
              {saving ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <AppText className="text-[17px] font-semibold text-black">
                  Save Changes
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* SETTINGS */}

      <Modal
        visible={sheet === "settings"}

        animationType="slide"

        transparent

        onRequestClose={() => setSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-[28px] bg-[#0D0D0D] px-6 pb-10 pt-5">
            <View className="mb-7 flex-row items-center justify-between">
              <AppText className="text-[28px] font-bold text-white">
                Settings
              </AppText>

              <Pressable
                onPress={() => setSheet(null)}

                className="h-9 w-9 items-center justify-center rounded-full bg-zinc-900"
              >
                <AppText className="text-[20px] text-zinc-400">×</AppText>
              </Pressable>
            </View>

            <View className="overflow-hidden rounded-2xl bg-[#151515]">
              <View className="flex-row items-center justify-between px-5 py-[18px]">
                <View>
                  <AppText className="text-[17px] text-white">
                    Notifications
                  </AppText>

                  <AppText className="mt-1 text-[13px] text-zinc-500">
                    Receive important updates
                  </AppText>
                </View>

                <Switch
                  value={notifications}

                  onValueChange={setNotifications}

                  trackColor={{
                    false: "#303030",

                    true: "#E7EF58",
                  }}

                  thumbColor={notifications ? "#000000" : "#A0A0A0"}
                />
              </View>

              <View className="ml-5 h-px bg-zinc-800" />

              <View className="flex-row items-center justify-between px-5 py-[18px]">
                <View>
                  <AppText className="text-[17px] text-white">
                    Auto refresh
                  </AppText>

                  <AppText className="mt-1 text-[13px] text-zinc-500">
                    Keep device data updated
                  </AppText>
                </View>

                <Switch
                  value={autoRefresh}

                  onValueChange={setAutoRefresh}

                  trackColor={{
                    false: "#303030",

                    true: "#E7EF58",
                  }}

                  thumbColor={autoRefresh ? "#000000" : "#A0A0A0"}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* SECURITY */}

      <Modal
        visible={sheet === "security"}

        animationType="slide"

        transparent

        onRequestClose={() => setSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-[28px] bg-[#0D0D0D] px-6 pb-10 pt-5">
            <View className="mb-7 flex-row items-center justify-between">
              <AppText className="text-[28px] font-bold text-white">
                Security
              </AppText>

              <Pressable
                onPress={() => setSheet(null)}

                className="h-9 w-9 items-center justify-center rounded-full bg-zinc-900"
              >
                <AppText className="text-[20px] text-zinc-400">×</AppText>
              </Pressable>
            </View>

            <View className="rounded-2xl bg-[#151515] px-5 py-5">
              <AppText className="text-[15px] text-zinc-500">
                Signed in as
              </AppText>

              <AppText className="mt-1 text-[17px] text-white">
                {user?.email}
              </AppText>

              <View className="mt-5 flex-row items-center">
                <View className="h-2 w-2 rounded-full bg-[#E7EF58]" />

                <AppText className="ml-2 text-[14px] text-zinc-400">
                  {user?.verified ? "Email verified" : "Email not verified"}
                </AppText>
              </View>
            </View>

            <Pressable
              onPress={handleLogoutAll}

              className="mt-5 h-[54px] items-center justify-center rounded-2xl bg-red-500/10"
            >
              <AppText className="text-[16px] font-medium text-red-500">
                Log out of all devices
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* TERMS */}

      <Modal
        visible={sheet === "terms"}

        animationType="slide"

        transparent

        onRequestClose={() => setSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[85%] rounded-t-[28px] bg-[#0D0D0D] px-6 pb-10 pt-5">
            <View className="mb-6 flex-row items-center justify-between">
              <AppText weight="bold" className="text-[28px]  text-white">
                Terms & Conditions
              </AppText>

              <Pressable
                onPress={() => setSheet(null)}

                className="h-9 w-9 items-center justify-center rounded-full bg-zinc-900"
              >
                <AppText className="text-[20px] text-zinc-400">×</AppText>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppText className="text-[15px] leading-7 text-zinc-400">
                By using this application, you agree to use the service
                responsibly and provide accurate account information.
                {"\n\n"}
                Device information and account data may be processed to provide
                the application services.
                {"\n\n"}
                You are responsible for keeping your account credentials secure.
                {"\n\n"}
                Service availability may depend on your internet connection,
                device connectivity, and backend availability.
                {"\n\n"}
                Continued use of the application means you accept the applicable
                terms and future updates to these terms.
              </AppText>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
