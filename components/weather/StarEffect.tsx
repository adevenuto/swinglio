import React, { useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const STAR_COUNT = 18;

type Star = {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  maxOpacity: number;
};

function TwinkleStar({ star }: { star: Star }) {
  const opacity = useSharedValue(star.maxOpacity * 0.2);

  useEffect(() => {
    opacity.value = withDelay(
      star.delay,
      withRepeat(
        withSequence(
          withTiming(star.maxOpacity, {
            duration: star.duration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(star.maxOpacity * 0.15, {
            duration: star.duration,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: "#FFFFFF",
        },
        style,
      ]}
    />
  );
}

export default function StarEffect() {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * SCREEN_W,
        y: Math.random() * (SCREEN_H * 0.6), // stars in upper 60%
        size: 1.5 + Math.random() * 1.5,
        duration: 2000 + Math.random() * 3000,
        delay: Math.random() * 4000,
        maxOpacity: 0.2 + Math.random() * 0.35,
      })),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star, i) => (
        <TwinkleStar key={i} star={star} />
      ))}
    </View>
  );
}
