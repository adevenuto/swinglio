import { useSubscription } from "@/contexts/subscription-context";
import { useWeather, WeatherCondition } from "@/hooks/use-weather";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import CloudEffect from "./weather/CloudEffect";
import LightningEffect from "./weather/LightningEffect";
import RainEffect from "./weather/RainEffect";
import SnowEffect from "./weather/SnowEffect";
import StarEffect from "./weather/StarEffect";
import SunEffect from "./weather/SunEffect";

type GradientSet = [string, string, string];

const DAY_GRADIENTS: Record<WeatherCondition, GradientSet> = {
  clear: ["#87CEEB", "#B0D4E8", "#F5EFE0"],
  clouds_few: ["#89A8C4", "#B5C9D9", "#E8E4D8"],
  clouds: ["#8A9BAE", "#A8B8C8", "#C8CED6"],
  rain: ["#5A6B7A", "#7A8B9A", "#94A3B0"],
  drizzle: ["#6B7D8D", "#8A9BAA", "#A3B0BB"],
  thunderstorm: ["#3A4550", "#4E5D68", "#6B7A85"],
  snow: ["#C8D6E0", "#D8E2EA", "#ECF0F4"],
  fog: ["#B8C0C8", "#C8D0D6", "#DDE2E6"],
};

const NIGHT_GRADIENTS: Record<WeatherCondition, GradientSet> = {
  clear: ["#0D1B2A", "#1B2838", "#2A3A4A"],
  clouds_few: ["#1A2530", "#263540", "#354555"],
  clouds: ["#1E2830", "#2A3540", "#384550"],
  rain: ["#151E25", "#1E2A32", "#283540"],
  drizzle: ["#182028", "#222E38", "#2E3A44"],
  thunderstorm: ["#0E151C", "#182228", "#222E38"],
  snow: ["#1E2835", "#2A3545", "#384858"],
  fog: ["#1A2028", "#252D35", "#323A42"],
};

// Near sunset/sunrise: warm tint overlay
function isGoldenHour(isNight: boolean): boolean {
  // Simplified: we could use sunrise/sunset times for precision
  // For now, rely on isNight transition
  return false;
}

export default function WeatherBackground() {
  const { isPro } = useSubscription();
  const { weather } = useWeather();

  // Fall back to clear sky gradient while weather loads
  const fallbackColors: GradientSet = ["#87CEEB", "#B0D4E8", "#F5EFE0"];

  if (!isPro) return null;

  const gradients = weather
    ? weather.isNight
      ? NIGHT_GRADIENTS
      : DAY_GRADIENTS
    : null;
  const colors = gradients ? gradients[weather!.condition] : fallbackColors;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base gradient */}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Condition-specific effects */}
      {weather?.condition === "clear" && !weather.isNight && <SunEffect />}
      {weather?.condition === "clear" && weather.isNight && <StarEffect />}

      {(weather?.condition === "clouds_few" || weather?.condition === "clouds") && (
        <CloudEffect density={weather.condition === "clouds" ? 1.5 : 1} />
      )}

      {weather?.condition === "drizzle" && <RainEffect intensity={0.5} />}

      {weather?.condition === "rain" && <RainEffect intensity={1} />}

      {weather?.condition === "thunderstorm" && (
        <>
          <RainEffect intensity={1.5} />
          <LightningEffect />
        </>
      )}

      {weather?.condition === "snow" && <SnowEffect />}

      {weather?.condition === "fog" && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(200, 210, 220, 0.15)" },
          ]}
        />
      )}

      {/* Subtle overlay to ensure card readability */}
      <View style={styles.readabilityOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  readabilityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247, 245, 240, 0.3)", // warm neutral50 tint
  },
});
