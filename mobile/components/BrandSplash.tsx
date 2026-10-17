import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { VideoView, useVideoPlayer } from "expo-video";

const LIME = "#C8FF67";
const BLACK = "#10120D";

type Props = {
  onFinish: () => void;
};

export default function BrandSplash({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);

  const player = useVideoPlayer(
    require("@/assets/videos/agromart-germination2.mp4"),
    (p) => {
      p.loop = false;
      p.muted = true;
      p.volume = 0;
      p.playbackRate = 2.5;
      p.audioMixingMode = "doNotMix";
      p.play();
    },
  );

  useEffect(() => {
    const subscription = player.addListener("playToEnd", () => {
      if (finished.current) return;
      finished.current = true;

      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished: fadeFinished }) => {
        if (fadeFinished) onFinish();
      });
    });

    return () => subscription.remove();
  }, [player, opacity, onFinish]);

  return (
    <Animated.View style={[styles.screen, { opacity }]}>
      <StatusBar hidden />

      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Minimal branding over the video */}
      {/* <View pointerEvents="none" style={styles.brand}>
        <Text style={styles.wordmark}>
          Agro<Text style={styles.accent}>Mart</Text>
        </Text>
        <Text style={styles.tagline}>FROM GROWERS TO YOU</Text>
      </View> */}

      {/* Skip option for returning users in a hurry */}
      {/* <Text
        onPress={() => {
          if (finished.current) return;
          finished.current = true;
          player.pause();

          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(({ finished: fadeFinished }) => {
            if (fadeFinished) onFinish();
          });
        }}
        style={styles.skip}
      >
        Skip
      </Text> */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: BLACK,
    overflow: "hidden",
  },
  brand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "15%",
    alignItems: "center",
  },
  wordmark: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  accent: {
    color: LIME,
  },
  tagline: {
    color: LIME,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 3,
    marginTop: 10,
  },
  skip: {
    position: "absolute",
    top: 55,
    right: 22,
    color: "#FFFFFF",
    fontSize: 14,
    padding: 12,
  },
});
