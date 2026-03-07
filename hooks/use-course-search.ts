import { supabase } from "@/lib/supabase";
import { useCallback, useRef, useState } from "react";

export type Course = {
  id: number;
  name: string;
  street: string | null;
  state: string | null;
  postal_code: string | null;
  city_id: number;
  state_id: number;
  layout_data: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
};

export type Teebox = {
  order: number;
  name: string;
  color?: string;
  secondaryColor?: string;
  slope?: number;
  courseRating?: number;
  totalYardage?: number;
  holes: Record<string, { par: string; length: string; handicap?: number }>;
};

export type LayoutData = {
  teeboxes: Teebox[];
  hole_count: number;
};

export function useCourseSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((text: string) => {
    setQuery(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (text.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceTimer.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .ilike("name", `%${text.trim()}%`)
        .limit(20);

      if (!error && data) {
        setResults(data);
      }
      setIsSearching(false);
    }, 300);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsSearching(false);
  }, []);

  return { query, results, isSearching, search, clearSearch };
}

export function parseTeeboxes(layoutData: string | null): Teebox[] {
  if (!layoutData) return [];
  try {
    const parsed: LayoutData = JSON.parse(layoutData);
    return parsed.teeboxes || [];
  } catch {
    return [];
  }
}

/** Returns true if at least one teebox has both slope and courseRating */
export function courseHasRatings(layoutData: string | null): boolean {
  const teeboxes = parseTeeboxes(layoutData);
  return teeboxes.some((t) => t.slope != null && t.courseRating != null);
}
