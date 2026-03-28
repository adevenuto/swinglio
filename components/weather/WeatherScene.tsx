import { WeatherCondition } from "@/hooks/use-weather";
import React from "react";
import { StyleSheet, View } from "react-native";
import CloudyBackground from "./CloudyBackground";
import NightBackground from "./NightBackground";
import PartlyCloudyBackground from "./PartlyCloudyBackground";
import RainyBackground from "./RainyBackground";
import SnowyBackground from "./SnowyBackground";
import SunnyBackground from "./SunnyBackground";

export type SimpleCondition = "sunny" | "partly_cloudy" | "cloudy" | "rain" | "snow";

export function simplifyCondition(condition: WeatherCondition): SimpleCondition {
  switch (condition) {
    case "clear":
      return "sunny";
    case "clouds_few":
      return "partly_cloudy";
    case "clouds":
      return "cloudy";
    case "fog":
      return "cloudy";
    case "drizzle":
      return "rain";
    case "rain":
      return "rain";
    case "thunderstorm":
      return "rain";
    case "snow":
      return "snow";
    default:
      return "sunny";
  }
}

type Props = {
  condition: WeatherCondition;
  isNight: boolean;
};

export default function WeatherScene({ condition, isNight }: Props) {
  const simple = simplifyCondition(condition);
  const isThunderstorm = condition === "thunderstorm";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Night gets its own full background */}
      {isNight && simple !== "rain" && simple !== "snow" ? (
        <NightBackground />
      ) : (
        <>
          {simple === "sunny" && !isNight && <SunnyBackground />}
          {simple === "partly_cloudy" && !isNight && <PartlyCloudyBackground />}
          {simple === "cloudy" && <CloudyBackground isNight={isNight} />}
          {simple === "rain" && (
            <RainyBackground isNight={isNight} isThunderstorm={isThunderstorm} />
          )}
          {simple === "snow" && <SnowyBackground isNight={isNight} />}
        </>
      )}
    </View>
  );
}
