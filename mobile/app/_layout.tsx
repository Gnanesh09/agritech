import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

import "react-native-reanimated";
import "../global.css";

import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-black">
        <SafeAreaView edges={["bottom"]} className="flex-1 bg-black">
          <AuthProvider>
            <ThemeProvider value={DarkTheme}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: "#000000",
                  },
                }}
              />
            </ThemeProvider>
          </AuthProvider>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
