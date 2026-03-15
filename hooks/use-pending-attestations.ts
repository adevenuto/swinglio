import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export type PendingAttestationRound = {
  round_id: number;
  course_name: string;
  course_name_sub: string | null;
  completed_at: string;
  player_count: number;
};

export function usePendingAttestations(userId: string) {
  const [pendingRounds, setPendingRounds] = useState<PendingAttestationRound[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPendingRounds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // 1. Get rounds user participated in
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("round_id")
      .eq("golfer_id", userId);

    if (!scoreRows || scoreRows.length === 0) {
      setPendingRounds([]);
      setIsLoading(false);
      return;
    }

    const roundIds = [
      ...new Set(scoreRows.map((s) => s.round_id).filter(Boolean)),
    ];

    if (roundIds.length === 0) {
      setPendingRounds([]);
      setIsLoading(false);
      return;
    }

    // 2. Get completed rounds with multiple players
    const { data: roundsData } = await supabase
      .from("rounds")
      .select("id, created_at, results_data, courses(club_name, course_name)")
      .in("id", roundIds)
      .in("status", ["completed", "incomplete"]);

    if (!roundsData || roundsData.length === 0) {
      setPendingRounds([]);
      setIsLoading(false);
      return;
    }

    // 3. Get user's existing attestations
    const { data: existingAttestations } = await supabase
      .from("attestations")
      .select("round_id")
      .eq("attester_id", userId)
      .in(
        "round_id",
        roundsData.map((r) => r.id),
      );

    const attestedRoundIds = new Set(
      (existingAttestations || []).map((a) => a.round_id),
    );

    // 4. Get player counts + statuses (exclude WD players from count)
    const { data: allScores } = await supabase
      .from("scores")
      .select("round_id, golfer_id, player_status")
      .in(
        "round_id",
        roundsData.map((r) => r.id),
      );

    const playerCounts: Record<number, number> = {};
    const userIneligibleRounds = new Set<number>();
    for (const s of allScores || []) {
      if (!s.round_id) continue;
      // Track if current user withdrew or is incomplete — they can't attest
      if (
        s.golfer_id === userId &&
        (s.player_status === "withdrew" || s.player_status === "incomplete")
      ) {
        userIneligibleRounds.add(s.round_id);
      }
      // Only count completed players (exclude withdrew + incomplete)
      if (s.player_status !== "withdrew" && s.player_status !== "incomplete") {
        playerCounts[s.round_id] = (playerCounts[s.round_id] || 0) + 1;
      }
    }

    // 5. Filter to rounds not yet attested, with >1 eligible player, user is eligible
    const pending: PendingAttestationRound[] = [];
    for (const r of roundsData) {
      const count = playerCounts[r.id] || 0;
      if (count <= 1) continue; // Solo rounds or only one completed player — skip
      if (attestedRoundIds.has(r.id)) continue; // Already attested
      if (userIneligibleRounds.has(r.id)) continue; // User withdrew/incomplete — skip

      const results = r.results_data as any;
      const clubName = (r.courses as any)?.club_name || "Unknown Course";
      const courseName = (r.courses as any)?.course_name || null;
      pending.push({
        round_id: r.id,
        course_name: clubName,
        course_name_sub: courseName && courseName !== clubName ? courseName : null,
        completed_at: results?.completed_at || r.created_at,
        player_count: count,
      });
    }

    // Sort by most recent first
    pending.sort(
      (a, b) =>
        new Date(b.completed_at).getTime() -
        new Date(a.completed_at).getTime(),
    );

    setPendingRounds(pending);
    setIsLoading(false);
  }, [userId]);

  return { pendingRounds, isLoading, refresh };
}
