import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

//  Changed to useRouter hook import
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const router = useRouter(); // 💡 Initialised the router hook here
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      await login(email, password);

      // Authentication succeeded - Hook uses exact same syntax
      router.replace("/(tabs)");
    } catch (error: any) {
      setError(error.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-[#070A08] px-6 pt-16">
      {/* HEADER */}
      <View>
        <Text className="text-[32px] font-bold tracking-[-0.8px] text-white">
          Welcome back
        </Text>
        <Text className="mt-2 text-[15px] text-[#7D857E]">
          Log in to continue
        </Text>
      </View>

      {/* FORM */}
      <View className="mt-10">
        {/* EMAIL */}
        <View>
          <Text className="mb-2 ml-1 text-[13px] font-medium text-[#A3AAA4]">
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
        </View>

        {/* PASSWORD */}
        <View className="mt-5">
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Text className="text-[13px] font-medium text-[#A3AAA4]">
              Password
            </Text>
            <Pressable
              onPress={() => router.push("/forgetpass")}
              disabled={loading}
            >
              <Text className="text-[13px] font-medium text-[#9DFFB5]">
                Forgot password?
              </Text>
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
              onPress={() => setShowPassword(!showPassword)}
              className="w-[56px] items-center justify-center"
              disabled={loading}
            >
              <Text className="text-[13px] text-[#7D857E]">
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ERROR */}
        {error ? (
          <Text className="mt-3 px-1 text-[13px] text-[#FF6B6B]">{error}</Text>
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
            <Text className="text-[15px] font-bold text-[#061009]">Log in</Text>
          )}
        </Pressable>
      </View>

      {/* SIGNUP */}
      <View className="mt-8 flex-row items-center justify-center">
        <Text className="text-[14px] text-[#626962]">New here?</Text>
        <Pressable onPress={() => router.push("/signup")} className="ml-2">
          <Text className="text-[14px] font-semibold text-white">
            Create an account
          </Text>
        </Pressable>
      </View>

      {/* TERMS */}
      <View className="mt-auto items-center pb-8">
        <Text className="text-center text-[11px] leading-4 text-[#555D56]">
          By continuing, you agree to our{" "}
          <Text className="text-[#89928A] underline">Terms & Conditions</Text>{" "}
          and <Text className="text-[#89928A] underline">Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}
