import AdaptiveText, { useAdaptiveColor } from "@/components/AdaptiveText";
import { Color, Font, Space } from "@/constants/design-tokens";
import { usePreferences } from "@/contexts/preferences-context";
import { WeatherCondition } from "@/hooks/use-weather";
import { useWeather } from "@/hooks/use-weather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  adaptive?: boolean;
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function getWeatherIconName(condition: WeatherCondition, isNight: boolean): IconName {
  if (isNight) {
    switch (condition) {
      case "clear":
        return "weather-night";
      case "clouds_few":
        return "weather-night-partly-cloudy";
      case "clouds":
      case "fog":
        return "weather-cloudy";
      case "rain":
      case "drizzle":
        return "weather-rainy";
      case "thunderstorm":
        return "weather-lightning-rainy";
      case "snow":
        return "weather-snowy";
      default:
        return "weather-night";
    }
  }

  switch (condition) {
    case "clear":
      return "weather-sunny";
    case "clouds_few":
      return "weather-partly-cloudy";
    case "clouds":
      return "weather-cloudy";
    case "fog":
      return "weather-fog";
    case "rain":
    case "drizzle":
      return "weather-rainy";
    case "thunderstorm":
      return "weather-lightning-rainy";
    case "snow":
      return "weather-snowy";
    default:
      return "weather-sunny";
  }
}

export default function WeatherBadge({ adaptive = true }: Props) {
  const { weather } = useWeather();
  const { tempUnit } = usePreferences();
  const adaptiveColor = useAdaptiveColor();

  if (!weather) return null;

  const iconName = getWeatherIconName(weather.condition, weather.isNight);
  const iconColor = adaptive ? (adaptiveColor ?? Color.neutral900) : Color.neutral900;
  const temp =
    tempUnit === "celsius"
      ? `${Math.round((weather.temp - 32) * 5 / 9)}°`
      : `${weather.temp}°`;

  const TempText = adaptive ? AdaptiveText : Text;

  return (
    <View style={styles.container}>
      <TempText style={styles.temp}>{temp}</TempText>
      <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  temp: {
    fontFamily: Font.bold,
    fontSize: 20,
    color: Color.neutral900,
    includeFontPadding: false,
  },
});
