import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit() {
    setMessage("Password reset is not connected yet.");
  }

  return (
    <View className="flex-1 bg-[#050705] px-6 pt-16">
      <Text className="text-[30px] font-bold text-white">Forgot password?</Text>

      <Text className="mt-2 text-[14px] leading-5 text-[#777D77]">
        Enter your email to request a password reset.
      </Text>

      <View className="mt-8">
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#686E68"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="h-[54px] rounded-full bg-[#151915] px-5 text-[15px] text-white"
        />

        {message ? (
          <Text className="mt-3 px-1 text-[13px] text-[#9DFFB5]">
            {message}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          className="mt-5 h-[54px] items-center justify-center rounded-full bg-[#06C261]"
        >
          <Text className="text-[15px] font-bold text-[#071007]">
            Send reset request
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.replace("/(auth)/login")}
        className="mt-6 items-center"
      >
        <Text className="text-[14px] font-medium text-white">
          Back to login
        </Text>
      </Pressable>
    </View>
  );
}
