import React, { useEffect } from "react";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
// import {
//   useFonts,
//   Poppins_400Regular,
//   Poppins_500Medium,
//   Poppins_600SemiBold,
//   Poppins_700Bold,
//   Poppins_800ExtraBold,
// } from "@expo-google-fonts/poppins";

// import {
//   useFonts,
//   Rubik_400Regular,
//   Rubik_500Medium,
//   Rubik_600SemiBold,
//   Rubik_700Bold,
//   Rubik_800ExtraBold,
// } from "@expo-google-fonts/rubik";

import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from "@expo-google-fonts/dm-sans";

import "react-native-reanimated";
import "../global.css";
import { AuthProvider } from "@/lib/auth-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
