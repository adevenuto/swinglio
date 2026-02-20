import { supabase } from "@/lib/supabase";
import { Teebox } from "@/hooks/use-course-search";
import { GameConfig } from "@/lib/game-config";
import { useCallback, useState } from "react";

export type League = {
  id: number;
  name: string | null;
  owner_id: string;
  course_id: number;
  teebox_data: Teebox;
  game_config: GameConfig | null;
  play_day: string | null;
  play_time: string | null;
  created_at: string;
  courses: { name: string };
  _userRole?: "coordinator" | "member";
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

    // Get league IDs + role where user is a member
    const { data: memberRows } = await supabase
      .from("league_users")
      .select("league_id, role")
      .eq("golfer_id", userId);

    if (!memberRows || memberRows.length === 0) {
      setLeagues([]);
      setIsLoading(false);
      return;
    }

    const roleByLeagueId = new Map<number, string>();
    const leagueIds = memberRows.map((r) => {
      roleByLeagueId.set(r.league_id, r.role);
      return r.league_id;
    });

    const { data, error } = await supabase
      .from("leagues")
      .select("*, courses(name)")
      .in("id", leagueIds)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const enriched = data.map((league: any) => ({
        ...league,
        _userRole: roleByLeagueId.get(league.id) ?? "member",
      }));
      setLeagues(enriched as League[]);
    }
    setIsLoading(false);
  }, [userId]);

  return { leagues, isLoading, refresh };
}
