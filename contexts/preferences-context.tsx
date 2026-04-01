import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@swinglio/preferences";

export type DistanceUnit = "yards" | "meters";
export type TempUnit = "fahrenheit" | "celsius";

type PreferencesContextType = {
  distanceUnit: DistanceUnit;
  setDistanceUnit: (unit: DistanceUnit) => void;
  tempUnit: TempUnit;
  setTempUnit: (unit: TempUnit) => void;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("yards");
  const [tempUnit, setTempUnitState] = useState<TempUnit>("fahrenheit");

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.distanceUnit) setDistanceUnitState(parsed.distanceUnit);
        if (parsed.tempUnit) setTempUnitState(parsed.tempUnit);
      } catch {
        // ignore malformed data
      }
    });
  }, []);

  const persist = (patch: Record<string, string>) => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const current = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
    });
  };

  const setDistanceUnit = (unit: DistanceUnit) => {
    setDistanceUnitState(unit);
    persist({ distanceUnit: unit });
  };

  const setTempUnit = (unit: TempUnit) => {
    setTempUnitState(unit);
    persist({ tempUnit: unit });
  };

  return (
    <PreferencesContext.Provider value={{ distanceUnit, setDistanceUnit, tempUnit, setTempUnit }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};
