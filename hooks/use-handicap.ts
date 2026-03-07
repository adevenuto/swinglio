import { supabase } from "@/lib/supabase";
import {
  calculateAGS,
  calculateDifferential,
  calculateHandicapIndex,
} from "@/lib/handicap";
import { ScoreDetails } from "@/types/scoring";
import {
  HandicapEligibleRound,
  HandicapExcludedRound,
  HandicapResult,
} from "@/types/handicap";
import { Teebox } from "@/hooks/use-course-search";
import { useCallback, useState } from "react";

/** Set to true during development to include unattested rounds */
const INCLUDE_UNATTESTED = false;

export function useHandicap(userId: string) {
  const [result, setResult] = useState<HandicapResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setResult(null);
      return;
    }
    setIsLoading(true);

    try {
      // 1. Fetch all completed/incomplete score rows for this player
      const { data: scoreRows } = await supabase
        .from("scores")
        .select("id, round_id, score_details, player_status, self_attested")
        .eq("golfer_id", userId)
        .eq("player_status", "completed");

      if (!scoreRows || scoreRows.length === 0) {
        setResult({
          handicapIndex: null,
          differentials: [],
          eligibleCount: 0,
          usedCount: 0,
          excludedRounds: [],
          methodDescription: "No eligible rounds",
          lastUpdated: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }

      const roundIds = [...new Set(scoreRows.map((s) => s.round_id).filter(Boolean))];

      // 2. Fetch rounds with teebox_data, date_played, status
      const { data: roundRows } = await supabase
        .from("rounds")
        .select("id, teebox_data, date_played, created_at, status")
        .in("id", roundIds)
        .in("status", ["completed", "incomplete"]);

      if (!roundRows || roundRows.length === 0) {
        setResult({
          handicapIndex: null,
          differentials: [],
          eligibleCount: 0,
          usedCount: 0,
          excludedRounds: [],
          methodDescription: "No eligible rounds",
          lastUpdated: new Date().toISOString(),
        });
        setIsLoading(false);
        return;
      }

      const roundMap = new Map(roundRows.map((r) => [r.id, r]));

      // 3. Fetch attestations for these rounds (from other players)
      const { data: attestationRows } = await supabase
        .from("attestations")
        .select("round_id, attester_id")
        .in("round_id", roundIds);

      // Build a set of round IDs that have at least one attestation from another player
      const attestedRoundIds = new Set<number>();
      if (attestationRows) {
        for (const att of attestationRows) {
          if (att.attester_id !== userId) {
            attestedRoundIds.add(att.round_id);
          }
        }
      }

      // 4. Validate and compute for each score row
      const eligible: HandicapEligibleRound[] = [];
      const excluded: HandicapExcludedRound[] = [];

      for (const scoreRow of scoreRows) {
        const round = roundMap.get(scoreRow.round_id);
        if (!round) continue;

        const roundId = round.id as number;
        const teebox = round.teebox_data as Teebox | null;

        // Withdrew check
        if (scoreRow.player_status === "withdrew") {
          excluded.push({ roundId, reason: "withdrew" });
          continue;
        }

        // Has hole-by-hole data?
        const sd = scoreRow.score_details as ScoreDetails | null;
        if (!sd || !sd.holes || Object.keys(sd.holes).length === 0) {
          excluded.push({ roundId, reason: "total_only" });
          continue;
        }

        // Parse courseRating and slope as numbers (JSONB may store as string)
        const courseRating = Number(teebox?.courseRating);
        const slopeRating = Number(teebox?.slope);

        // Has course rating?
        if (!courseRating || isNaN(courseRating)) {
          excluded.push({ roundId, reason: "no_course_rating" });
          continue;
        }

        // Has slope?
        if (!slopeRating || isNaN(slopeRating)) {
          excluded.push({ roundId, reason: "no_slope" });
          continue;
        }

        // Compute par from teebox holes
        const holeKeys = Object.keys(teebox!.holes || {});
        if (holeKeys.length === 0) {
          excluded.push({ roundId, reason: "no_par" });
          continue;
        }
        const par = holeKeys.reduce((sum, k) => {
          const p = parseInt(teebox!.holes[k].par, 10);
          return sum + (isNaN(p) ? 0 : p);
        }, 0);
        if (par === 0) {
          excluded.push({ roundId, reason: "no_par" });
          continue;
        }

        // Detect 9-hole round with 18-hole courseRating from the API.
        // 9-hole courseRating is typically 28-40; if it's > par × 1.5 on a
        // ≤9-hole round, the API provided the 18-hole value — halve it
        // per USGA approximation.
        const holeCount = holeKeys.length;
        let adjCourseRating = courseRating;
        if (holeCount <= 9 && courseRating > par * 1.5) {
          adjCourseRating = courseRating / 2;
        }

        // Attestation check
        if (!INCLUDE_UNATTESTED) {
          const isSelfAttested = scoreRow.self_attested === true;
          const hasPeerAttestation = attestedRoundIds.has(roundId);
          if (!isSelfAttested && !hasPeerAttestation) {
            excluded.push({ roundId, reason: "not_attested" });
            continue;
          }
        }

        // Compute AGS (pass null for handicapIndex — first-pass, no NDB)
        const { adjustedGrossScore, grossScore, wasAdjusted, hasStrokeIndex } =
          calculateAGS(sd, adjCourseRating, slopeRating, par, null);

        if (grossScore === 0) continue;

        // Compute differential
        const differential = calculateDifferential(
          adjustedGrossScore,
          adjCourseRating,
          slopeRating,
        );

        // Use date_played, fall back to created_at
        const datePlayed =
          (round.date_played as string) ||
          (round.created_at as string).split("T")[0];

        eligible.push({
          roundId,
          datePlayed,
          courseRating: adjCourseRating,
          slopeRating,
          par,
          holeCount,
          grossScore,
          adjustedGrossScore,
          wasAdjusted,
          hasStrokeIndex,
          isAttested: true,
          differential,
        });
      }

      // 5. Calculate handicap index
      const handicapResult = calculateHandicapIndex(eligible);
      handicapResult.excludedRounds = excluded;

      // 6. Cache to profile
      if (handicapResult.handicapIndex != null) {
        await supabase
          .from("profiles")
          .update({
            handicap_index: handicapResult.handicapIndex,
            handicap_updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      setResult(handicapResult);
    } catch (err) {
      console.error("useHandicap error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { result, isLoading, refresh };
}
