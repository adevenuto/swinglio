import { supabase } from "@/lib/supabase";
import { ScoreDetails } from "@/types/scoring";
import { useCallback, useState } from "react";

export type ScoreCategory = "eagle" | "birdie" | "par" | "bogey" | "doublePlus";

export type DetailedStats = {
  // Score distribution
  scoreDistribution: Record<ScoreCategory, number> | null; // percentages

  // Par performance (avg score relative to par)
  avgPar3: number | null;
  avgPar4: number | null;
  avgPar5: number | null;

  // Putting breakdown
  onePuttPct: number | null;
  twoPuttPct: number | null;
  threePuttPlusPct: number | null;

  // Scoring trend (last 20 rounds, chronological)
  scoringTrend: { roundId: number; datePlayed: string; scoreToPar: number }[];

  // Fairway miss pattern
  fairwayMiss: {
    hitPct: number;
    leftPct: number;
    rightPct: number;
    totalTracked: number;
  } | null;

  // Penalty & bunker breakdown
  penaltyBreakdown: { water: number; ob: number; unplayable: number } | null;
  bunkerBreakdown: { greenside: number; fairway: number } | null;
  penaltyRoundsCount: number;

  // Front 9 vs Back 9
  avgFront9: number | null;
  avgBack9: number | null;
};

const EMPTY: DetailedStats = {
  scoreDistribution: null,
  avgPar3: null,
  avgPar4: null,
  avgPar5: null,
  onePuttPct: null,
  twoPuttPct: null,
  threePuttPlusPct: null,
  scoringTrend: [],
  fairwayMiss: null,
  penaltyBreakdown: null,
  bunkerBreakdown: null,
  penaltyRoundsCount: 0,
  avgFront9: null,
  avgBack9: null,
};

export function useDetailedStats(userId: string) {
  const [stats, setStats] = useState<DetailedStats>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats(EMPTY);
      return;
    }
    setIsLoading(true);

    try {
      // Fetch score rows
      const { data: scoreRows } = await supabase
        .from("scores")
        .select("round_id, score, score_details")
        .eq("golfer_id", userId)
        .eq("player_status", "completed");

      if (!scoreRows || scoreRows.length === 0) {
        setStats(EMPTY);
        setIsLoading(false);
        return;
      }

      // Fetch round dates for scoring trend
      const roundIds = [...new Set(scoreRows.map((s) => s.round_id).filter(Boolean))];
      const { data: roundRows } = await supabase
        .from("rounds")
        .select("id, date_played, created_at")
        .in("id", roundIds)
        .in("status", ["completed", "incomplete"]);

      const roundDateMap = new Map<number, string>();
      if (roundRows) {
        for (const r of roundRows) {
          roundDateMap.set(
            r.id as number,
            (r.date_played as string) ?? (r.created_at as string).split("T")[0],
          );
        }
      }

      // Accumulators
      let eagle = 0, birdie = 0, par = 0, bogey = 0, doublePlus = 0;
      let totalScoredHoles = 0;

      const par3Scores: number[] = [];
      const par4Scores: number[] = [];
      const par5Scores: number[] = [];

      let onePutt = 0, twoPutt = 0, threePuttPlus = 0, totalPuttHoles = 0;

      let fwyHit = 0, fwyLeft = 0, fwyRight = 0, fwyTotal = 0;

      let penWater = 0, penOb = 0, penUnplayable = 0;
      let bunkGreenside = 0, bunkFairway = 0;
      let roundsWithPenalties = 0;

      const front9Scores: number[] = [];
      const back9Scores: number[] = [];

      // Per-round data for scoring trend
      const roundScores: { roundId: number; datePlayed: string; scoreToPar: number }[] = [];

      for (const row of scoreRows) {
        const sd = row.score_details as ScoreDetails | null;
        if (!sd?.holes) continue;

        const entries = Object.entries(sd.holes);
        let roundScore = 0;
        let roundPar = 0;
        let roundFront = 0, roundFrontPar = 0, frontCount = 0;
        let roundBack = 0, roundBackPar = 0, backCount = 0;
        let roundHasPenalty = false;

        for (const [key, hole] of entries) {
          const score = parseInt(hole.score, 10);
          const holePar = parseInt(hole.par, 10);
          if (isNaN(score) || score <= 0 || isNaN(holePar)) continue;

          totalScoredHoles++;
          roundScore += score;
          roundPar += holePar;

          // Score distribution
          const diff = score - holePar;
          if (diff <= -2) eagle++;
          else if (diff === -1) birdie++;
          else if (diff === 0) par++;
          else if (diff === 1) bogey++;
          else doublePlus++;

          // Par performance
          if (holePar === 3) par3Scores.push(diff);
          else if (holePar === 4) par4Scores.push(diff);
          else if (holePar >= 5) par5Scores.push(diff);

          // Front/back 9
          const holeNum = parseInt(key.replace("hole-", ""), 10);
          if (!isNaN(holeNum)) {
            if (holeNum <= 9) {
              roundFront += score;
              roundFrontPar += holePar;
              frontCount++;
            } else {
              roundBack += score;
              roundBackPar += holePar;
              backCount++;
            }
          }

          // Stats-based metrics
          if (hole.stats) {
            // Putts
            if (hole.stats.putts != null) {
              totalPuttHoles++;
              if (hole.stats.putts === 1) onePutt++;
              else if (hole.stats.putts === 2) twoPutt++;
              else if (hole.stats.putts >= 3) threePuttPlus++;
            }

            // Fairway (par 4s and 5s only)
            if ((holePar === 4 || holePar >= 5) && hole.stats.fairway != null) {
              fwyTotal++;
              if (hole.stats.fairway === "hit") fwyHit++;
              else if (hole.stats.fairway === "left") fwyLeft++;
              else if (hole.stats.fairway === "right") fwyRight++;
            }

            // Penalties
            if (hole.stats.penalties?.length) {
              roundHasPenalty = true;
              for (const p of hole.stats.penalties) {
                if (p.type === "water") penWater++;
                else if (p.type === "ob") penOb++;
                else if (p.type === "unplayable") penUnplayable++;
              }
            }

            // Bunkers
            if (hole.stats.bunkers?.length) {
              for (const b of hole.stats.bunkers) {
                if (b.type === "greenside") bunkGreenside++;
                else if (b.type === "fairway") bunkFairway++;
              }
            }
          }
        }

        if (roundHasPenalty) roundsWithPenalties++;

        // Front/back 9 averages (only for 18-hole rounds)
        if (frontCount === 9) front9Scores.push(roundFront - roundFrontPar);
        if (backCount === 9) back9Scores.push(roundBack - roundBackPar);

        // Scoring trend
        if (roundPar > 0) {
          const datePlayed = roundDateMap.get(row.round_id as number) ?? "";
          roundScores.push({
            roundId: row.round_id as number,
            datePlayed,
            scoreToPar: roundScore - roundPar,
          });
        }
      }

      // Compute percentages
      const pct = (n: number, total: number) =>
        total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

      const avg = (arr: number[]) =>
        arr.length > 0
          ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
          : null;

      // Sort trend chronologically, take last 20
      const sortedTrend = roundScores
        .sort((a, b) => a.datePlayed.localeCompare(b.datePlayed))
        .slice(-20);

      setStats({
        scoreDistribution:
          totalScoredHoles > 0
            ? {
                eagle: pct(eagle, totalScoredHoles),
                birdie: pct(birdie, totalScoredHoles),
                par: pct(par, totalScoredHoles),
                bogey: pct(bogey, totalScoredHoles),
                doublePlus: pct(doublePlus, totalScoredHoles),
              }
            : null,

        avgPar3: avg(par3Scores),
        avgPar4: avg(par4Scores),
        avgPar5: avg(par5Scores),

        onePuttPct: totalPuttHoles > 0 ? pct(onePutt, totalPuttHoles) : null,
        twoPuttPct: totalPuttHoles > 0 ? pct(twoPutt, totalPuttHoles) : null,
        threePuttPlusPct: totalPuttHoles > 0 ? pct(threePuttPlus, totalPuttHoles) : null,

        scoringTrend: sortedTrend,

        fairwayMiss:
          fwyTotal > 0
            ? {
                hitPct: pct(fwyHit, fwyTotal),
                leftPct: pct(fwyLeft, fwyTotal),
                rightPct: pct(fwyRight, fwyTotal),
                totalTracked: fwyTotal,
              }
            : null,

        penaltyBreakdown:
          penWater + penOb + penUnplayable > 0
            ? { water: penWater, ob: penOb, unplayable: penUnplayable }
            : null,
        bunkerBreakdown:
          bunkGreenside + bunkFairway > 0
            ? { greenside: bunkGreenside, fairway: bunkFairway }
            : null,
        penaltyRoundsCount: roundsWithPenalties,

        avgFront9: avg(front9Scores),
        avgBack9: avg(back9Scores),
      });
    } catch (err) {
      console.error("useDetailedStats error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { stats, isLoading, refresh };
}
