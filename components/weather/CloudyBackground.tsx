import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

const { width: W, height: H } = Dimensions.get("window");

type CloudDef = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  speed: number; // pixels per second drift
  blur: number;
};

function CloudShape({ cx, cy, scale }: { cx: number; cy: number; scale: number }) {
  // Build cloud from overlapping circles
  const s = scale;
  return (
    <Group>
      <Circle cx={cx - 40 * s} cy={cy + 5 * s} r={25 * s} color="white" />
      <Circle cx={cx - 15 * s} cy={cy - 10 * s} r={32 * s} color="white" />
      <Circle cx={cx + 15 * s} cy={cy - 5 * s} r={28 * s} color="white" />
      <Circle cx={cx + 40 * s} cy={cy + 5 * s} r={22 * s} color="white" />
      {/* Base to connect */}
      <Rect x={cx - 55 * s} y={cy} width={110 * s} height={20 * s} color="white" />
    </Group>
  );
}

function AnimatedCloud({ cloud }: { cloud: CloudDef }) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    const duration = (W + 200) / cloud.speed * 1000;
    translateX.value = withRepeat(
      withTiming(W + 200, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - 100 }],
    opacity: cloud.opacity,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          <BlurMask blur={cloud.blur} style="normal" />
          <CloudShape cx={cloud.x} cy={cloud.y} scale={cloud.scale} />
        </Group>
      </Canvas>
    </Animated.View>
  );
}

export default function CloudyBackground({ isNight = false }: { isNight?: boolean }) {
  const clouds = useMemo<CloudDef[]>(
    () => [
      { x: W * 0.3, y: H * 0.06, scale: 1.8, opacity: 0.25, speed: 4, blur: 20 },
      { x: W * 0.7, y: H * 0.12, scale: 1.4, opacity: 0.3, speed: 6, blur: 15 },
      { x: W * 0.2, y: H * 0.2, scale: 2.0, opacity: 0.2, speed: 3, blur: 25 },
      { x: W * 0.6, y: H * 0.28, scale: 1.2, opacity: 0.15, speed: 5, blur: 18 },
    ],
    [],
  );

  const skyColors = isNight
    ? ["#1A2535", "#2A3545", "#3A4858", "#4A5868"]
    : ["#7A8FA0", "#8EA3B5", "#A0B5C5", "#B8CAD8"];

  return (
    <>
      {/* Overcast sky */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={W} height={H}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, H)}
            colors={skyColors}
          />
        </Rect>
      </Canvas>

      {/* Animated cloud layers */}
      {clouds.map((cloud, i) => (
        <AnimatedCloud key={i} cloud={cloud} />
      ))}
    </>
  );
}
