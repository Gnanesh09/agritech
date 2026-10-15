import React, { useEffect } from "react";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
} from "@expo-google-fonts/rubik";

import "react-native-reanimated";
import "../global.css";

import { AuthProvider } from "@/lib/auth-context";

// 1. Apply the global Text override to force Rubik everywhere
// We use defaultProps fallback for older RN versions, and render override for newer ones
interface TextWithDefaultProps extends React.FunctionComponent<any> {
  defaultProps?: { style?: any };
}
(Text as unknown as TextWithDefaultProps).defaultProps =
  (Text as unknown as TextWithDefaultProps).defaultProps || {};
(Text as unknown as TextWithDefaultProps).defaultProps!.style = {
  fontFamily: "Rubik_400Regular",
};

// Prevent the splash screen from hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 2. Load the fonts
  const [fontsLoaded, error] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
  });

  // 3. Hide splash screen once fonts finish loading
  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  // Don't render the app until fonts are ready
  if (!fontsLoaded && !error) {
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
