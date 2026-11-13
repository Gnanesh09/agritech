import React, { useEffect, useRef } from "react";

import { Animated, Pressable, Text, View } from "react-native";

import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";

import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// --------------------------------------------------
// COLORS
// --------------------------------------------------

const ACTIVE_COLOR = "#C8FF67";
const AI_COLOR = "#D8B4FE";
const BAR_COLOR = "#111111";
const ICON_COLOR = "#8E8E93";

// --------------------------------------------------
// TAB CONFIGURATION
// --------------------------------------------------

const TAB_CONFIG: Record<string, any> = {
  home: {
    label: "Home",
    Icon: Feather,
    icon: "home",
  },

  devices: {
    label: "Devices",
    Icon: FontAwesome6,
    icon: "server",
  },

  market: {
    label: "Market",
    Icon: Feather,
    icon: "shopping-bag",
  },

  profile: {
    label: "Profile",
    Icon: Feather,
    icon: "user",
  },

  coco: {
    label: "CocoAI",
    Icon: Feather,
    icon: "aperture",
  },
};

// --------------------------------------------------
// ANIMATED TAB BUTTON
// --------------------------------------------------

function TabButton({ name, isFocused, ...triggerProps }: any) {
  const config = TAB_CONFIG[name];

  const isCoco = name === "coco";

  const Icon = config.Icon;

  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // CocoAI pulse animation

  useEffect(() => {
    if (!isCoco || isFocused) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),

        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [isCoco, isFocused, pulse]);

  // Press animations

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const activeColor = isCoco ? AI_COLOR : ACTIVE_COLOR;

  return (
    <Pressable
      {...triggerProps}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={config.label}
      className="items-center justify-center mx-1"
      style={{
        width: 64,
        height: 54,
      }}
    >
      <Animated.View
        className="w-full h-full items-center justify-center overflow-hidden rounded-[18px]"
        style={{
          transform: [{ scale }],
        }}
      >
        {isFocused ? (
          // ACTIVE TAB

          <LinearGradient
            colors={
              isCoco
                ? ["#2A1B38", "#1C1C1E", "#000000"]
                : ["#3A3A3C", "#1C1C1E", "#000000"]
            }
            locations={[0, 0.5, 1]}
            className="w-full h-full items-center justify-center rounded-[18px]"
            style={{
              borderTopWidth: 1.5,
              borderTopColor: isCoco ? "#7A4EAB" : "#545458",

              borderBottomWidth: 1.5,
              borderBottomColor: "#000000",
            }}
          >
            <Icon name={config.icon} size={18} color={activeColor} />

            <Text
              numberOfLines={1}
              className="text-[9px] font-bold mt-[2px] uppercase tracking-wider"
              style={{
                color: activeColor,
                fontStyle: isCoco ? "italic" : "normal",
              }}
            >
              {config.label}
            </Text>
          </LinearGradient>
        ) : (
          // INACTIVE TAB

          <Animated.View
            className="w-full h-full items-center justify-center"
            style={{
              transform: [
                {
                  scale: isCoco ? pulse : 1,
                },
              ],
            }}
          >
            <Icon
              name={config.icon}
              size={18}
              color={isCoco ? "#645577" : ICON_COLOR}
            />

            <Text
              numberOfLines={1}
              className="text-[9px] font-bold mt-[2px] uppercase tracking-wider"
              style={{
                color: isCoco ? "#645577" : ICON_COLOR,
              }}
            >
              {config.label}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// --------------------------------------------------
// FLOATING TAB BAR
// --------------------------------------------------

function FloatingTabBar() {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0 items-center"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        className="flex-row items-center rounded-[24px] border border-[#292929]"
        style={{
          padding: 6,
          backgroundColor: BAR_COLOR,

          shadowColor: "#000000",
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.8,
          shadowRadius: 20,

          elevation: 10,
        }}
      >
        <TabTrigger name="home" asChild>
          <TabButton name="home" />
        </TabTrigger>

        <TabTrigger name="devices" asChild>
          <TabButton name="devices" />
        </TabTrigger>

        <TabTrigger name="market" asChild>
          <TabButton name="market" />
        </TabTrigger>

        <TabTrigger name="profile" asChild>
          <TabButton name="profile" />
        </TabTrigger>
      </View>
    </View>
  );
}

// --------------------------------------------------
// MAIN LAYOUT
// --------------------------------------------------

export default function TabsLayout() {
  return (
    <Tabs>
      {/* Current screen */}

      <View className="flex-1">
        <TabSlot />
      </View>

      {/* Floating navigation */}

      <FloatingTabBar />

      {/* Route registration */}

      <TabList style={{ display: "none" }}>
        <TabTrigger name="home" href="/(tabs)" />
        <TabTrigger name="devices" href="/(tabs)/devices" />
        <TabTrigger name="market" href="/(tabs)/market" />
        <TabTrigger name="profile" href="/(tabs)/profile" />
      </TabList>
    </Tabs>
  );
}
