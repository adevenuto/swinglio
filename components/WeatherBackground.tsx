import { useSubscription } from "@/contexts/subscription-context";
import { useWeather } from "@/hooks/use-weather";
import React from "react";
import { StyleSheet, View } from "react-native";
import WeatherScene from "./weather/WeatherScene";

export default function WeatherBackground() {
  const { isPro } = useSubscription();
  const { weather } = useWeather();

  if (!isPro) return null;

  // Default to clear/sunny while weather loads
  const condition = weather?.condition ?? "clear";
  const isNight = weather?.isNight ?? (new Date().getHours() >= 19 || new Date().getHours() < 6);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WeatherScene condition={condition} isNight={isNight} />

      {/* Subtle overlay for card readability */}
      <View style={styles.readabilityOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  readabilityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247, 245, 240, 0.15)",
  },
});
