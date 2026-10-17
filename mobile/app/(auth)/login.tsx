import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { useAuth } from "@/lib/auth-context";
import AppText from "@/components/ui/AppText";

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      await login(cleanEmail, password);

      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-[#070A08] px-6 pt-16">
      {/* HEADER */}

      <View>
        <AppText weight="semibold" className="text-2xl text-white">
          Welcome back
        </AppText>

        <AppText className="mt-2 text-[15px] text-[#7D857E]">
          Log in to continue
        </AppText>
      </View>

      {/* FORM */}

      <View className="mt-10">
        {/* EMAIL */}

        <AppText className="mb-2 ml-1 text-[13px] font-medium text-[#A3AAA4]">
          Email
        </AppText>

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

        {/* PASSWORD */}

        <View className="mt-5">
          <View className="mb-2 flex-row items-center justify-between px-1">
            <AppText className="text-[13px] font-medium text-[#A3AAA4]">
              Password
            </AppText>

            <Pressable
              onPress={() => router.push("/(auth)/forgetpass")}
              disabled={loading}
            >
              <AppText className="text-[13px] font-medium text-[#9DFFB5]">
                Forgot password?
              </AppText>
            </Pressable>
          </View>

          <View className="h-[56px] flex-row overflow-hidden rounded-[18px] border border-[#252C27] bg-[#111611]">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
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
              <AppText className="text-[13px] text-[#7D857E]">
                {showPassword ? "Hide" : "Show"}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* ERROR */}

        {error ? (
          <AppText className="mt-3 px-1 text-[13px] text-[#FF6B6B]">
            {error}
          </AppText>
        ) : null}

        {/* LOGIN */}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className={`mt-7 h-[56px] items-center justify-center rounded-[18px] ${
            loading ? "bg-[#087A42]" : "bg-[#06C261]"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#061009" />
          ) : (
            <AppText className="text-[15px] font-bold text-[#061009]">
              Log in
            </AppText>
          )}
        </Pressable>
      </View>

      {/* SIGNUP */}

      <View className="mt-8 flex-row items-center justify-center">
        <AppText className="text-[14px] text-[#626962]">New here?</AppText>

        <Pressable
          onPress={() => router.push("/(auth)/signup")}
          disabled={loading}
          className="ml-2"
        >
          <AppText className="text-[14px] font-semibold text-white">
            Create an account
          </AppText>
        </Pressable>
      </View>

      {/* TERMS */}

      <View className="mt-auto items-center pb-8">
        <AppText className="text-center text-[11px] leading-4 text-[#555D56]">
          By continuing, you agree to our{" "}
          <AppText className="text-[#89928A] underline">
            Terms & Conditions
          </AppText>{" "}
          and{" "}
          <AppText className="text-[#89928A] underline">Privacy Policy</AppText>
        </AppText>
      </View>
    </View>
  );
}
