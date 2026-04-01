import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

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


const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_KEY ?? "";
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

let cachedWeather: { data: WeatherData; timestamp: number } | null = null;

function mapCondition(weatherId: number, clouds: number): WeatherCondition {
  // OpenWeatherMap weather condition codes
  // https://openweathermap.org/weather-conditions
  if (weatherId >= 200 && weatherId < 300) return "thunderstorm";
  if (weatherId >= 300 && weatherId < 400) return "drizzle";
  if (weatherId >= 500 && weatherId < 600) return "rain";
  if (weatherId >= 600 && weatherId < 700) return "snow";
  if (weatherId >= 700 && weatherId < 800) return "fog"; // mist, smoke, haze, fog
  if (weatherId === 800) return "clear";
  if (weatherId === 801) return "clouds_few";
  if (weatherId >= 802) return "clouds";
  return "clear";
}

let devOverrideCondition: WeatherCondition | null = null;
let devOverrideListeners: Array<() => void> = [];

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

function getOverrideData(): WeatherData | null {
  if (!devOverrideCondition) return null;
  return {
    condition: devOverrideCondition,
    temp: 55,
    isNight: devOverrideNight ?? (new Date().getHours() >= 19 || new Date().getHours() < 6),
    description: `dev override: ${devOverrideCondition}`,
    windSpeed: 8,
    windDeg: 180,
  };
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(() => getOverrideData() ?? cachedWeather?.data ?? null);
  const [isLoading, setIsLoading] = useState(() => !devOverrideCondition && !cachedWeather);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync override on mount (covers navigation between screens)
  useEffect(() => {
    const data = getOverrideData();
    if (data) {
      setWeather(data);
      setIsLoading(false);
    } else if (cachedWeather) {
      setWeather(cachedWeather.data);
      setIsLoading(false);
    }
  }, []);

  // Listen for dev override changes
  useEffect(() => {
    const listener = () => {
      const data = getOverrideData();
      if (data) {
        setWeather(data);
      } else {
        refresh();
      }
    };
    devOverrideListeners.push(listener);
    return () => {
      devOverrideListeners = devOverrideListeners.filter((fn) => fn !== listener);
    };
  }, []);

  const refresh = useCallback(async () => {
    // Skip API fetch when dev override is active
    if (devOverrideCondition) {
      const data = getOverrideData();
      if (data) setWeather(data);
      setIsLoading(false);
      return;
    }

    // Return cached data if fresh
    if (cachedWeather && Date.now() - cachedWeather.timestamp < CACHE_TTL) {
      setWeather(cachedWeather.data);
      setIsLoading(false);
      return;
    }

    if (!API_KEY) {
      setIsLoading(false);
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (__DEV__) console.log("[Weather] Location permission denied");
        setIsLoading(false);
        return;
      }

      // Try current position, fall back to last known
      let loc = await Location.getLastKnownPositionAsync();
      if (!loc) {
        try {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch {
          if (__DEV__) console.log("[Weather] Could not get current position");
        }
      }

      if (!loc) {
        if (__DEV__) console.log("[Weather] No location available, using city fallback");
      }

      // If no device location, fall back to city-based lookup
      const url = loc
        ? `https://api.openweathermap.org/data/2.5/weather` +
          `?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}` +
          `&appid=${API_KEY}&units=imperial`
        : `https://api.openweathermap.org/data/2.5/weather` +
          `?q=Chicago&appid=${API_KEY}&units=imperial`;

      if (__DEV__) console.log("[Weather] Fetching:", loc ? `${loc.coords.latitude.toFixed(2)}, ${loc.coords.longitude.toFixed(2)}` : "fallback city");

      const res = await fetch(url);
      if (!res.ok) {
        if (__DEV__) console.log("[Weather] API error:", res.status);
        setIsLoading(false);
        return;
      }

      const json = await res.json();

      const weatherId: number = json.weather?.[0]?.id ?? 800;
      const clouds: number = json.clouds?.all ?? 0;
      const now = Math.floor(Date.now() / 1000);
      const sunrise: number = json.sys?.sunrise ?? 0;
      const sunset: number = json.sys?.sunset ?? 0;
      const isNight = now < sunrise || now > sunset;

      const data: WeatherData = {
        condition: mapCondition(weatherId, clouds),
        temp: Math.round(json.main?.temp ?? 70),
        isNight,
        description: json.weather?.[0]?.description ?? "",
        windSpeed: Math.round(json.wind?.speed ?? 0),
        windDeg: Math.round(json.wind?.deg ?? 0),
      };

      if (__DEV__) console.log("[Weather] Result:", data.condition, data.isNight ? "night" : "day", data.temp + "°F", data.description);

      cachedWeather = { data, timestamp: Date.now() };
      setWeather(data);
    } catch (err) {
      console.error("useWeather error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Refresh every 15 minutes
    timeoutRef.current = setInterval(refresh, CACHE_TTL);
    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [refresh]);

  return { weather, isLoading, refresh };
}
