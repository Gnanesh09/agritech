import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{
    email?: string;
  }>();

  const { setSession } = useAuth();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const email = typeof params.email === "string" ? params.email : "";

  async function handleVerify() {
    setError("");

    const cleanOtp = otp.trim();

    if (!email) {
      setError("Verification email is missing. Please start signup again.");
      return;
    }

    if (!cleanOtp) {
      setError("Enter the OTP sent to your email.");
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest("/auth/verify-email", {
        method: "POST",
        skipRefresh: true,
        body: JSON.stringify({
          email,
          otp: cleanOtp,
        }),
      });

      if (!data?.accessToken || !data?.user) {
        throw new Error("Verification succeeded but no session was returned.");
      }

      // Save token + update AuthProvider state
      await setSession(data.accessToken, data.user);

      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err?.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-[#070A08] px-6 pt-16">
      <Text className="text-[32px] font-bold tracking-[-0.8px] text-white">
        Verify your email
      </Text>

      <Text className="mt-2 text-[15px] leading-5 text-[#7D857E]">
        Enter the verification code sent to{" "}
        <Text className="text-white">{email}</Text>
      </Text>

      {error ? (
        <View className="mt-6 rounded-[16px] border border-[#482727] bg-[#1B1111] px-4 py-3">
          <Text className="text-[13px] leading-5 text-[#FF7A7A]">{error}</Text>
        </View>
      ) : null}

      <View className="mt-10">
        <Text className="mb-2 ml-1 text-[13px] font-medium text-[#A3AAA4]">
          Verification code
        </Text>

        <TextInput
          value={otp}
          onChangeText={setOtp}
          placeholder="Enter OTP"
          placeholderTextColor="#626962"
          keyboardType="number-pad"
          maxLength={8}
          autoFocus
          editable={!loading}
          className="h-[58px] rounded-[18px] border border-[#252C27] bg-[#111611] px-5 text-center text-[22px] font-semibold tracking-[7px] text-white"
        />

        <Pressable
          onPress={handleVerify}
          disabled={loading}
          className={`mt-6 h-[56px] items-center justify-center rounded-[18px] ${
            loading ? "bg-[#087A42]" : "bg-[#06C261]"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#061009" />
          ) : (
            <Text className="text-[15px] font-bold text-[#061009]">
              Verify & continue
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.replace("/(auth)/signup")}
        disabled={loading}
        className="mt-7 items-center"
      >
        <Text className="text-[14px] font-medium text-white">
          Back to signup
        </Text>
      </Pressable>
    </View>
  );
}
