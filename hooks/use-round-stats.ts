import { supabase } from "@/lib/supabase";
import { ScoreDetails } from "@/types/scoring";
import { useCallback, useState } from "react";

export type RoundStats = {
  totalRounds: number;
  bestToPar: number | null;
  avg18: number | null;
  avg9: number | null;
  avgPutts: number | null;
  fairwayPct: number | null;
  girPct: number | null;
  penaltyRate: number | null;
};

export function useRoundStats(userId: string) {
  const [stats, setStats] = useState<RoundStats>({
    totalRounds: 0,
    bestToPar: null,
    avg18: null,
    avg9: null,
    avgPutts: null,
    fairwayPct: null,
    girPct: null,
    penaltyRate: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats({
        totalRounds: 0,
        bestToPar: null,
        avg18: null,
        avg9: null,
        avgPutts: null,
        fairwayPct: null,
        girPct: null,
        penaltyRate: null,
      });
      return;
    }
    setIsLoading(true);

    try {
      const { data: rows } = await supabase
        .from("scores")
        .select("score, score_details")
        .eq("golfer_id", userId)
        .eq("player_status", "completed");

      if (!rows || rows.length === 0) {
        setStats({
          totalRounds: 0,
          bestToPar: null,
          avg18: null,
          avg9: null,
          avgPutts: null,
          fairwayPct: null,
          girPct: null,
          penaltyRate: null,
        });
        setIsLoading(false);
        return;
      }

      const totalRounds = rows.length;

      // Best round as to-par + split averages by hole count
      let bestToPar: number | null = null;
      const scores18: number[] = [];
      const scores9: number[] = [];

      for (const row of rows) {
        const score = row.score as number | null;
        const sd = row.score_details as ScoreDetails | null;
        if (score == null || !sd?.holes) continue;

        const holeCount = Object.keys(sd.holes).length;
        const totalPar = Object.values(sd.holes).reduce(
          (sum, h) => sum + parseInt(h.par, 10),
          0,
        );
        const toPar = score - totalPar;

        if (bestToPar === null || toPar < bestToPar) {
          bestToPar = toPar;
        }

        if (holeCount === 18) {
          scores18.push(score);
        } else if (holeCount === 9) {
          scores9.push(score);
        }
      }

      const avg18 =
        scores18.length > 0
          ? Math.round(scores18.reduce((a, b) => a + b, 0) / scores18.length)
          : null;
      const avg9 =
        scores9.length > 0
          ? Math.round(scores9.reduce((a, b) => a + b, 0) / scores9.length)
          : null;

      // Aggregate per-hole stats
      let totalPutts = 0;
      let holesWithPutts = 0;
      let fairwaysHit = 0;
      let holesWithFairway = 0;
      let girHit = 0;
      let holesWithGir = 0;
      let totalPenalties = 0;

      for (const row of rows) {
        const sd = row.score_details as ScoreDetails | null;
        if (!sd?.holes) continue;

        for (const [, hole] of Object.entries(sd.holes)) {
          if (!hole.stats) continue;

          // Putts
          if (hole.stats.putts != null) {
            totalPutts += hole.stats.putts;
            holesWithPutts++;
          }

          // Fairway — only par 4s and par 5s
          const par = parseInt(hole.par, 10);
          if ((par === 4 || par === 5) && hole.stats.fairway != null) {
            holesWithFairway++;
            if (hole.stats.fairway === "hit") {
              fairwaysHit++;
            }
          }

          // GIR
          if (hole.stats.gir != null) {
            holesWithGir++;
            if (hole.stats.gir === true) {
              girHit++;
            }
          }

          // Penalties
          if (hole.stats.penalties?.length) {
            totalPenalties += hole.stats.penalties.length;
          }
        }
      }

      const avgPutts =
        holesWithPutts > 0
          ? Math.round((totalPutts / holesWithPutts) * 10) / 10
          : null;

      const fairwayPct =
        holesWithFairway > 0
          ? Math.round((fairwaysHit / holesWithFairway) * 100)
          : null;

      const girPct =
        holesWithGir > 0
          ? Math.round((girHit / holesWithGir) * 100)
          : null;

      const penaltyRate =
        totalRounds > 0 && totalPenalties > 0
          ? Math.round((totalPenalties / totalRounds) * 10) / 10
          : totalRounds > 0
            ? 0
            : null;

      setStats({ totalRounds, bestToPar, avg18, avg9, avgPutts, fairwayPct, girPct, penaltyRate });
    } catch (err) {
      console.error("useRoundStats error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { ...stats, isLoading, refresh };
}
