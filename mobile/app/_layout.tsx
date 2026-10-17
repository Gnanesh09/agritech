import React, { useEffect } from "react";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";

import "react-native-reanimated";
import "../global.css";

import { AuthProvider } from "@/lib/auth-context";

// Prevent the splash screen from hiding before fonts load.
SplashScreen.preventAutoHideAsync();

// Global fallback for ordinary React Native Text components.
// AppText will set its own font weight explicitly.
interface TextWithDefaultProps extends React.FunctionComponent<any> {
  defaultProps?: { style?: any };
}

(Text as unknown as TextWithDefaultProps).defaultProps = {
  ...(Text as unknown as TextWithDefaultProps).defaultProps,
  style: [
    (Text as unknown as TextWithDefaultProps).defaultProps?.style,
    { fontFamily: "Poppins_400Regular" },
  ],
};

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

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
