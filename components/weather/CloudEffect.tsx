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

const { width: SCREEN_W } = Dimensions.get("window");

type Cloud = {
  y: number;
  width: number;
  height: number;
  duration: number;
  delay: number;
  opacity: number;
};

function CloudWisp({ cloud }: { cloud: Cloud }) {
  const translateX = useSharedValue(-cloud.width);

  useEffect(() => {
    translateX.value = withDelay(
      cloud.delay,
      withRepeat(
        withTiming(SCREEN_W + cloud.width, {
          duration: cloud.duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: cloud.opacity,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: cloud.y,
          left: -cloud.width,
          width: cloud.width,
          height: cloud.height,
          borderRadius: cloud.height / 2,
          backgroundColor: "rgba(255, 255, 255, 0.5)",
        },
        style,
      ]}
    />
  );
}

export default function CloudEffect({ density = 1 }: { density?: number }) {
  const count = Math.round(4 * density);

  const clouds = useMemo<Cloud[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        y: 30 + (i * 120) + Math.random() * 60,
        width: 120 + Math.random() * 100,
        height: 30 + Math.random() * 20,
        duration: 35000 + Math.random() * 25000,
        delay: Math.random() * 15000,
        opacity: 0.08 + Math.random() * 0.1,
      })),
    [count],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {clouds.map((cloud, i) => (
        <CloudWisp key={i} cloud={cloud} />
      ))}
    </View>
  );
}
