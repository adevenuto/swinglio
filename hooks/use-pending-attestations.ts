import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export type PendingAttestationRound = {
  round_id: number;
  course_name: string;
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
      .select("id, created_at, results_data, courses(name)")
      .in("id", roundIds)
      .eq("status", "completed");

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

    // 4. Get player counts
    const { data: allScores } = await supabase
      .from("scores")
      .select("round_id")
      .in(
        "round_id",
        roundsData.map((r) => r.id),
      );

    const playerCounts: Record<number, number> = {};
    for (const s of allScores || []) {
      if (s.round_id) {
        playerCounts[s.round_id] = (playerCounts[s.round_id] || 0) + 1;
      }
    }

    // 5. Filter to rounds not yet attested, with >1 player
    const pending: PendingAttestationRound[] = [];
    for (const r of roundsData) {
      const count = playerCounts[r.id] || 0;
      if (count <= 1) continue; // Solo rounds — skip
      if (attestedRoundIds.has(r.id)) continue; // Already attested

      const results = r.results_data as any;
      pending.push({
        round_id: r.id,
        course_name: (r.courses as any)?.name || "Unknown Course",
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
