import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { WeatherCondition, WeatherData } from "@/hooks/use-weather";
import {
  getDevWeatherOverride,
  getDevNightOverride,
} from "@/hooks/use-weather";

const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_KEY ?? "";
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

type WeatherContextType = {
  weather: WeatherData | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

function mapCondition(weatherId: number): WeatherCondition {
  if (weatherId >= 200 && weatherId < 300) return "thunderstorm";
  if (weatherId >= 300 && weatherId < 400) return "drizzle";
  if (weatherId >= 500 && weatherId < 600) return "rain";
  if (weatherId >= 600 && weatherId < 700) return "snow";
  if (weatherId >= 700 && weatherId < 800) return "fog";
  if (weatherId === 800) return "clear";
  if (weatherId === 801) return "clouds_few";
  if (weatherId >= 802) return "clouds";
  return "clear";
}

function getOverrideData(): WeatherData | null {
  const condition = getDevWeatherOverride();
  if (!condition) return null;
  const nightOverride = getDevNightOverride();
  return {
    condition,
    temp: 55,
    isNight: nightOverride ?? (new Date().getHours() >= 19 || new Date().getHours() < 6),
    description: `dev override: ${condition}`,
    windSpeed: 8,
    windDeg: 180,
  };
}

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const [weather, setWeather] = useState<WeatherData | null>(
    () => getOverrideData() ?? null,
  );
  const [isLoading, setIsLoading] = useState(
    () => !getDevWeatherOverride(),
  );
  const cachedRef = useRef<{ data: WeatherData; timestamp: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    // Dev override — skip API
    const override = getOverrideData();
    if (override) {
      setWeather(override);
      setIsLoading(false);
      return;
    }

    // Return cached data if fresh
    if (cachedRef.current && Date.now() - cachedRef.current.timestamp < CACHE_TTL) {
      setWeather(cachedRef.current.data);
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

      const url = loc
        ? `https://api.openweathermap.org/data/2.5/weather` +
          `?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}` +
          `&appid=${API_KEY}&units=imperial`
        : `https://api.openweathermap.org/data/2.5/weather` +
          `?q=Chicago&appid=${API_KEY}&units=imperial`;

      if (__DEV__)
        console.log(
          "[Weather] Fetching:",
          loc
            ? `${loc.coords.latitude.toFixed(2)}, ${loc.coords.longitude.toFixed(2)}`
            : "fallback city",
        );

      const res = await fetch(url);
      if (!res.ok) {
        if (__DEV__) console.log("[Weather] API error:", res.status);
        setIsLoading(false);
        return;
      }

      const json = await res.json();

      const weatherId: number = json.weather?.[0]?.id ?? 800;
      const now = Math.floor(Date.now() / 1000);
      const sunrise: number = json.sys?.sunrise ?? 0;
      const sunset: number = json.sys?.sunset ?? 0;
      const isNight = now < sunrise || now > sunset;

      const data: WeatherData = {
        condition: mapCondition(weatherId),
        temp: Math.round(json.main?.temp ?? 70),
        isNight,
        description: json.weather?.[0]?.description ?? "",
        windSpeed: Math.round(json.wind?.speed ?? 0),
        windDeg: Math.round(json.wind?.deg ?? 0),
      };

      if (__DEV__)
        console.log(
          "[Weather] Result:",
          data.condition,
          data.isNight ? "night" : "day",
          data.temp + "°F",
          data.description,
        );

      cachedRef.current = { data, timestamp: Date.now() };
      setWeather(data);
    } catch (err) {
      console.error("Weather fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount + refresh every 15 minutes
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, CACHE_TTL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // Listen for dev override changes
  useEffect(() => {
    const { devOverrideListeners } = require("@/hooks/use-weather");
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
      const idx = devOverrideListeners.indexOf(listener);
      if (idx >= 0) devOverrideListeners.splice(idx, 1);
    };
  }, [refresh]);

  return (
    <WeatherContext.Provider value={{ weather, isLoading, refresh }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeatherContext() {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error("useWeatherContext must be used within a WeatherProvider");
  }
  return context;
}
