import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export type RecentRound = {
  id: number;
  course_id: number;
  creator_id: string;
  teebox_data: { name: string; color?: string };
  status: string;
  created_at: string;
  courses: { name: string };
};

export function useRecentRounds(userId: string) {
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecentRounds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const { data: scoreRows } = await supabase
      .from("scores")
      .select("round_id")
      .eq("golfer_id", userId);

    if (!scoreRows || scoreRows.length === 0) {
      setRecentRounds([]);
      setIsLoading(false);
      return;
    }

    const roundIds = [
      ...new Set(scoreRows.map((s) => s.round_id).filter(Boolean)),
    ];

    if (roundIds.length === 0) {
      setRecentRounds([]);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from("rounds")
      .select(
        "id, course_id, creator_id, teebox_data, status, created_at, courses(name)",
      )
      .in("id", roundIds)
      .neq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setRecentRounds(data as unknown as RecentRound[]);
    }
    setIsLoading(false);
  }, [userId]);

  return { recentRounds, isLoading, refresh };
}
