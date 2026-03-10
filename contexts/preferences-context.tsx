import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@swinglio/preferences";

export type DistanceUnit = "yards" | "meters";

type PreferencesContextType = {
  distanceUnit: DistanceUnit;
  setDistanceUnit: (unit: DistanceUnit) => void;
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

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.distanceUnit) setDistanceUnitState(parsed.distanceUnit);
      } catch {
        // ignore malformed data
      }
    });
  }, []);

  const setDistanceUnit = (unit: DistanceUnit) => {
    setDistanceUnitState(unit);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ distanceUnit: unit }));
  };

  return (
    <PreferencesContext.Provider value={{ distanceUnit, setDistanceUnit }}>
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
