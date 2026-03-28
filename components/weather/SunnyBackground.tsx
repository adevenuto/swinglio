import {
  BlurMask,
  Canvas,
  Circle,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

const { width: W, height: H } = Dimensions.get("window");

const SUN_X = W * 0.78;
const SUN_Y = H * 0.08;

export default function SunnyBackground() {
  const glowOpacity = useSharedValue(0.14);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.22, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <>
      {/* Sky gradient */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={W} height={H}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, H)}
            colors={["#1B6CB0", "#4A9BD9", "#87CEEB", "#B8DCF0", "#F0E6C8"]}
            positions={[0, 0.25, 0.5, 0.75, 1]}
          />
        </Rect>

        {/* Sun disc — visible circle with softened edges */}
        <Circle cx={SUN_X} cy={SUN_Y} r={28} color="rgba(255, 250, 230, 0.85)">
          <BlurMask blur={6} style="normal" />
        </Circle>

        {/* Inner glow */}
        <Circle cx={SUN_X} cy={SUN_Y} r={50} color="rgba(255, 230, 150, 0.25)">
          <BlurMask blur={18} style="normal" />
        </Circle>

        {/* Outer glow */}
        <Circle cx={SUN_X} cy={SUN_Y} r={100} color="rgba(255, 210, 100, 0.1)">
          <BlurMask blur={35} style="normal" />
        </Circle>
      </Canvas>

      {/* Animated outer halo pulse */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={SUN_X} cy={SUN_Y} r={180} color="rgba(255, 215, 110, 0.15)">
            <BlurMask blur={60} style="normal" />
          </Circle>
        </Canvas>
      </Animated.View>
    </>
  );
}
