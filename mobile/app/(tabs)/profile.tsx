import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type User = {
  id: string;
  username: string;
  email: string;
  countryCode?: string;
  phoneNo?: string;
  role?: string;
  verified?: boolean;
};

export default function ProfileScreen() {
  const { accessToken, logout } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [phoneNo, setPhoneNo] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");

      if (!API_URL) {
        throw new Error("API URL is not configured");
      }

      const response = await fetch(`${API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load profile");
      }

      setUser(data.user);
      setUsername(data.user.username || "");
      setPhoneNo(data.user.phoneNo || "");
    } catch (err: any) {
      setError(err?.message || "Unable to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchProfile();
    }
  }, [accessToken]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError("");

      if (!API_URL) {
        throw new Error("API URL is not configured");
      }

      const response = await fetch(`${API_URL}/user/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          username: username.trim(),
          phoneNo: phoneNo.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update profile");
      }

      setUser(data.user);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#070A08]">
        <ActivityIndicator size="small" color="#8DFFB0" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#070A08] px-6">
        <Text className="text-[17px] font-semibold text-white">
          Unable to load profile
        </Text>

        <Text className="mt-2 text-center text-[13px] text-[#737D76]">
          {error || "Something went wrong"}
        </Text>

        <Pressable
          onPress={fetchProfile}
          className="mt-6 h-[46px] items-center justify-center rounded-[14px] bg-[#06C261] px-6"
        >
          <Text className="text-[13px] font-semibold text-[#061009]">
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  const initials = user.username?.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <View className="flex-1 bg-[#070A08]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 56,
          paddingBottom: 40,
        }}
      >
        {/* HEADER */}
        <View className="flex-row items-center justify-between px-5">
          <Pressable
            onPress={() => router.back()}
            className="h-[42px] w-[42px] items-center justify-center rounded-full border border-[#252D28] bg-[#101511]"
          >
            <Text className="mt-[-2px] text-[25px] font-light text-[#DCE4DE]">
              ‹
            </Text>
          </Pressable>

          <Text className="text-[21px] font-semibold tracking-[-0.4px] text-white">
            Profile
          </Text>

          <Pressable
            onPress={() => setEditing(!editing)}
            className="h-[42px] min-w-[42px] items-center justify-center rounded-full border border-[#252D28] bg-[#101511] px-3"
          >
            <Text className="text-[12px] font-semibold text-[#9DFFB7]">
              {editing ? "Done" : "Edit"}
            </Text>
          </Pressable>
        </View>

        {/* PROFILE HEADER */}
        <View className="mx-5 mt-7 items-center">
          <View className="relative">
            <View className="h-[92px] w-[92px] items-center justify-center rounded-full bg-[#B5F5C8]">
              <Text className="text-[36px] font-bold text-[#152119]">
                {initials}
              </Text>
            </View>

            <View className="absolute bottom-0 right-0 h-[28px] w-[28px] items-center justify-center rounded-full border-2 border-[#070A08] bg-[#18231C]">
              <Text className="text-[12px] text-[#9DFFB7]">✎</Text>
            </View>
          </View>

          <Text className="mt-4 text-[25px] font-semibold tracking-[-0.6px] text-white">
            {user.username}
          </Text>

          <Text className="mt-1 text-[13px] text-[#78837C]">{user.email}</Text>

          <View className="mt-3 flex-row items-center">
            <View
              className={`mr-2 h-[7px] w-[7px] rounded-full ${
                user.verified ? "bg-[#62F594]" : "bg-[#E4A84F]"
              }`}
            />

            <Text className="text-[12px] text-[#87938B]">
              {user.verified ? "Verified account" : "Email not verified"}
            </Text>
          </View>
        </View>

        {/* ACCOUNT CARD */}
        <View className="mx-5 mt-8 overflow-hidden rounded-[22px] border border-[#252E28] bg-[#0E1410]">
          <View className="px-5 pb-3 pt-5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-[#68736C]">
              Account
            </Text>
          </View>

          {/* USERNAME */}
          <View className="border-t border-[#202820] px-5 py-[17px]">
            <Text className="text-[11px] text-[#68736C]">Username</Text>

            {editing ? (
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                className="mt-1 h-[28px] p-0 text-[15px] text-white"
                placeholderTextColor="#66716A"
              />
            ) : (
              <Text className="mt-1 text-[15px] text-[#E5EBE6]">
                {user.username}
              </Text>
            )}
          </View>

          {/* EMAIL */}
          <View className="border-t border-[#202820] px-5 py-[17px]">
            <Text className="text-[11px] text-[#68736C]">Email</Text>

            <Text className="mt-1 text-[15px] text-[#A5AEA8]">
              {user.email}
            </Text>
          </View>

          {/* PHONE */}
          <View className="border-t border-[#202820] px-5 py-[17px]">
            <Text className="text-[11px] text-[#68736C]">Phone</Text>

            {editing ? (
              <TextInput
                value={phoneNo}
                onChangeText={setPhoneNo}
                keyboardType="phone-pad"
                className="mt-1 h-[28px] p-0 text-[15px] text-white"
                placeholderTextColor="#66716A"
              />
            ) : (
              <Text className="mt-1 text-[15px] text-[#E5EBE6]">
                {user.phoneNo
                  ? `${user.countryCode || ""} ${user.phoneNo}`
                  : "Not added"}
              </Text>
            )}
          </View>

          {/* ROLE */}
          <View className="border-t border-[#202820] px-5 py-[17px]">
            <Text className="text-[11px] text-[#68736C]">Account type</Text>

            <Text className="mt-1 text-[15px] capitalize text-[#A5AEA8]">
              {user.role?.toLowerCase() || "User"}
            </Text>
          </View>
        </View>

        {/* SAVE */}
        {editing && (
          <View className="mx-5 mt-4">
            {error ? (
              <Text className="mb-3 text-[12px] text-[#FF7777]">{error}</Text>
            ) : null}

            <Pressable
              onPress={saveProfile}
              disabled={saving}
              className="h-[52px] items-center justify-center rounded-[16px] bg-[#06C261]"
            >
              {saving ? (
                <ActivityIndicator color="#061009" />
              ) : (
                <Text className="text-[14px] font-bold text-[#061009]">
                  Save changes
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* MENU */}
        <View className="mx-5 mt-7 mb-6 overflow-hidden rounded-[22px] border border-[#252E28] bg-[#0E1410]">
          <ProfileRow
            icon="○"
            title="Personal information"
            subtitle="Manage your personal details"
            onPress={() => setEditing(true)}
          />

          <ProfileRow
            icon="⌂"
            title="My devices"
            subtitle="Manage your connected devices"
            onPress={() => {}}
          />

          <ProfileRow
            icon="◇"
            title="Security"
            subtitle="Password and account security"
            onPress={() => {}}
          />

          <ProfileRow
            icon="♧"
            title="Notifications"
            subtitle="Manage your notifications"
            onPress={() => {}}
          />

          <ProfileRow
            icon="↪"
            title="Log out"
            subtitle="Sign out from this device"
            danger
            last
            onPress={handleLogout}
          />
        </View>

        <Text className="mt-6 text-center text-[11px] text-[#465149]">
          {user.role || "USER"} account
        </Text>
      </ScrollView>
    </View>
  );
}

function ProfileRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
  last = false,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-5 py-[16px] ${
        !last ? "border-b border-[#202820]" : ""
      }`}
    >
      <View
        className={`h-[40px] w-[40px] items-center justify-center rounded-[13px] ${
          danger ? "bg-[#211414]" : "bg-[#172019]"
        }`}
      >
        <Text
          className={`text-[19px] ${
            danger ? "text-[#FF7777]" : "text-[#9DFFB7]"
          }`}
        >
          {icon}
        </Text>
      </View>

      <View className="ml-4 flex-1">
        <Text
          className={`text-[14px] font-medium ${
            danger ? "text-[#FF8585]" : "text-[#E1E8E3]"
          }`}
        >
          {title}
        </Text>

        <Text className="mt-1 text-[11px] text-[#68746C]">{subtitle}</Text>
      </View>

      <Text
        className={`text-[22px] ${
          danger ? "text-[#704343]" : "text-[#536057]"
        }`}
      >
        ›
      </Text>
    </Pressable>
  );
}
