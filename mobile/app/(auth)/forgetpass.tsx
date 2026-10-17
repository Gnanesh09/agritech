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

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.49.17.210:5000/api";

type Step = "EMAIL" | "RESET";

export default function ForgetPassword() {
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function postJson(path: string, body: Record<string, string>) {
    const response = await fetch(`${API_URL}/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Something went wrong. Please try again.",
      );
    }

    return data;
  }

  async function handleSubmit() {
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await postJson("forgot-password", { email: normalizedEmail });
      setEmail(normalizedEmail);
      setStep("RESET");
      setMessage(
        "If a verified account exists, a reset code has been sent to your email.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send the reset code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await postJson("reset-password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
      });

      setMessage(data.message || "Password reset successfully.");
      router.replace("/(auth)/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#050705]"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-16 pb-10">
          <Pressable
            onPress={() => {
              if (step === "RESET") {
                setStep("EMAIL");
                setError("");
                setMessage("");
              } else {
                router.replace("/(auth)/login");
              }
            }}
            className="mb-9 h-10 w-10 items-center justify-center rounded-full bg-[#151915]"
          >
            <Text className="text-xl text-white">‹</Text>
          </Pressable>

          <View className="mb-8 h-14 w-14 items-center justify-center rounded-2xl bg-[#123923]">
            <Text className="text-2xl text-[#06C261]">
              {step === "EMAIL" ? "✉" : "✓"}
            </Text>
          </View>

          <Text className="text-[30px] font-bold text-white">
            {step === "EMAIL" ? "Forgot password?" : "Create a new password"}
          </Text>

          <Text className="mt-2 text-[14px] leading-6 text-[#777D77]">
            {step === "EMAIL"
              ? "Enter the email linked to your account. We'll send you a code to reset your password."
              : `Enter the 6-digit code sent to ${email}, then choose a new password.`}
          </Text>

          <View className="mt-8 gap-4">
            {step === "EMAIL" ? (
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#686E68"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                className="h-[54px] rounded-full bg-[#151915] px-5 text-[15px] text-white"
              />
            ) : (
              <>
                <TextInput
                  value={code}
                  onChangeText={(value) =>
                    setCode(value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit reset code"
                  placeholderTextColor="#686E68"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                  className="h-[54px] rounded-full bg-[#151915] px-5 text-[15px] tracking-[4px] text-white"
                />

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="New password"
                  placeholderTextColor="#686E68"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  className="h-[54px] rounded-full bg-[#151915] px-5 text-[15px] text-white"
                />

                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#686E68"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onSubmitEditing={handleResetPassword}
                  className="h-[54px] rounded-full bg-[#151915] px-5 text-[15px] text-white"
                />

                <Pressable
                  disabled={loading}
                  onPress={async () => {
                    setError("");
                    setMessage("");
                    setLoading(true);
                    try {
                      await postJson("forgot-password", {
                        email: email.trim().toLowerCase(),
                      });
                      setMessage(
                        "If a verified account exists, a new reset code has been sent.",
                      );
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Unable to resend the code.",
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="self-start py-1"
                >
                  <Text className="text-[13px] font-semibold text-[#06C261]">
                    Resend code
                  </Text>
                </Pressable>
              </>
            )}

            {error ? (
              <Text
                accessibilityRole="alert"
                className="px-1 text-[13px] leading-5 text-[#FF7777]"
              >
                {error}
              </Text>
            ) : null}

            {message ? (
              <Text className="px-1 text-[13px] leading-5 text-[#9DFFB5]">
                {message}
              </Text>
            ) : null}

            <Pressable
              disabled={loading}
              onPress={step === "EMAIL" ? handleSubmit : handleResetPassword}
              className={`mt-1 h-[54px] items-center justify-center rounded-full ${
                loading ? "bg-[#278653]" : "bg-[#06C261]"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#071007" />
              ) : (
                <Text className="text-[15px] font-bold text-[#071007]">
                  {step === "EMAIL" ? "Send reset code" : "Reset password"}
                </Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            className="mt-7 items-center"
          >
            <Text className="text-[14px] font-medium text-white">
              Back to login
            </Text>
          </Pressable>

          <Text className="mt-auto pt-12 text-center text-[11px] leading-5 text-[#686E68]">
            Never share your reset code with anyone. If you didn't request a
            password reset, you can ignore the email.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
