import { supabase } from "@/lib/supabase";
import { ScoreDetails } from "@/types/scoring";
import { useCallback, useState } from "react";

export type HoleAverage = {
  holeKey: string;
  holeNumber: number;
  par: number;
  avgScore: number;
  avgToPar: number;
  roundsPlayed: number;
};

export type TroubleHole = HoleAverage & {
  avgPutts: number | null;
  penaltyCount: number;
  fairwayMissPct: number | null;
  girPct: number | null;
};

export type CourseHistory = {
  totalRounds: number;
  hasHistory: boolean;
  holeAverages: HoleAverage[];
  personalBest: number | null;
  scoringTrend: { roundId: number; datePlayed: string; scoreToPar: number }[];
  troubleHoles: TroubleHole[];
  avgPar3: number | null;
  avgPar4: number | null;
  avgPar5: number | null;
};

const EMPTY: CourseHistory = {
  totalRounds: 0,
  hasHistory: false,
  holeAverages: [],
  personalBest: null,
  scoringTrend: [],
  troubleHoles: [],
  avgPar3: null,
  avgPar4: null,
  avgPar5: null,
};

export function useCourseHistory(userId: string, courseId: number) {
  const [history, setHistory] = useState<CourseHistory>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !courseId) {
      setHistory(EMPTY);
      return;
    }
    setIsLoading(true);

    try {
      // 1. Fetch rounds at this course
      const { data: roundRows } = await supabase
        .from("rounds")
        .select("id, date_played, created_at")
        .eq("course_id", courseId)
        .in("status", ["completed", "incomplete"]);

      const roundIds = roundRows?.map((r) => r.id as number) ?? [];
      if (roundIds.length === 0) {
        setHistory(EMPTY);
        setIsLoading(false);
        return;
      }

      // 2. Fetch user's completed scores for those rounds
      const { data: scoreRows } = await supabase
        .from("scores")
        .select("round_id, score, score_details")
        .eq("golfer_id", userId)
        .eq("player_status", "completed")
        .in("round_id", roundIds);

      if (!scoreRows || scoreRows.length === 0) {
        setHistory(EMPTY);
        setIsLoading(false);
        return;
      }

      // Build round date map
      const roundDateMap = new Map<number, string>();
      if (roundRows) {
        for (const r of roundRows) {
          roundDateMap.set(
            r.id as number,
            (r.date_played as string) ?? (r.created_at as string).split("T")[0],
          );
        }
      }

      // Accumulators — per hole
      const holeAccum = new Map<
        string,
        {
          totalScore: number;
          totalPar: number;
          count: number;
          totalPutts: number;
          puttsCount: number;
          penaltyCount: number;
          fairwayTracked: number;
          fairwayMissed: number;
          girTracked: number;
          girHit: number;
        }
      >();

      // Par-type accumulators
      const par3Diffs: number[] = [];
      const par4Diffs: number[] = [];
      const par5Diffs: number[] = [];

      // Per-round scoring trend
      const roundScores: { roundId: number; datePlayed: string; scoreToPar: number }[] = [];
      let personalBest: number | null = null;

      for (const row of scoreRows) {
        const sd = row.score_details as ScoreDetails | null;
        if (!sd?.holes) continue;

        let roundScore = 0;
        let roundPar = 0;

        for (const [key, hole] of Object.entries(sd.holes)) {
          const score = parseInt(hole.score, 10);
          const holePar = parseInt(hole.par, 10);
          if (isNaN(score) || score <= 0 || isNaN(holePar)) continue;

          roundScore += score;
          roundPar += holePar;

          // Hole accumulator
          let acc = holeAccum.get(key);
          if (!acc) {
            acc = {
              totalScore: 0,
              totalPar: 0,
              count: 0,
              totalPutts: 0,
              puttsCount: 0,
              penaltyCount: 0,
              fairwayTracked: 0,
              fairwayMissed: 0,
              girTracked: 0,
              girHit: 0,
            };
            holeAccum.set(key, acc);
          }
          acc.totalScore += score;
          acc.totalPar += holePar;
          acc.count++;

          // Par-type performance
          const diff = score - holePar;
          if (holePar === 3) par3Diffs.push(diff);
          else if (holePar === 4) par4Diffs.push(diff);
          else if (holePar >= 5) par5Diffs.push(diff);

          // Stats
          if (hole.stats) {
            if (hole.stats.putts != null) {
              acc.totalPutts += hole.stats.putts;
              acc.puttsCount++;
            }
            if (hole.stats.penalties?.length) {
              acc.penaltyCount += hole.stats.penalties.length;
            }
            if ((holePar === 4 || holePar >= 5) && hole.stats.fairway != null) {
              acc.fairwayTracked++;
              if (hole.stats.fairway !== "hit") {
                acc.fairwayMissed++;
              }
            }
            if (hole.stats.gir != null) {
              acc.girTracked++;
              if (hole.stats.gir) acc.girHit++;
            }
          }
        }

        // Round-level
        if (roundPar > 0) {
          const scoreToPar = roundScore - roundPar;
          const datePlayed = roundDateMap.get(row.round_id as number) ?? "";
          roundScores.push({ roundId: row.round_id as number, datePlayed, scoreToPar });
          if (personalBest === null || scoreToPar < personalBest) {
            personalBest = scoreToPar;
          }
        }
      }

      // Build hole averages
      const avg = (arr: number[]) =>
        arr.length > 0
          ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
          : null;

      const holeAverages: HoleAverage[] = [];
      for (const [key, acc] of holeAccum.entries()) {
        const holeNumber = parseInt(key.replace("hole-", ""), 10);
        const par = acc.totalPar / acc.count;
        const avgScore = Math.round((acc.totalScore / acc.count) * 10) / 10;
        const avgToPar = Math.round((avgScore - par) * 10) / 10;
        holeAverages.push({ holeKey: key, holeNumber, par, avgScore, avgToPar, roundsPlayed: acc.count });
      }
      holeAverages.sort((a, b) => a.holeNumber - b.holeNumber);

      // Trouble holes — top 3 by avgToPar descending
      const troubleHoles: TroubleHole[] = [...holeAverages]
        .sort((a, b) => b.avgToPar - a.avgToPar)
        .slice(0, 3)
        .filter((h) => h.avgToPar > 0)
        .map((h) => {
          const acc = holeAccum.get(h.holeKey)!;
          return {
            ...h,
            avgPutts: acc.puttsCount > 0 ? Math.round((acc.totalPutts / acc.puttsCount) * 10) / 10 : null,
            penaltyCount: acc.penaltyCount,
            fairwayMissPct:
              acc.fairwayTracked > 0
                ? Math.round((acc.fairwayMissed / acc.fairwayTracked) * 100)
                : null,
            girPct:
              acc.girTracked > 0
                ? Math.round((acc.girHit / acc.girTracked) * 100)
                : null,
          };
        });

      // Scoring trend — chronological
      const scoringTrend = roundScores.sort((a, b) => a.datePlayed.localeCompare(b.datePlayed));

      setHistory({
        totalRounds: scoreRows.length,
        hasHistory: scoreRows.length >= 1,
        holeAverages,
        personalBest,
        scoringTrend,
        troubleHoles,
        avgPar3: avg(par3Diffs),
        avgPar4: avg(par4Diffs),
        avgPar5: avg(par5Diffs),
      });
    } catch (err) {
      console.error("useCourseHistory error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, courseId]);

  return { history, isLoading, refresh };
}
