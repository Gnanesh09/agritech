import React, { useCallback, useEffect, useRef, useState } from "react";
import BrandSplash from "@/components/BrandSplash";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from "react-native";

import LottieView from "lottie-react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/lib/auth-context";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/auth-storage";

const { width, height } = Dimensions.get("window");

const INTRO_DURATION = 3500;
const OUTER_GAP = 12;

const COLORS = {
  background: "#070A08",
  surface: "#101510",
  accent: "#06C261",
  accentLight: "#9DFFB5",
  text: "#FFFFFF",
  buttonText: "#071009",
};

const slides = [
  {
    id: "1",
    image: "https://ik.imagekit.io/tut1/m2.png",
  },
  {
    id: "2",
    image: "https://ik.imagekit.io/tut1/M1.png",
  },
  {
    id: "3",
    image: "https://ik.imagekit.io/tut1/MODEL1.png",
  },
];

export default function RootIndex() {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();

  const [showIntro, setShowIntro] = useState(true);
  const [introFinished, setIntroFinished] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef<FlatList<(typeof slides)[number]>>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const hasDecidedEntry = useRef(false);
  const hasFinishedIntro = useRef(false);
  const isFinishingOnboarding = useRef(false);

  // --------------------------------------------------
  // INTRO ANIMATION
  // --------------------------------------------------

  const finishIntro = useCallback(() => {
    if (hasFinishedIntro.current) return;

    hasFinishedIntro.current = true;
    setShowIntro(false);
    setIntroFinished(true);
  }, []);

  // --------------------------------------------------
  // ENTRY DECISION
  // --------------------------------------------------

  useEffect(() => {
    if (authLoading || !introFinished || hasDecidedEntry.current) {
      return;
    }

    let cancelled = false;

    async function decideEntry() {
      try {
        if (user) {
          if (cancelled) return;

          hasDecidedEntry.current = true;
          router.replace("/(tabs)");
          return;
        }

        const seen = await hasSeenOnboarding();

        if (cancelled) return;

        hasDecidedEntry.current = true;

        if (seen) {
          router.replace("/(auth)/login");
          return;
        }

        setShowOnboarding(true);
        setCheckingOnboarding(false);
      } catch (error) {
        console.error("Failed to check onboarding status:", error);

        if (cancelled) return;

        // Fail safely into authentication if storage fails.
        hasDecidedEntry.current = true;
        router.replace("/(auth)/login");
      }
    }

    void decideEntry();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, introFinished]);

  // --------------------------------------------------
  // FINISH ONBOARDING
  // --------------------------------------------------

  const finishOnboarding = useCallback(async () => {
    if (isFinishingOnboarding.current) return;

    isFinishingOnboarding.current = true;

    try {
      await markOnboardingSeen();
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
    } finally {
      router.replace("/(auth)/login");
    }
  }, []);

  // --------------------------------------------------
  // NEXT SLIDE
  // --------------------------------------------------

  const nextSlide = useCallback(() => {
    if (currentIndex >= slides.length - 1) {
      void finishOnboarding();
      return;
    }

    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  }, [currentIndex, finishOnboarding]);

  // --------------------------------------------------
  // AUTO PROGRESS
  // --------------------------------------------------

  useEffect(() => {
    if (
      authLoading ||
      user ||
      !introFinished ||
      !showOnboarding ||
      checkingOnboarding
    ) {
      return;
    }

    progress.stopAnimation();
    progress.setValue(0);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: INTRO_DURATION,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        nextSlide();
      }
    });

    return () => {
      animation.stop();
      progress.stopAnimation();
    };
  }, [
    currentIndex,
    nextSlide,
    authLoading,
    user,
    introFinished,
    showOnboarding,
    checkingOnboarding,
    progress,
  ]);

  // --------------------------------------------------
  // SCROLL
  // --------------------------------------------------

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);

    if (index >= 0 && index < slides.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  // --------------------------------------------------
  // LOADING / INTRO
  // --------------------------------------------------
  if (showIntro) {
    return <BrandSplash onFinish={finishIntro} />;
  }

  if (authLoading || checkingOnboarding || !showOnboarding) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
        }}
      >
        <StatusBar style="light" />
      </View>
    );
  }

  // --------------------------------------------------
  // ONBOARDING CAROUSEL
  // --------------------------------------------------

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
      }}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* PROGRESS INDICATORS */}

      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 0,
          right: 0,
          zIndex: 30,
          paddingHorizontal: OUTER_GAP,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 5,
          }}
        >
          {slides.map((_, index) => {
            const completed = index < currentIndex;
            const active = index === currentIndex;

            return (
              <View
                key={index}
                style={{
                  height: 3,
                  flex: 1,
                  overflow: "hidden",
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.16)",
                }}
              >
                {completed && (
                  <View
                    style={{
                      height: "100%",
                      width: "100%",
                      borderRadius: 999,
                      backgroundColor: COLORS.accentLight,
                    }}
                  />
                )}

                {active && (
                  <Animated.View
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      backgroundColor: COLORS.accentLight,
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* FULL-SCREEN IMAGE CAROUSEL */}

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              height,
              paddingTop: insets.top + 48,
              paddingBottom: insets.bottom + 92,
              paddingHorizontal: OUTER_GAP,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 30,
                overflow: "hidden",
                backgroundColor: COLORS.surface,
                elevation: 8,
              }}
            >
              <Image
                source={{ uri: item.image }}
                resizeMode="cover"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />

              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.06)",
                }}
              />
            </View>
          </View>
        )}
      />

      {/* SKIP BUTTON */}

      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 18,
          left: 0,
          right: 0,
          paddingHorizontal: OUTER_GAP,
        }}
      >
        <Pressable
          onPress={() => void finishOnboarding()}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={{
            height: 54,
            borderRadius: 27,
            backgroundColor: COLORS.accent,
            alignItems: "center",
            justifyContent: "center",
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: COLORS.buttonText,
              fontSize: 15,
              fontWeight: "700",
              letterSpacing: 0.2,
            }}
          >
            Skip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
