import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { type Course, parseTeeboxes } from "./use-course-search";

export type NearbyCourse = Course & {
  distance_miles: number;
};

export function useNearbyCourses(limit = 10) {
  const [courses, setCourses] = useState<NearbyCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== "granted") {
          setLocationDenied(true);
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const { data, error } = await supabase.rpc("nearby_courses", {
          user_lat: location.coords.latitude,
          user_lng: location.coords.longitude,
          result_limit: limit,
        });
        if (cancelled) return;

        if (error) {
          console.error("nearby_courses RPC error:", error);
        } else if (data) {
          setCourses(data as NearbyCourse[]);
        }
      } catch (err) {
        console.error("useNearbyCourses error:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { courses, isLoading, locationDenied };
}

export { parseTeeboxes };
