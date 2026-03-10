import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { type Course, parseTeeboxes } from "./use-course-search";

export type NearbyCourse = Course & {
  distance_miles: number;
};

export function useNearbyCourses(limit = 10) {
  const [courses, setCourses] = useState<NearbyCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationDenied(true);
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { data, error } = await supabase.rpc("nearby_courses", {
          user_lat: location.coords.latitude,
          user_lng: location.coords.longitude,
          result_limit: limit,
        });

        if (!error && data) {
          setCourses(data as NearbyCourse[]);
        }
      } catch {
        // Location unavailable — fail silently
      } finally {
        setIsLoading(false);
      }
    })();
  }, [limit]);

  return { courses, isLoading, locationDenied };
}

export { parseTeeboxes };
