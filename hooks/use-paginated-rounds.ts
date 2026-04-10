import { supabase } from "@/lib/supabase";
import { computePlayerResult } from "@/lib/scoring-utils";
import { ScoreDetails } from "@/types/scoring";
import { RecentRound } from "@/hooks/use-recent-rounds";
import { useCallback, useRef, useState } from "react";

type Options = {
  pageSize?: number;
  maxTotal?: number;
};

export function usePaginatedRounds(userId: string, options?: Options) {
  const pageSize = options?.pageSize ?? 20;
  const maxTotal = options?.maxTotal;

  const [rounds, setRounds] = useState<RecentRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const scoreMapRef = useRef<Map<number, any>>(new Map());
  const allRoundIdsRef = useRef<number[]>([]);

  const fetchPage = useCallback(
    async (offset: number, limit: number): Promise<RecentRound[]> => {
      const ids = allRoundIdsRef.current;
      if (ids.length === 0) return [];

      const from = offset;
      const to = offset + limit - 1;

      const { data } = await supabase
        .from("rounds")
        .select(
          "id, course_id, creator_id, teebox_data, status, created_at, date_played, courses(club_name, course_name)",
        )
        .in("id", ids)
        .order("date_played", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (!data || data.length === 0) return [];

      // Fetch player profiles for this page only
      const fetchedRoundIds = data.map((r: any) => r.id);
      const { data: pageScores } = await supabase
        .from("scores")
        .select(
          "round_id, golfer_id, player_status, profiles(first_name, last_name, avatar_url)",
        )
        .in("round_id", fetchedRoundIds);

      const roundPlayersMap: Record<number, RecentRound["players"]> = {};
      for (const s of pageScores || []) {
        const rid = Number(s.round_id);
        const profile = (s as any).profiles;
        if (!roundPlayersMap[rid]) roundPlayersMap[rid] = [];
        roundPlayersMap[rid].push({
          id: s.golfer_id as string,
          firstName: profile?.first_name ?? null,
          lastName: profile?.last_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        });
      }

      const scoreMap = scoreMapRef.current;

      return data.map((round: any) => {
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
          needsAttestation: false,
          players: roundPlayersMap[Number(round.id)] ?? [],
        };
      });
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      setRounds([]);
      setIsLoading(false);
      setHasMore(false);
      return;
    }
    setIsLoading(true);

    // Fetch all score rows (lightweight) to know which rounds belong to this user
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("round_id, score, score_details, player_status")
      .eq("golfer_id", userId)
      .in("player_status", ["completed", "incomplete"]);

    if (!scoreRows || scoreRows.length === 0) {
      scoreMapRef.current = new Map();
      allRoundIdsRef.current = [];
      setRounds([]);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    scoreMapRef.current = new Map(scoreRows.map((s) => [s.round_id, s]));
    allRoundIdsRef.current = [...scoreMapRef.current.keys()].filter(Boolean);

    const effectiveLimit =
      maxTotal != null ? Math.min(pageSize, maxTotal) : pageSize;
    const firstPage = await fetchPage(0, effectiveLimit);

    setRounds(firstPage);
    offsetRef.current = firstPage.length;
    setHasMore(
      firstPage.length === effectiveLimit &&
        (maxTotal == null || firstPage.length < maxTotal),
    );
    setIsLoading(false);
  }, [userId, pageSize, maxTotal, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    if (maxTotal != null && rounds.length >= maxTotal) return;

    setIsLoadingMore(true);

    const remaining =
      maxTotal != null ? maxTotal - offsetRef.current : pageSize;
    const limit = Math.min(pageSize, remaining);
    const page = await fetchPage(offsetRef.current, limit);

    setRounds((prev) => [...prev, ...page]);
    offsetRef.current += page.length;
    setHasMore(
      page.length === limit &&
        (maxTotal == null || offsetRef.current < maxTotal),
    );
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, isLoading, rounds.length, maxTotal, pageSize, fetchPage]);

  return { rounds, isLoading, isLoadingMore, hasMore, refresh, loadMore };
}
