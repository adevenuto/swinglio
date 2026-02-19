import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export type LeagueUser = {
  id: number;
  league_id: number;
  golfer_id: string;
  role: "coordinator" | "member";
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};

export function useLeagueUsers(leagueId: number | string) {
  const [members, setMembers] = useState<LeagueUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("league_users")
      .select("id, league_id, golfer_id, role, profiles(id, first_name, last_name, email)")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMembers(data as unknown as LeagueUser[]);
    }
    setIsLoading(false);
  }, [leagueId]);

  const addMember = useCallback(
    async (golferId: string, role: "coordinator" | "member" = "member") => {
      const { error } = await supabase
        .from("league_users")
        .insert({ league_id: Number(leagueId), golfer_id: golferId, role });

      if (!error) {
        await fetchMembers();
      }
      return { error };
    },
    [leagueId, fetchMembers]
  );

  const removeMember = useCallback(
    async (leagueUserId: number) => {
      const { error } = await supabase
        .from("league_users")
        .delete()
        .eq("id", leagueUserId);

      if (!error) {
        await fetchMembers();
      }
      return { error };
    },
    [fetchMembers]
  );

  const updateMemberRole = useCallback(
    async (leagueUserId: number, role: "coordinator" | "member") => {
      const { error } = await supabase
        .from("league_users")
        .update({ role })
        .eq("id", leagueUserId);

      if (!error) {
        await fetchMembers();
      }
      return { error };
    },
    [fetchMembers]
  );

  return { members, isLoading, fetchMembers, addMember, removeMember, updateMemberRole };
}
