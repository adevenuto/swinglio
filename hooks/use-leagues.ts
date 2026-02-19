import { supabase } from "@/lib/supabase";
import { Teebox } from "@/hooks/use-course-search";
import { GameConfig } from "@/lib/game-config";
import { useCallback, useState } from "react";

export type League = {
  id: number;
  organizer_id: string;
  course_id: number;
  teebox_data: Teebox;
  game_config: GameConfig | null;
  created_at: string;
  courses: { name: string };
};

export function useLeagues(userId: string) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLeagues([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Get league IDs where user is a member
    const { data: memberRows } = await supabase
      .from("league_users")
      .select("league_id")
      .eq("golfer_id", userId);

    if (!memberRows || memberRows.length === 0) {
      setLeagues([]);
      setIsLoading(false);
      return;
    }

    const leagueIds = memberRows.map((r) => r.league_id);

    const { data, error } = await supabase
      .from("leagues")
      .select("*, courses(name)")
      .in("id", leagueIds)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLeagues(data as League[]);
    }
    setIsLoading(false);
  }, [userId]);

  return { leagues, isLoading, refresh };
}
