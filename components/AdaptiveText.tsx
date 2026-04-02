import { Color, Font, Type } from "@/constants/design-tokens";
import { useSubscription } from "@/contexts/subscription-context";
import { useWeather, WeatherCondition } from "@/hooks/use-weather";
import React from "react";
import { StyleProp, StyleSheet, TextStyle } from "react-native";
import { Text, TextProps } from "react-native-paper";

type Variant = "caption" | "body" | "bodySm" | "label" | "h3";

type Props = TextProps<string> & {
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
};

const VARIANT_STYLES: Record<Variant, TextStyle> = {
  caption: Type.caption,
  body: Type.body,
  bodySm: Type.bodySm,
  label: Type.label,
  h3: Type.h3,
};

function isDarkBackground(
  condition: WeatherCondition,
  isNight: boolean,
): boolean {
  if (isNight) return true;
  if (
    condition === "rain" ||
    condition === "thunderstorm" ||
    condition === "drizzle" ||
    condition === "clouds" ||
    condition === "fog"
  ) {
    return true;
  }
  return false;
}

function getAdaptiveColor(
  condition: WeatherCondition,
  isNight: boolean,
  variant?: Variant,
): string {
  const dark = isDarkBackground(condition, isNight);

  if (dark) {
    // White text for dark backgrounds
    return variant === "caption" || variant === "label" || variant === "bodySm"
      ? "rgba(255,255,255,0.7)"
      : "rgba(255,255,255,0.9)";
  }

  // Dark text for light backgrounds (sunny, clear day, snow, partly cloudy)
  return variant === "caption" || variant === "label" || variant === "bodySm"
    ? "rgba(20,40,70,0.6)"
    : "rgba(20,40,70,0.85)";
}

/**
 * Hook to get the current weather-adaptive color.
 * Returns null when weather is not active (free users or no data).
 */
export function useAdaptiveColor(): string | null {
  const { isPro } = useSubscription();
  const { weather } = useWeather();
  if (!isPro) return null;
  // Match WeatherBackground fallback: default to clear/day while loading
  const condition = weather?.condition ?? "clear";
  const isNight = weather?.isNight ?? (new Date().getHours() >= 19 || new Date().getHours() < 6);
  return getAdaptiveColor(condition, isNight);
}

/**
 * Weather-aware Text component.
 * Automatically adjusts text color based on the active weather background.
 * On screens without weather (or for free users), passes through styles unchanged.
 */
export default function AdaptiveText({
  variant,
  style,
  children,
  ...rest
}: Props) {
  const { isPro } = useSubscription();
  const { weather } = useWeather();

  const variantStyle = variant ? VARIANT_STYLES[variant] : undefined;

  // No weather active — use styles as-is
  if (!isPro) {
    return (
      <Text style={[variantStyle, style]} {...rest}>
        {children}
      </Text>
    );
  }

  // Match WeatherBackground fallback: default to clear/day while loading
  const condition = weather?.condition ?? "clear";
  const isNight = weather?.isNight ?? (new Date().getHours() >= 19 || new Date().getHours() < 6);

  const adaptiveColor = getAdaptiveColor(
    condition,
    isNight,
    variant,
  );

  return (
    <Text style={[variantStyle, style, { color: adaptiveColor, fontFamily: Font.semiBold }]} {...rest}>
      {children}
    </Text>
  );
}
