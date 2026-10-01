import React from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_COLOR = "#C8FF67";
const BAR_COLOR = "#111111";
const ICON_COLOR = "#8E8E93";

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
        className="flex-row items-center rounded-full border border-[#292929]"
        style={{
          height: 64,
          padding: 5,
          backgroundColor: BAR_COLOR,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          elevation: 12,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const iconName =
            route.name === "index"
              ? isFocused
                ? "home"
                : "home-outline"
              : route.name === "profile"
                ? isFocused
                  ? "person"
                  : "person-outline"
                : route.name === "notifications"
                  ? isFocused
                    ? "notifications"
                    : "notifications-outline"
                  : "ellipse-outline";

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

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              className="items-center justify-center overflow-hidden rounded-full"
              style={{
                width: isFocused ? 190 : 70,
                height: 54,
                backgroundColor: isFocused ? ACTIVE_COLOR : "transparent",
              }}
            >
              {isFocused ? (
                <View className="flex-row items-center">
                  <Ionicons name={iconName as any} size={25} color="#080908" />

                  <Text className="ml-3 text-[19px] font-medium text-[#080908]">
                    {label}
                  </Text>
                </View>
              ) : (
                <Ionicons name={iconName as any} size={25} color={ICON_COLOR} />
              )}
            </Pressable>
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
        }}
      />
    </Tabs>
  );
}
