import { supabase } from "@/lib/supabase";
import { computePlayerResult } from "@/lib/scoring-utils";
import { ScoreDetails } from "@/types/scoring";
import { useCallback, useState } from "react";

export type RecentRound = {
  id: number;
  course_id: number;
  creator_id: string;
  teebox_data: { name: string; color?: string; holes?: Record<string, { par: string; length: string }> };
  status: string;
  created_at: string;
  date_played: string | null;
  display_date: string;
  courses: { club_name: string; course_name: string };
  player_score: number | null;
  player_status: string;
  score_to_par: number | null;
  holes_completed: number | null;
  hole_count: number | null;
  needsAttestation: boolean;
};

export function useRecentRounds(userId: string, limit?: number) {
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecentRounds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Step 1: fetch completed/incomplete score rows for this player
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("round_id, score, score_details, player_status")
      .eq("golfer_id", userId)
      .in("player_status", ["completed", "incomplete"]);

    if (!scoreRows || scoreRows.length === 0) {
      setRecentRounds([]);
      setIsLoading(false);
      return;
    }

    const scoreMap = new Map(
      scoreRows.map((s) => [s.round_id, s]),
    );
    const roundIds = [...scoreMap.keys()].filter(Boolean);

    if (roundIds.length === 0) {
      setRecentRounds([]);
      setIsLoading(false);
      return;
    }

    // Step 2: fetch rounds (no round status filter)
    let query = supabase
      .from("rounds")
      .select(
        "id, course_id, creator_id, teebox_data, status, created_at, date_played, courses(club_name, course_name)",
      )
      .in("id", roundIds)
      .order("date_played", { ascending: false, nullsFirst: false });

    if (limit != null) {
      query = query.limit(limit);
    }

    const { data } = await query;

    if (data) {
      // Step 3: check attestation status
      // Fetch user's attestations and player counts for these rounds
      const fetchedRoundIds = data.map((r: any) => r.id);

      const [{ data: userAttestations }, { data: allScoresForRounds }] =
        await Promise.all([
          supabase
            .from("attestations")
            .select("round_id")
            .eq("attester_id", userId)
            .in("round_id", fetchedRoundIds),
          supabase
            .from("scores")
            .select("round_id, player_status")
            .in("round_id", fetchedRoundIds),
        ]);

      const attestedSet = new Set(
        (userAttestations || []).map((a: any) => Number(a.round_id)),
      );

      // Count eligible players per round (exclude withdrew)
      const playerCounts: Record<number, number> = {};
      for (const s of allScoresForRounds || []) {
        if (s.player_status !== "withdrew") {
          const rid = Number(s.round_id);
          playerCounts[rid] = (playerCounts[rid] || 0) + 1;
        }
      }

      // Step 4: merge + compute score_to_par
      const enriched: RecentRound[] = data.map((round: any) => {
        const scoreRow = scoreMap.get(round.id);
        let scoreToPar: number | null = null;
        let holesCompleted: number | null = null;
        let holeCount: number | null = null;

        if (scoreRow?.score_details && round.teebox_data?.holes) {
          const result = computePlayerResult(
            scoreRow.score_details as ScoreDetails,
            round.teebox_data.holes,
            userId,
            "",
          );
          scoreToPar = result.score_to_par;
          holesCompleted = result.holes_completed;
          holeCount = result.hole_count;
        }

        return {
          id: round.id,
          course_id: round.course_id,
          creator_id: round.creator_id,
          teebox_data: round.teebox_data,
          status: round.status,
          created_at: round.created_at,
          date_played: round.date_played ?? null,
          display_date: round.date_played ?? round.created_at,
          courses: round.courses,
          player_score: scoreRow?.score ?? null,
          player_status: scoreRow?.player_status ?? "completed",
          score_to_par: scoreToPar,
          holes_completed: holesCompleted,
          hole_count: holeCount,
          needsAttestation:
            (playerCounts[Number(round.id)] || 0) > 1 &&
            !attestedSet.has(Number(round.id)),
        };
      });

      setRecentRounds(enriched);
    }
    setIsLoading(false);
  }, [userId, limit]);

  return { recentRounds, isLoading, refresh };
}
