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
const FLAKE_COUNT = 25;

type Flake = {
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  swayAmount: number;
};

function SnowFlake({ flake }: { flake: Flake }) {
  const translateY = useSharedValue(-flake.size);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      flake.delay,
      withRepeat(
        withTiming(SCREEN_H + flake.size, {
          duration: flake.duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    translateX.value = withDelay(
      flake.delay,
      withRepeat(
        withSequence(
          withTiming(flake.swayAmount, {
            duration: flake.duration / 3,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(-flake.swayAmount, {
            duration: flake.duration / 3,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: flake.duration / 3,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: flake.opacity,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: flake.x,
          top: -flake.size,
          width: flake.size,
          height: flake.size,
          borderRadius: flake.size / 2,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
        },
        style,
      ]}
    />
  );
}

export default function SnowEffect() {
  const flakes = useMemo<Flake[]>(
    () =>
      Array.from({ length: FLAKE_COUNT }, () => ({
        x: Math.random() * SCREEN_W,
        size: 3 + Math.random() * 4,
        duration: 8000 + Math.random() * 7000,
        delay: Math.random() * 5000,
        opacity: 0.3 + Math.random() * 0.4,
        swayAmount: 15 + Math.random() * 25,
      })),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakes.map((flake, i) => (
        <SnowFlake key={i} flake={flake} />
      ))}
    </View>
  );
}
