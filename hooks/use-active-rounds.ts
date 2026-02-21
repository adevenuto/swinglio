import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export type ActiveRound = {
  id: number;
  course_id: number;
  creator_id: string;
  teebox_data: { name: string; color?: string };
  status: string;
  created_at: string;
  courses: { name: string };
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

    // Fetch active rounds with course info (teebox_data is on rounds now)
    const { data } = await supabase
      .from("rounds")
      .select("id, course_id, creator_id, teebox_data, status, created_at, courses(name)")
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
