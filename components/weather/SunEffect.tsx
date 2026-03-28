import React, { useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

const { width: SCREEN_W } = Dimensions.get("window");

type Ray = {
  x: number;
  width: number;
  rotation: number;
  duration: number;
  opacity: number;
};

function SunRay({ ray }: { ray: Ray }) {
  const opacityVal = useSharedValue(ray.opacity * 0.5);

  useEffect(() => {
    opacityVal.value = withRepeat(
      withSequence(
        withTiming(ray.opacity, {
          duration: ray.duration,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(ray.opacity * 0.3, {
          duration: ray.duration,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacityVal.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: -50,
          left: ray.x,
          width: ray.width,
          height: 500,
          backgroundColor: "rgba(255, 223, 120, 0.15)",
          transform: [{ rotate: `${ray.rotation}deg` }],
        },
        style,
      ]}
    />
  );
}

export default function SunEffect() {
  const rays = useMemo<Ray[]>(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        x: -20 + i * (SCREEN_W / 3),
        width: 40 + Math.random() * 30,
        rotation: -25 + i * 12 + Math.random() * 5,
        duration: 6000 + Math.random() * 4000,
        opacity: 0.06 + Math.random() * 0.05,
      })),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {rays.map((ray, i) => (
        <SunRay key={i} ray={ray} />
      ))}
    </View>
  );
}
