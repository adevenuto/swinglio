import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

export default function LightningEffect() {
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = () => {
    opacity.value = withSequence(
      withTiming(0.25, { duration: 80 }),
      withTiming(0, { duration: 80 }),
      withDelay(
        150,
        withSequence(
          withTiming(0.12, { duration: 60 }),
          withTiming(0, { duration: 100 }),
        ),
      ),
    );
  };

  const scheduleNext = () => {
    const delay = 6000 + Math.random() * 12000; // 6-18 seconds
    timerRef.current = setTimeout(() => {
      flash();
      scheduleNext();
    }, delay);
  };

  useEffect(() => {
    // First flash after 2-5 seconds
    timerRef.current = setTimeout(() => {
      flash();
      scheduleNext();
    }, 2000 + Math.random() * 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }, style]}
      pointerEvents="none"
    />
  );
}
