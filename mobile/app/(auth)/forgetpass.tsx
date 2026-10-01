import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";

export default function ForgetPassword() {
  return (
    <View className="flex-1 bg-[#050705] px-6 pt-16">
      <Text className="text-[30px] font-bold text-white">Forgot password?</Text>

      <Text className="mt-2 text-[14px] leading-5 text-[#777D77]">
        Enter your email and we'll send you a link to reset your password.
      </Text>

      <View className="mt-8">
        <TextInput
          placeholder="Email"
          placeholderTextColor="#686E68"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="h-[54px] rounded-full bg-[#151915] px-5 text-[15px] text-white"
        />

        <Pressable className="mt-5 h-[54px] items-center justify-center rounded-full bg-[#B8F45A]">
          <Text className="text-[15px] font-bold text-[#071007]">
            Send reset link
          </Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.back()} className="mt-6 items-center">
        <Text className="text-[14px] font-medium text-white">
          Back to login
        </Text>
      </Pressable>
    </View>
  );
}
