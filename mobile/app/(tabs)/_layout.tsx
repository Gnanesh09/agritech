import React, { useRef, useEffect } from "react";
import { Pressable, Text, View, Animated } from "react-native";
import { Tabs } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const ACTIVE_COLOR = "#C8FF67";
const AI_COLOR = "#D8B4FE";
const BAR_COLOR = "#111111";
const ICON_COLOR = "#8E8E93";

// ------------------------------------------------------------------
// CENTRAL TAB CONFIGURATION
// Add, update, or change frameworks easily here.
// ------------------------------------------------------------------
const TAB_CONFIG: Record<string, any> = {
  index: {
    label: "Home",
    IconLibrary: Feather,
    iconName: "home",
  },
  devices: {
    label: "Devices",
    IconLibrary: FontAwesome6, // Using FontAwesome6 here
    iconName: "server", // You can change this to any FA6 icon
  },
  notifications: {
    label: "Alerts",
    IconLibrary: Feather,
    iconName: "bell",
  },
  profile: {
    label: "Profile",
    IconLibrary: Feather,
    iconName: "user",
  },
  coco: {
    label: "CocoAi",
    IconLibrary: Feather,
    iconName: "aperture",
  },
};

// Fallback for undefined routes
const FALLBACK_CONFIG = {
  label: "Unknown",
  IconLibrary: Feather,
  iconName: "circle",
};

function TabButton({ route, isFocused, options, navigation }: any) {
  const isCoco = route.name === "coco";

  // Pull the specific tab's configuration (Icon library, name, and fallback label)
  const currentTab = TAB_CONFIG[route.name] || FALLBACK_CONFIG;
  const IconComponent = currentTab.IconLibrary;
  const iconName = currentTab.iconName;

  const scale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : currentTab.label;

  // --- Continuous Animation for Coco (Only when INACTIVE) ---
  useEffect(() => {
    let loopAnim: Animated.CompositeAnimation | null = null;

    if (isCoco && !isFocused) {
      loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      loopAnim.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (loopAnim) loopAnim.stop();
    };
  }, [isFocused, isCoco]);

  // --- Press Animations ---
  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const onLongPress = () => {
    navigation.emit({
      type: "tabLongPress",
      target: route.key,
    });
  };

  const currentActiveColor = isCoco ? AI_COLOR : ACTIVE_COLOR;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="items-center justify-center mx-1"
      style={{
        height: 54,
        width: 64,
      }}
    >
      <Animated.View
        className="w-full h-full items-center justify-center overflow-hidden rounded-[18px]"
        style={{
          transform: [{ scale }],
        }}
      >
        {isFocused ? (
          // --- ACTIVE STATE ---
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
            {/* Dynamically renders FontAwesome6, Feather, etc. */}
            <IconComponent
              name={iconName as any}
              size={18}
              color={currentActiveColor}
            />
            <Text
              className="text-[9px] font-bold mt-[2px] uppercase tracking-wider"
              style={{
                color: currentActiveColor,
                fontFamily: isCoco ? "Your-Custom-Font-Name" : undefined,
                fontStyle: isCoco ? "italic" : "normal",
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </LinearGradient>
        ) : (
          // --- INACTIVE STATE ---
          <Animated.View
            className="items-center justify-center w-full h-full"
            style={{
              transform: [{ scale: isCoco ? pulseAnim : 1 }],
            }}
          >
            {/* Dynamically renders FontAwesome6, Feather, etc. */}
            <IconComponent
              name={iconName as any}
              size={18}
              color={isCoco ? "#645577" : ICON_COLOR}
            />
            <Text
              className="text-[9px] font-bold mt-[2px] uppercase tracking-wider"
              style={{
                color: isCoco ? "#645577" : ICON_COLOR,
                fontFamily: isCoco ? "Your-Custom-Font-Name" : undefined,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          return (
            <TabButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              options={options}
              navigation={navigation}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="devices" options={{ title: "Devices" }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="coco" options={{ title: "CocoAi" }} />
    </Tabs>
  );
}
