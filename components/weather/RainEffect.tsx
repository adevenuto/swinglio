import React, { useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const DROP_COUNT = 20;

type Drop = {
  x: number;
  height: number;
  width: number;
  duration: number;
  delay: number;
  opacity: number;
};

function RainDrop({ drop }: { drop: Drop }) {
  const translateY = useSharedValue(-drop.height);

  useEffect(() => {
    translateY.value = withDelay(
      drop.delay,
      withRepeat(
        withTiming(SCREEN_H + drop.height, {
          duration: drop.duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: "15deg" }],
    opacity: drop.opacity,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: drop.x,
          top: -drop.height,
          width: drop.width,
          height: drop.height,
          backgroundColor: "rgba(180, 210, 240, 0.6)",
          borderRadius: drop.width,
        },
        style,
      ]}
    />
  );
}

export default function RainEffect({ intensity = 1 }: { intensity?: number }) {
  const drops = useMemo<Drop[]>(() => {
    const count = Math.round(DROP_COUNT * intensity);
    return Array.from({ length: count }, () => ({
      x: Math.random() * SCREEN_W,
      height: 15 + Math.random() * 25,
      width: 1 + Math.random() * 1.5,
      duration: 800 + Math.random() * 1200,
      delay: Math.random() * 2000,
      opacity: 0.15 + Math.random() * 0.2,
    }));
  }, [intensity]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((drop, i) => (
        <RainDrop key={i} drop={drop} />
      ))}
    </View>
  );
}
