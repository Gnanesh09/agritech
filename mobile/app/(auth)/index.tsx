import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function AuthIndex() {
  return (
    <View className="flex-1 bg-[#050705] px-6 pt-16">
      <View className="flex-1 justify-center">
        <Text className="text-[32px] font-bold text-white">Welcome</Text>

        <Text className="mt-2 text-[15px] text-[#777D77]">
          Login or create an account to continue.
        </Text>

        <View className="mt-8 gap-3">
          <Pressable
            onPress={() => router.push("/login")}
            className="h-[54px] items-center justify-center rounded-full bg-[#B8F45A]"
          >
            <Text className="text-[15px] font-bold text-[#071007]">Login</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/signup")}
            className="h-[54px] items-center justify-center rounded-full border border-[#303630] bg-[#101410]"
          >
            <Text className="text-[15px] font-semibold text-white">
              Create account
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
