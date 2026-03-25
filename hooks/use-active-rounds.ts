import { supabase } from "@/lib/supabase";
import { ScoreDetails } from "@/types/scoring";
import { useCallback, useState } from "react";

export type ActiveRound = {
  id: number;
  course_id: number;
  creator_id: string;
  teebox_data: {
    name: string;
    color?: string;
    holes?: Record<string, { par: string; length: string }>;
  };
  status: string;
  created_at: string;
  courses: { club_name: string; course_name: string };
  // Computed from score_details
  score_details: ScoreDetails | null;
  holesCompleted: number;
  holeCount: number;
  lastHolePlayed: number;
  runningToPar: number;
};

export function useActiveRounds(userId: string) {
  const [activeRounds, setActiveRounds] = useState<ActiveRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setActiveRounds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Get score rows (with score_details) where this user has an active score
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("round_id, score_details")
      .eq("golfer_id", userId)
      .eq("player_status", "active");

    if (!scoreRows || scoreRows.length === 0) {
      setActiveRounds([]);
      setIsLoading(false);
      return;
    }

    const scoreByRound = new Map<number, ScoreDetails | null>();
    for (const s of scoreRows) {
      if (s.round_id) {
        scoreByRound.set(s.round_id, (s.score_details as ScoreDetails) ?? null);
      }
    }

    const roundIds = [...scoreByRound.keys()];
    if (roundIds.length === 0) {
      setActiveRounds([]);
      setIsLoading(false);
      return;
    }

    // Fetch active rounds with course info
    const { data } = await supabase
      .from("rounds")
      .select(
        "id, course_id, creator_id, teebox_data, status, created_at, courses(club_name, course_name)",
      )
      .in("id", roundIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data) {
      const enriched: ActiveRound[] = data.map((round: any) => {
        const sd = scoreByRound.get(round.id) ?? null;
        const teeboxHoles =
          (round.teebox_data as any)?.holes ??
          ({} as Record<string, { par: string; length: string }>);
        const holeCount = Object.keys(teeboxHoles).length;

        let holesCompleted = 0;
        let lastHolePlayed = 0;
        let runningToPar = 0;

        if (sd?.holes) {
          for (const [key, hole] of Object.entries(sd.holes)) {
            if (hole.score) {
              const score = parseInt(hole.score, 10);
              const par = parseInt(hole.par, 10);
              if (!isNaN(score) && !isNaN(par)) {
                holesCompleted++;
                runningToPar += score - par;
                const holeNum = parseInt(key.replace("hole-", ""), 10);
                if (holeNum > lastHolePlayed) lastHolePlayed = holeNum;
              }
            }
          }
        }

        return {
          ...round,
          score_details: sd,
          holesCompleted,
          holeCount,
          lastHolePlayed,
          runningToPar,
        } as ActiveRound;
      });

      setActiveRounds(enriched);
    }
    setIsLoading(false);
  }, [userId]);

  return { activeRounds, isLoading, refresh };
}
