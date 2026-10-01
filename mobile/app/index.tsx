import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const INTRO_DURATION = 3500;

const OUTER_GAP = 12;

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
    image: "https://ik.imagekit.io/tut1/MODEL1.mp4",
  },
];

export default function IntroScreen() {
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const [currentIndex, setCurrentIndex] = useState(0);

  const goToAuth = useCallback(() => {
    router.replace("/login");
  }, []);

  const nextSlide = useCallback(() => {
    if (currentIndex >= slides.length - 1) {
      goToAuth();
      return;
    }

    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  }, [currentIndex, goToAuth]);

  useEffect(() => {
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
      progress.stopAnimation();
    };
  }, [currentIndex, nextSlide]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);

    if (index >= 0 && index < slides.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  return (
    <View className="flex-1 bg-[#070A08]">
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* TOP PROGRESS */}

      <View
        className="absolute left-0 right-0 z-30"
        style={{
          top: insets.top + 12,
          paddingHorizontal: OUTER_GAP,
        }}
      >
        <View className="flex-row" style={{ gap: 5 }}>
          {slides.map((_, index) => {
            const completed = index < currentIndex;
            const active = index === currentIndex;

            return (
              <View
                key={index}
                className="h-[3px] flex-1 overflow-hidden rounded-full"
                style={{
                  backgroundColor: "rgba(255,255,255,0.16)",
                }}
              >
                {completed && (
                  <View
                    className="h-full w-full rounded-full"
                    style={{
                      backgroundColor: "#9DFFB5",
                    }}
                  />
                )}

                {active && (
                  <Animated.View
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: "#9DFFB5",
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

      {/* CAROUSEL */}

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
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
              backgroundColor: "#070A08",

              // OUTER GAP
              paddingTop: insets.top + 48,
              paddingBottom: insets.bottom + 92,
              paddingHorizontal: OUTER_GAP,
            }}
          >
            {/* IMAGE CARD */}

            <View
              style={{
                flex: 1,
                width: "100%",
                borderRadius: 30,
                overflow: "hidden",

                backgroundColor: "#101510",

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

              {/* VERY SUBTLE DARK TINT */}

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

      {/* BRAND */}

      {/* BOTTOM CONTROLS */}

      <View
        className="absolute left-0 right-0"
        style={{
          bottom: insets.bottom + 18,
          paddingHorizontal: OUTER_GAP,
        }}
      >
        {/* FULL WIDTH SKIP BUTTON */}

        <Pressable
          onPress={goToAuth}
          style={{
            height: 54,
            width: "100%",
            borderRadius: 27,
            backgroundColor: "#06c261",
            alignItems: "center",
            justifyContent: "center",

            elevation: 5,
          }}
        >
          <Text
            style={{
              color: "#071009",
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
