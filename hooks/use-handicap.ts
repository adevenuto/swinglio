import { supabase } from "@/lib/supabase";
import {
  calculateAGS,
  calculateDifferential,
  calculateHandicapIndex,
  DIFFERENTIAL_TABLE,
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
        .select("id, round_id, score, score_details, player_status, self_attested")
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
          trend: null,
        });
        setIsLoading(false);
        return;
      }

      const roundIds = [...new Set(scoreRows.map((s) => s.round_id).filter(Boolean))];

      // 2. Fetch rounds with teebox_data, date_played, status, course name
      const { data: roundRows } = await supabase
        .from("rounds")
        .select("id, teebox_data, date_played, created_at, status, courses(course_name)")
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
          trend: null,
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
          // Total-only round: use scoreRow.score directly if available
          const totalScore = (scoreRow as any).score as number | null;
          if (totalScore != null && totalScore > 0 && teebox) {
            const courseRatingTotal = Number(teebox.courseRating);
            const slopeTotal = Number(teebox.slope);

            if (
              courseRatingTotal &&
              !isNaN(courseRatingTotal) &&
              courseRatingTotal >= 20 &&
              courseRatingTotal <= 90 &&
              slopeTotal &&
              !isNaN(slopeTotal) &&
              slopeTotal >= 55 &&
              slopeTotal <= 155
            ) {
              // Compute par from teebox holes
              const teeboxHoleKeysTotal = Object.keys(teebox.holes || {});
              const parTotal = teeboxHoleKeysTotal.reduce((sum, k) => {
                const p = parseInt(teebox.holes[k].par, 10);
                return sum + (isNaN(p) ? 0 : p);
              }, 0);

              if (parTotal > 0) {
                const holeCountTotal = teeboxHoleKeysTotal.length;
                let adjCourseRatingTotal = courseRatingTotal;
                if (holeCountTotal <= 9 && courseRatingTotal > parTotal * 1.5) {
                  adjCourseRatingTotal = courseRatingTotal / 2;
                }

                // Skip attestation check for self_attested total-only rounds
                if (!INCLUDE_UNATTESTED) {
                  const isSelfAttested = scoreRow.self_attested === true;
                  const hasPeerAttestation = attestedRoundIds.has(roundId);
                  if (!isSelfAttested && !hasPeerAttestation) {
                    excluded.push({ roundId, reason: "not_attested" });
                    continue;
                  }
                }

                const differentialTotal = calculateDifferential(
                  totalScore,
                  adjCourseRatingTotal,
                  slopeTotal,
                );

                const datePlayedTotal =
                  (round.date_played as string) ||
                  (round.created_at as string).split("T")[0];

                console.log(
                  `[HANDICAP DEBUG] Round ${roundId} (total-only): ` +
                    `score=${totalScore}, par=${parTotal}, ` +
                    `CR=${courseRatingTotal}, adjCR=${adjCourseRatingTotal}, ` +
                    `slope=${slopeTotal}, diff=${differentialTotal.toFixed(2)}`,
                );

                eligible.push({
                  roundId,
                  datePlayed: datePlayedTotal,
                  courseRating: adjCourseRatingTotal,
                  slopeRating: slopeTotal,
                  par: parTotal,
                  holeCount: holeCountTotal,
                  grossScore: totalScore,
                  adjustedGrossScore: totalScore,
                  wasAdjusted: false,
                  hasStrokeIndex: false,
                  isAttested: true,
                  differential: differentialTotal,
                });
                continue;
              }
            }
          }

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

        // Slope must be in USGA valid range (55–155)
        if (slopeRating < 55 || slopeRating > 155) {
          excluded.push({ roundId, reason: "invalid_slope" });
          continue;
        }

        // Course rating sanity check — no real course has CR outside ~25-85.
        // 9-hole CR: ~25-42, 18-hole CR: ~55-80. Using 20-90 for margin.
        if (courseRating < 20 || courseRating > 90) {
          excluded.push({ roundId, reason: "no_course_rating" });
          continue;
        }

        // Scored holes — only holes the player actually completed
        // Filter out empty (""), null, and zero scores — a valid golf score is always >= 1.
        // JSONB may return score as number 0 or string "0" for unplayed holes.
        const scoredHoleKeys = Object.keys(sd.holes).filter((k) => {
          const s = sd.holes[k].score;
          const parsed = parseInt(String(s), 10);
          return s != null && s !== "" && !isNaN(parsed) && parsed > 0;
        });
        const scoredHoleCount = scoredHoleKeys.length;
        if (scoredHoleCount === 0) {
          excluded.push({ roundId, reason: "total_only" });
          continue;
        }

        // Compute par from the SCORED holes only (match keys against teebox)
        const teeboxHoleKeys = Object.keys(teebox!.holes || {});
        if (teeboxHoleKeys.length === 0) {
          excluded.push({ roundId, reason: "no_par" });
          continue;
        }
        const par = scoredHoleKeys.reduce((sum, k) => {
          const teeHole = teebox!.holes[k];
          if (!teeHole) return sum;
          const p = parseInt(teeHole.par, 10);
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
        let adjCourseRating = courseRating;
        if (scoredHoleCount <= 9 && courseRating > par * 1.5) {
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

        // --- DEBUG: remove after verifying handicap is correct ---
        console.log(`[HANDICAP DEBUG] Round ${roundId}: ` +
          `scoredHoles=${scoredHoleCount}, par=${par}, gross=${grossScore}, ` +
          `AGS=${adjustedGrossScore}, CR=${courseRating}, adjCR=${adjCourseRating}, ` +
          `slope=${slopeRating}, diff=${differential.toFixed(2)}`);
        // --- END DEBUG ---

        eligible.push({
          roundId,
          datePlayed,
          courseRating: adjCourseRating,
          slopeRating,
          par,
          holeCount: scoredHoleCount,
          grossScore,
          adjustedGrossScore,
          wasAdjusted,
          hasStrokeIndex,
          isAttested: true,
          differential,
        });
      }

      // Build lookup for enriching differentials with course name + gross score
      const roundDetailMap = new Map<number, { courseName: string; grossScore: number }>();
      for (const e of eligible) {
        const round = roundMap.get(e.roundId);
        const courses = (round as any)?.courses;
        const courseName = courses?.course_name ?? "";
        roundDetailMap.set(e.roundId, { courseName, grossScore: e.grossScore });
      }

      // 5. Calculate handicap index
      // --- DEBUG: remove after verifying handicap is correct ---
      console.log(`[HANDICAP DEBUG] Eligible: ${eligible.length}, Excluded: ${excluded.length} (${excluded.map(e => `${e.roundId}:${e.reason}`).join(', ')})`);
      // --- END DEBUG ---
      const handicapResult = calculateHandicapIndex(eligible);
      handicapResult.excludedRounds = excluded;
      // --- DEBUG: remove after verifying handicap is correct ---
      console.log(`[HANDICAP DEBUG] Result: index=${handicapResult.handicapIndex}, method="${handicapResult.methodDescription}"`);
      // --- END DEBUG ---

      // 5b. Compute trend (normalized — uses same table entry for both sets
      // so threshold changes don't produce misleading arrows)
      if (handicapResult.handicapIndex != null && eligible.length >= 4) {
        const sorted = [...eligible].sort((a, b) => {
          const dateDiff =
            new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime();
          if (dateDiff !== 0) return dateDiff;
          return b.roundId - a.roundId;
        });

        const recent = sorted.slice(0, 20);
        const count = recent.length;
        const { used, adjustment } = DIFFERENTIAL_TABLE[Math.min(count, 20)];

        // "Previous" index: same table entry but exclude the newest round
        const withoutNewest = recent.slice(1);
        const prevByDiff = [...withoutNewest].sort(
          (a, b) => a.differential - b.differential,
        );
        const prevSum = prevByDiff
          .slice(0, used)
          .reduce((s, r) => s + r.differential, 0);
        const prevAvg = prevSum / used;
        const prevIndex = Math.round((prevAvg + adjustment) * 10) / 10;

        handicapResult.trend = Math.round(
          (handicapResult.handicapIndex - prevIndex) * 10,
        ) / 10;

        console.log(`[HANDICAP DEBUG] Trend: ${handicapResult.trend}, eligible=${eligible.length}`);
      }

      // Enrich differentials with course name and gross score
      for (const diff of handicapResult.differentials) {
        const detail = roundDetailMap.get(diff.roundId);
        if (detail) {
          diff.courseName = detail.courseName;
          diff.grossScore = detail.grossScore;
        }
      }

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
