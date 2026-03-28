import {
  BlurMask,
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
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

const { width: W, height: H } = Dimensions.get("window");

type Flake = {
  x: number;
  size: number;
  blur: number;
  duration: number;
  delay: number;
  opacity: number;
  swayAmount: number;
  layer: "front" | "back";
};

function SnowFlake({ flake }: { flake: Flake }) {
  const translateY = useSharedValue(-flake.size * 2);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      flake.delay,
      withRepeat(
        withTiming(H + flake.size * 2, {
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
            duration: flake.duration / 4,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(-flake.swayAmount, {
            duration: flake.duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: flake.duration / 4,
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

  const canvasSize = flake.size + flake.blur * 2 + 4;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: flake.x - canvasSize / 2,
          top: -canvasSize,
          width: canvasSize,
          height: canvasSize,
        },
        style,
      ]}
    >
      <Canvas style={{ width: canvasSize, height: canvasSize }}>
        <Circle
          cx={canvasSize / 2}
          cy={canvasSize / 2}
          r={flake.size / 2}
          color="rgba(255, 255, 255, 0.9)"
        >
          <BlurMask blur={flake.blur} style="normal" />
        </Circle>
      </Canvas>
    </Animated.View>
  );
}

export default function SnowyBackground({ isNight = false }: { isNight?: boolean }) {
  const flakes = useMemo<Flake[]>(() => {
    const front: Flake[] = Array.from({ length: 12 }, () => ({
      x: Math.random() * W,
      size: 5 + Math.random() * 4,
      blur: 1,
      duration: 5000 + Math.random() * 3000,
      delay: Math.random() * 4000,
      opacity: 0.6 + Math.random() * 0.3,
      swayAmount: 20 + Math.random() * 20,
      layer: "front" as const,
    }));

    const back: Flake[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * W,
      size: 2 + Math.random() * 2.5,
      blur: 2 + Math.random() * 2,
      duration: 10000 + Math.random() * 8000,
      delay: Math.random() * 6000,
      opacity: 0.25 + Math.random() * 0.2,
      swayAmount: 10 + Math.random() * 15,
      layer: "back" as const,
    }));

    return [...back, ...front];
  }, []);

  const skyColors = isNight
    ? ["#152030", "#1E2D40", "#2A3D52", "#384D62"]
    : ["#B8CAD8", "#C8D8E5", "#D8E5EF", "#E8EFF5"];

  return (
    <>
      {/* Snow sky gradient */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={W} height={H}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, H)}
            colors={skyColors}
          />
        </Rect>
      </Canvas>

      {/* Snowflakes */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {flakes.map((flake, i) => (
          <SnowFlake key={i} flake={flake} />
        ))}
      </View>
    </>
  );
}
