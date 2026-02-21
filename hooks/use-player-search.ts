import { supabase } from "@/lib/supabase";
import { useCallback, useRef, useState } from "react";

export type Player = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type PlayerScore = {
  id: number;
  score: number | null;
  course_id: number | null;
  created_at: string | null;
};

export function usePlayerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
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
      const trimmed = text.trim();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, display_name, email, avatar_url")
        .or(
          `first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`
        )
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

export function usePlayerScores(playerId: string | null) {
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchScores = useCallback(async () => {
    if (!playerId) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("scores")
      .select("id, score, course_id, created_at")
      .eq("golfer_id", playerId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setScores(data);
    }
    setIsLoading(false);
  }, [playerId]);

  return { scores, isLoading, fetchScores };
}
