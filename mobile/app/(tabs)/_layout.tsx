import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

import { Tabs } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ACTIVE_COLOR = "#C8FF67";
const AI_GREEN = "#B8FF3D";
const AI_BLUE = "#27C7FF";

const BAR_COLOR = "#080B10";
const ICON_COLOR = "#8E8E93";

const COCO_IMAGE = require("../../assets/cocoai.png");

/* =========================================================
   NORMAL TAB BUTTON
========================================================= */

function NormalTabButton({ route, isFocused, options, navigation }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : route.name;

  const iconName =
    route.name === "index"
      ? "home"
      : route.name === "profile"
        ? "user"
        : route.name === "notifications"
          ? "bell"
          : "circle";

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.86,
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

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{
        width: 62,
        height: 54,
        marginHorizontal: 3,
      }}
    >
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          transform: [{ scale }],
        }}
      >
        {isFocused ? (
          <LinearGradient
            colors={["#303238", "#181A1E", "#090A0D"]}
            locations={[0, 0.5, 1]}
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              borderTopWidth: 1,
              borderTopColor: "#55565B",
              borderBottomWidth: 1,
              borderBottomColor: "#000",
            }}
          >
            <Feather name={iconName as any} size={18} color={ACTIVE_COLOR} />

            <Text
              style={{
                color: ACTIVE_COLOR,
                fontSize: 9,
                fontWeight: "800",
                marginTop: 3,
                letterSpacing: 1,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </LinearGradient>
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name={iconName as any} size={18} color={ICON_COLOR} />

            <Text
              style={{
                color: ICON_COLOR,
                fontSize: 9,
                fontWeight: "700",
                marginTop: 3,
                letterSpacing: 1,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* =========================================================
   COCO AI SPECIAL BUTTON
========================================================= */
function CocoAIButton({ navigation, route, isFocused }: any) {
  const [phase, setPhase] = useState(0);

  const scale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();

      setPhase((p) => (p + 1) % 3);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={() => navigation.navigate("coco")}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={{
        width: 82,
        height: 48,
        marginHorizontal: 2,
      }}
    >
      <Animated.View
        style={{
          flex: 1,
          transform: [{ scale }],
          opacity: fade,
        }}
      >
        <LinearGradient
          colors={isFocused ? ["#17231C", "#0D120F"] : ["#111518", "#0A0D0F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isFocused ? "#C8FF67" : "#252C2D",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {phase === 0 && (
            <View
              style={{
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#C8FF67",
                  fontSize: 8,
                  fontWeight: "800",
                  letterSpacing: 2.2,
                }}
              >
                NEW
              </Text>

              <Text
                style={{
                  color: "#737B7D",
                  fontSize: 6,
                  fontWeight: "600",
                  letterSpacing: 1,
                  marginTop: 2,
                }}
              >
                MEET COCO
              </Text>
            </View>
          )}

          {phase === 1 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
              }}
            >
              <Text
                style={{
                  color: "#F4F6F5",
                  fontSize: 16,
                  fontWeight: "800",
                  letterSpacing: -0.7,
                }}
              >
                coco
              </Text>

              <Text
                style={{
                  color: "#C8FF67",
                  fontSize: 16,
                  fontWeight: "900",
                  letterSpacing: -0.7,
                }}
              >
                ai
              </Text>
            </View>
          )}

          {phase === 2 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Image
                source={COCO_IMAGE}
                resizeMode="contain"
                style={{
                  width: 43,
                  height: 38,
                }}
              />

              <View
                style={{
                  marginLeft: 1,
                }}
              >
                <Text
                  style={{
                    color: "#F4F6F5",
                    fontSize: 9,
                    fontWeight: "800",
                  }}
                >
                  coco
                </Text>

                <Text
                  style={{
                    color: "#C8FF67",
                    fontSize: 7,
                    fontWeight: "900",
                  }}
                >
                  AI
                </Text>
              </View>
            </View>
          )}

          {/* very subtle premium highlight */}
          <View
            style={{
              position: "absolute",
              left: 10,
              right: 10,
              top: 0,
              height: 1,
              backgroundColor: isFocused
                ? "rgba(200,255,103,0.45)"
                : "rgba(255,255,255,0.08)",
            }}
          />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
/* =========================================================
   CUSTOM TAB BAR
========================================================= */

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 4,
          backgroundColor: BAR_COLOR,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: "#25292D",
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.7,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];

          const isFocused = state.index === index;

          if (route.name === "coco") {
            return (
              <CocoAIButton
                key={route.key}
                route={route}
                navigation={navigation}
                isFocused={isFocused}
              />
            );
          }

          return (
            <NormalTabButton
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

/* =========================================================
   TABS
========================================================= */

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
          title: "Alerts",
        }}
      />

      <Tabs.Screen
        name="coco"
        options={{
          title: "CocoAI",
        }}
      />
    </Tabs>
  );
}
