import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { apiRequest } from "@/lib/api";

export default function SignupScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNo, setPhoneNo] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    setError("");

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCountryCode = countryCode.trim();
    const cleanPhoneNo = phoneNo.trim();

    if (
      !cleanUsername ||
      !cleanEmail ||
      !cleanCountryCode ||
      !cleanPhoneNo ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/auth/register", {
        method: "POST",
        skipRefresh: true,
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password,
          countryCode: cleanCountryCode,
          phoneNo: cleanPhoneNo,
          role: "USER",
        }),
      });

      router.push({
        pathname: "/(auth)/verify-email",
        params: {
          email: cleanEmail,
        },
      });
    } catch (err: any) {
      setError(err?.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#070A08]"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 60,
          paddingBottom: 40,
        }}
      >
        {/* HEADER */}

        <Text className="text-[32px] font-bold tracking-[-0.8px] text-white">
          Create account
        </Text>

        <Text className="mt-2 text-[15px] leading-5 text-[#7D857E]">
          Create your AgriTech account to get started.
        </Text>

        {/* ERROR */}

        {error ? (
          <View className="mt-5 rounded-[16px] border border-[#482727] bg-[#1B1111] px-4 py-3">
            <Text className="text-[13px] leading-5 text-[#FF7A7A]">
              {error}
            </Text>
          </View>
        ) : null}

        <View className="mt-8">
          {/* USERNAME */}

          <Text className="mb-2 ml-1 text-[13px] font-medium text-[#A3AAA4]">
            Username
          </Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            placeholderTextColor="#626962"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            className="h-[56px] rounded-[18px] border border-[#252C27] bg-[#111611] px-5 text-[15px] text-white"
          />

          {/* EMAIL */}

          <Text className="mb-2 ml-1 mt-5 text-[13px] font-medium text-[#A3AAA4]">
            Email
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#626962"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            className="h-[56px] rounded-[18px] border border-[#252C27] bg-[#111611] px-5 text-[15px] text-white"
          />

          {/* PHONE */}

          <Text className="mb-2 ml-1 mt-5 text-[13px] font-medium text-[#A3AAA4]">
            Phone number
          </Text>

          <View className="flex-row">
            <TextInput
              value={countryCode}
              onChangeText={setCountryCode}
              keyboardType="phone-pad"
              editable={!loading}
              className="h-[56px] w-[82px] rounded-[18px] border border-[#252C27] bg-[#111611] px-4 text-[15px] text-white"
            />

            <TextInput
              value={phoneNo}
              onChangeText={setPhoneNo}
              placeholder="Phone number"
              placeholderTextColor="#626962"
              keyboardType="phone-pad"
              editable={!loading}
              className="ml-3 h-[56px] flex-1 rounded-[18px] border border-[#252C27] bg-[#111611] px-5 text-[15px] text-white"
            />
          </View>

          {/* PASSWORD */}

          <Text className="mb-2 ml-1 mt-5 text-[13px] font-medium text-[#A3AAA4]">
            Password
          </Text>

          <View className="h-[56px] flex-row overflow-hidden rounded-[18px] border border-[#252C27] bg-[#111611]">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              placeholderTextColor="#626962"
              secureTextEntry={!showPassword}
              editable={!loading}
              className="flex-1 px-5 text-[15px] text-white"
            />

            <Pressable
              onPress={() => setShowPassword((value) => !value)}
              disabled={loading}
              className="w-[56px] items-center justify-center"
            >
              <Text className="text-[13px] text-[#7D857E]">
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>

          {/* CONFIRM PASSWORD */}

          <Text className="mb-2 ml-1 mt-5 text-[13px] font-medium text-[#A3AAA4]">
            Confirm password
          </Text>

          <View className="h-[56px] flex-row overflow-hidden rounded-[18px] border border-[#252C27] bg-[#111611]">
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              placeholderTextColor="#626962"
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
              className="flex-1 px-5 text-[15px] text-white"
            />

            <Pressable
              onPress={() => setShowConfirmPassword((value) => !value)}
              disabled={loading}
              className="w-[56px] items-center justify-center"
            >
              <Text className="text-[13px] text-[#7D857E]">
                {showConfirmPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>

          {/* CREATE */}

          <Pressable
            onPress={handleSignup}
            disabled={loading}
            className={`mt-7 h-[56px] items-center justify-center rounded-[18px] ${
              loading ? "bg-[#087A42]" : "bg-[#06C261]"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#061009" />
            ) : (
              <Text className="text-[15px] font-bold text-[#061009]">
                Create account
              </Text>
            )}
          </Pressable>
        </View>

        {/* LOGIN */}

        <View className="mt-8 flex-row items-center justify-center">
          <Text className="text-[14px] text-[#626962]">
            Already have an account?
          </Text>

          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            disabled={loading}
            className="ml-2"
          >
            <Text className="text-[14px] font-semibold text-white">Log in</Text>
          </Pressable>
        </View>

        <View className="mt-8 items-center">
          <Text className="text-center text-[11px] leading-4 text-[#555D56]">
            By continuing, you agree to our{" "}
            <Text className="text-[#89928A] underline">Terms & Conditions</Text>{" "}
            and <Text className="text-[#89928A] underline">Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
