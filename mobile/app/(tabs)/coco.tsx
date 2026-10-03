import React from "react";
import { Image, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

const COCO_IMAGE = require("../../assets/cocoai.png");

export default function CocoScreen() {
  return (
    <View className="flex-1 bg-[#0647FF]">
      <StatusBar barStyle="light-content" backgroundColor="#0647FF" />

      <LinearGradient
        colors={["#0755FF", "#0649F5", "#063EDC", "#0533B8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1"
      >
        <SafeAreaView
          className="flex-1"
          edges={["top", "bottom", "left", "right"]}
        >
          {/* HEADER */}
          <View className="flex-row items-center justify-between px-6 pt-3">
            <View>
              <Text
                className="text-white"
                style={{
                  fontSize: 12,
                  fontWeight: "900",
                  letterSpacing: 3,
                }}
              >
                COCOAI
              </Text>

              <Text
                className="mt-1 text-white/60"
                style={{
                  fontSize: 8,
                  fontWeight: "800",
                  letterSpacing: 1.8,
                }}
              >
                THE NEXT AI COMPANION
              </Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10"
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "300",
                }}
              >
                ×
              </Text>
            </Pressable>
          </View>

          {/* HERO */}
          <View className="flex-1 items-center justify-center">
            {/* BIG PROMOTIONAL HEADLINE */}
            <View className="absolute top-8 items-center">
              <Text
                style={{
                  color: "#C8FF67",
                  fontSize: 12,
                  fontWeight: "900",
                  letterSpacing: 4,
                }}
              >
                SOMETHING BIG
              </Text>

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 35,
                  fontWeight: "900",
                  letterSpacing: -1.5,
                  textAlign: "center",
                  lineHeight: 38,
                }}
              >
                IS COMING.
              </Text>
            </View>

            {/* GLOW */}
            <View
              className="absolute h-[350px] w-[350px] rounded-full"
              style={{
                backgroundColor: "#8CFF3D",
                opacity: 0.1,
              }}
            />

            <View
              className="absolute h-[220px] w-[220px] rounded-full"
              style={{
                backgroundColor: "#42D9FF",
                opacity: 0.12,
              }}
            />

            {/* MONKEY STICKER */}
            <Image
              source={COCO_IMAGE}
              resizeMode="contain"
              className="h-[350px] w-[350px]"
            />

            {/* BRAND */}
            <View className="mt-[-20px] items-center">
              <Text
                style={{
                  fontSize: 50,
                  fontWeight: "900",
                  letterSpacing: -4,
                }}
              >
                <Text style={{ color: "#FFFFFF" }}>coco</Text>

                <Text style={{ color: "#C8FF67" }}>ai</Text>
              </Text>

              <Text
                className="mt-1"
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 4,
                }}
              >
                YOUR AI COMPANION
              </Text>
            </View>

            {/* PROMO BADGE */}
            <View className="mt-7">
              <LinearGradient
                colors={["#D8FF68", "#A8FF32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="rounded-full px-7 py-3"
              >
                <Text
                  style={{
                    color: "#071300",
                    fontSize: 11,
                    fontWeight: "900",
                    letterSpacing: 2.5,
                  }}
                >
                  COMING SOON
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* BOTTOM PROMO */}
          <View className="items-center px-6 pb-4">
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "900",
                letterSpacing: 0.5,
                textAlign: "center",
              }}
            >
              THINK. CREATE. CHAT.
            </Text>

            <Text
              className="mt-1"
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.5,
                textAlign: "center",
              }}
            >
              COCOAI IS ALMOST HERE
            </Text>

            <View className="mt-4 flex-row items-center">
              <View className="h-[3px] w-3 rounded-full bg-[#C8FF67]" />

              <View className="mx-1.5 h-[3px] w-3 rounded-full bg-white/30" />

              <View className="h-[3px] w-3 rounded-full bg-white/30" />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
