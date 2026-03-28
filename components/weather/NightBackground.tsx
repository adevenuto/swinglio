import {
  BlurMask,
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { Dimensions, StyleSheet } from "react-native";
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

type Star = {
  x: number;
  y: number;
  size: number;
  color: string;
  flickerDuration: number;
  flickerDelay: number;
  maxOpacity: number;
};

function TwinkleStar({ star }: { star: Star }) {
  const opacity = useSharedValue(star.maxOpacity * 0.3);

  useEffect(() => {
    opacity.value = withDelay(
      star.flickerDelay,
      withRepeat(
        withSequence(
          withTiming(star.maxOpacity, {
            duration: star.flickerDuration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(star.maxOpacity * 0.15, {
            duration: star.flickerDuration * 0.6,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(star.maxOpacity * 0.7, {
            duration: star.flickerDuration * 0.4,
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

  const canvasSize = star.size * 4 + 8;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: star.x - canvasSize / 2,
          top: star.y - canvasSize / 2,
          width: canvasSize,
          height: canvasSize,
        },
        style,
      ]}
    >
      <Canvas style={{ width: canvasSize, height: canvasSize }}>
        {/* Core */}
        <Circle
          cx={canvasSize / 2}
          cy={canvasSize / 2}
          r={star.size / 2}
          color={star.color}
        />
        {/* Glow */}
        <Circle
          cx={canvasSize / 2}
          cy={canvasSize / 2}
          r={star.size * 1.5}
          color={`${star.color}40`}
        >
          <BlurMask blur={3} style="normal" />
        </Circle>
      </Canvas>
    </Animated.View>
  );
}

export default function NightBackground() {
  const stars = useMemo<Star[]>(() => {
    const colors = [
      "#FFFFFF", // pure white
      "#FFF8E7", // warm white
      "#E8F0FF", // cool white
      "#FFE8D0", // warm amber
    ];

    return Array.from({ length: 45 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.7, // stars in upper 70%
      size: 1.5 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      flickerDuration: 400 + Math.random() * 600,
      flickerDelay: Math.random() * 3000,
      maxOpacity: 0.4 + Math.random() * 0.5,
    }));
  }, []);

  return (
    <>
      {/* Night sky gradient */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={W} height={H}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, H)}
            colors={["#0A0E1A", "#111B2E", "#1A2840", "#223350"]}
          />
        </Rect>
      </Canvas>

      {/* Stars */}
      {stars.map((star, i) => (
        <TwinkleStar key={i} star={star} />
      ))}
    </>
  );
}
