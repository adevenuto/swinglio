import {
  BlurMask,
  Canvas,
  Line,
  LinearGradient,
  Rect,
  Circle,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo, useRef } from "react";
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

const { width: W, height: H } = Dimensions.get("window");
const STREAK_COUNT = 35;

type Streak = {
  x: number;
  length: number;
  delay: number;
  duration: number;
  opacity: number;
};

function RainLayer() {
  const streaks = useMemo<Streak[]>(
    () =>
      Array.from({ length: STREAK_COUNT }, () => ({
        x: Math.random() * (W + 40) - 20,
        length: 30 + Math.random() * 50,
        delay: Math.random() * 1500,
        duration: 600 + Math.random() * 800,
        opacity: 0.15 + Math.random() * 0.25,
      })),
    [],
  );

  return (
    <>
      {streaks.map((s, i) => (
        <RainStreak key={i} streak={s} />
      ))}
    </>
  );
}

function RainStreak({ streak }: { streak: Streak }) {
  const translateY = useSharedValue(-streak.length);

  useEffect(() => {
    translateY.value = withDelay(
      streak.delay,
      withRepeat(
        withTiming(H + streak.length, {
          duration: streak.duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: streak.opacity,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: streak.x,
          top: -streak.length,
          width: 2,
          height: streak.length,
        },
        style,
      ]}
    >
      <Canvas style={{ width: 2, height: streak.length }}>
        <Line
          p1={vec(1, 0)}
          p2={vec(1, streak.length)}
          color="rgba(180, 210, 240, 0.7)"
          strokeWidth={1.5}
        >
          <BlurMask blur={1} style="normal" />
        </Line>
      </Canvas>
    </Animated.View>
  );
}

function LightningFlash({ isThunderstorm }: { isThunderstorm: boolean }) {
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = () => {
    opacity.value = withSequence(
      withTiming(0.35, { duration: 60 }),
      withTiming(0.05, { duration: 60 }),
      withDelay(
        120,
        withSequence(
          withTiming(0.2, { duration: 40 }),
          withTiming(0, { duration: 150 }),
        ),
      ),
    );
  };

  useEffect(() => {
    if (!isThunderstorm) return;

    const schedule = () => {
      timerRef.current = setTimeout(() => {
        flash();
        schedule();
      }, 5000 + Math.random() * 10000);
    };

    timerRef.current = setTimeout(() => {
      flash();
      schedule();
    }, 2000 + Math.random() * 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isThunderstorm]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!isThunderstorm) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle
          cx={W * (0.3 + Math.random() * 0.4)}
          cy={H * 0.1}
          r={W}
          color="rgba(220, 230, 255, 0.6)"
        >
          <BlurMask blur={80} style="normal" />
        </Circle>
      </Canvas>
    </Animated.View>
  );
}

export default function RainyBackground({
  isNight = false,
  isThunderstorm = false,
}: {
  isNight?: boolean;
  isThunderstorm?: boolean;
}) {
  const skyColors = isNight
    ? ["#0E161E", "#1A252F", "#283540", "#354550"]
    : isThunderstorm
      ? ["#2A3540", "#3A4855", "#4A5868", "#5A6878"]
      : ["#4A5568", "#5A6B7D", "#6B7D8E", "#7D8F9F"];

  return (
    <>
      {/* Moody sky gradient */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={W} height={H}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, H)}
            colors={skyColors}
          />
        </Rect>
      </Canvas>

      {/* Rain streaks */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <RainLayer />
      </View>

      {/* Lightning */}
      <LightningFlash isThunderstorm={isThunderstorm} />
    </>
  );
}
