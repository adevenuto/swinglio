import { useWeatherContext } from "@/contexts/weather-context";

export type WeatherCondition =
  | "clear"
  | "clouds_few"
  | "clouds"
  | "rain"
  | "drizzle"
  | "thunderstorm"
  | "snow"
  | "fog";

export type WeatherData = {
  condition: WeatherCondition;
  temp: number; // Fahrenheit
  isNight: boolean;
  description: string;
  windSpeed: number; // mph
  windDeg: number; // degrees (0 = N, 90 = E, etc.)
};

const WIND_ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"] as const;

export function windDegToArrow(deg: number): string {
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return WIND_ARROWS[index];
}

// Dev override state — kept in module scope so the context can read it
let devOverrideCondition: WeatherCondition | null = null;
export let devOverrideListeners: Array<() => void> = [];
let devOverrideNight: boolean | null = null;

export function setDevWeatherOverride(condition: WeatherCondition | null, isNight?: boolean) {
  devOverrideCondition = condition;
  devOverrideNight = isNight ?? null;
  devOverrideListeners.forEach((fn) => fn());
}

export function getDevNightOverride(): boolean | null {
  return devOverrideNight;
}

export function getDevWeatherOverride(): WeatherCondition | null {
  return devOverrideCondition;
}

/** Thin wrapper — all logic lives in WeatherProvider */
export function useWeather() {
  return useWeatherContext();
}
