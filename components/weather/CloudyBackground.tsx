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
  const s = scale;
  return (
    <Group>
      {/* Bottom fill circles */}
      <Circle cx={cx - 30 * s} cy={cy + 8 * s} r={22 * s} color="white" />
      <Circle cx={cx} cy={cy + 10 * s} r={24 * s} color="white" />
      <Circle cx={cx + 28 * s} cy={cy + 8 * s} r={20 * s} color="white" />
      {/* Top puffs */}
      <Circle cx={cx - 40 * s} cy={cy + 2 * s} r={25 * s} color="white" />
      <Circle cx={cx - 15 * s} cy={cy - 12 * s} r={32 * s} color="white" />
      <Circle cx={cx + 15 * s} cy={cy - 6 * s} r={28 * s} color="white" />
      <Circle cx={cx + 40 * s} cy={cy + 2 * s} r={22 * s} color="white" />
    </Group>
  );
}

const CLOUD_CANVAS_W = W + 400;

function AnimatedCloud({ cloud }: { cloud: CloudDef }) {
  // Start at a random position so clouds are visible immediately
  const startX = Math.random() * W;
  const translateX = useSharedValue(startX);

  useEffect(() => {
    // First: animate from start to right edge
    const firstDuration = ((CLOUD_CANVAS_W - startX) / cloud.speed) * 1000;
    translateX.value = withTiming(CLOUD_CANVAS_W, {
      duration: firstDuration,
      easing: Easing.linear,
    });

    // Then: loop from left to right
    const timeout = setTimeout(() => {
      translateX.value = -200;
      const loopDuration = ((CLOUD_CANVAS_W + 200) / cloud.speed) * 1000;
      translateX.value = withRepeat(
        withTiming(CLOUD_CANVAS_W, { duration: loopDuration, easing: Easing.linear }),
        -1,
        false,
      );
    }, firstDuration);

    return () => clearTimeout(timeout);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - 200 }],
    opacity: cloud.opacity,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: CLOUD_CANVAS_W,
          height: H,
        },
        style,
      ]}
    >
      <Canvas style={{ width: CLOUD_CANVAS_W, height: H }}>
        <Group>
          <BlurMask blur={cloud.blur} style="normal" />
          <CloudShape cx={200} cy={cloud.y} scale={cloud.scale} />
        </Group>
      </Canvas>
    </Animated.View>
  );
}

export default function CloudyBackground({ isNight = false }: { isNight?: boolean }) {
  const clouds = useMemo<CloudDef[]>(
    () => [
      { x: W * 0.3, y: H * 0.04, scale: 1.8, opacity: 0.35, speed: 10, blur: 20 },
      { x: W * 0.8, y: H * 0.09, scale: 1.3, opacity: 0.4, speed: 14, blur: 15 },
      { x: W * 0.1, y: H * 0.15, scale: 2.0, opacity: 0.3, speed: 8, blur: 25 },
      { x: W * 0.5, y: H * 0.22, scale: 1.5, opacity: 0.32, speed: 12, blur: 18 },
      { x: W * 0.7, y: H * 0.30, scale: 1.1, opacity: 0.28, speed: 16, blur: 14 },
      { x: W * 0.4, y: H * 0.37, scale: 1.7, opacity: 0.25, speed: 9, blur: 22 },
      { x: W * 0.2, y: H * 0.44, scale: 1.3, opacity: 0.22, speed: 11, blur: 20 },
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
