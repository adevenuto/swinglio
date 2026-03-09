import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";

export type AttestationStats = {
  attestedRounds: number;
  totalCompletedRounds: number;
  percentage: number;
  isLoading: boolean;
};

export function useAttestationStats(userId: string) {
  const [attestedRounds, setAttestedRounds] = useState(0);
  const [totalCompletedRounds, setTotalCompletedRounds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAttestedRounds(0);
      setTotalCompletedRounds(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // 1. Get round IDs where user has a score
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("round_id")
      .eq("golfer_id", userId);

    if (!scoreRows || scoreRows.length === 0) {
      setAttestedRounds(0);
      setTotalCompletedRounds(0);
      setIsLoading(false);
      return;
    }

    const roundIds = [
      ...new Set(scoreRows.map((s) => s.round_id).filter(Boolean)),
    ];

    // 2. Get completed rounds
    const { data: completedRounds } = await supabase
      .from("rounds")
      .select("id")
      .in("id", roundIds)
      .eq("status", "completed");

    const total = completedRounds?.length || 0;
    setTotalCompletedRounds(total);

    if (total === 0) {
      setAttestedRounds(0);
      setIsLoading(false);
      return;
    }

    const completedIds = completedRounds!.map((r) => r.id);

    // 3. Get attestations from OTHER players for these rounds
    const { data: attestations } = await supabase
      .from("attestations")
      .select("round_id, attester_id")
      .in("round_id", completedIds)
      .or(`attester_id.neq.${userId},attester_id.is.null`);

    // Count unique rounds that received at least one attestation from another player
    const attestedRoundIds = new Set(
      (attestations || []).map((a) => a.round_id),
    );
    setAttestedRounds(attestedRoundIds.size);
    setIsLoading(false);
  }, [userId]);

  const percentage =
    totalCompletedRounds > 0
      ? Math.round((attestedRounds / totalCompletedRounds) * 100)
      : 0;

  return { attestedRounds, totalCompletedRounds, percentage, isLoading, refresh };
}
