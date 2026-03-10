import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

type PlayerLocation = { latitude: number; longitude: number };

export function usePlayerLocation(enabled: boolean) {
  const [location, setLocation] = useState<PlayerLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLocation(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            setError("permission_denied");
            setLoading(false);
          }
          return;
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (loc) => {
            if (!cancelled) {
              setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
              setLoading(false);
            }
          },
        );

        if (cancelled) {
          sub.remove();
        } else {
          subRef.current = sub;
        }
      } catch {
        if (!cancelled) {
          setError("unavailable");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [enabled]);

  return { location, error, loading };
}
