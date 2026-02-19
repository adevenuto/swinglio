import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export type ActiveRound = {
  id: number;
  league_id: number;
  course_id: number;
  status: string;
  created_at: string;
  leagues: {
    id: number;
    courses: { name: string };
    teebox_data: { name: string };
  };
};

export function useActiveRounds(userId: string) {
  const [activeRounds, setActiveRounds] = useState<ActiveRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setActiveRounds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Get round IDs where this user has a score row
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("round_id")
      .eq("golfer_id", userId);

    if (!scoreRows || scoreRows.length === 0) {
      setActiveRounds([]);
      setIsLoading(false);
      return;
    }

    const roundIds = [
      ...new Set(scoreRows.map((s) => s.round_id).filter(Boolean)),
    ];

    if (roundIds.length === 0) {
      setActiveRounds([]);
      setIsLoading(false);
      return;
    }

    // Fetch active rounds with league + course info
    const { data } = await supabase
      .from("rounds")
      .select(
        "id, league_id, course_id, status, created_at, leagues(id, courses(name), teebox_data)"
      )
      .in("id", roundIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data) {
      setActiveRounds(data as unknown as ActiveRound[]);
    }
    setIsLoading(false);
  }, [userId]);

  return { activeRounds, isLoading, refresh };
}
