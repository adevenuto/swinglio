import { supabase } from "@/lib/supabase";
import { computePlayerResult } from "@/lib/scoring-utils";
import { ScoreDetails } from "@/types/scoring";
import { RecentRound } from "@/hooks/use-recent-rounds";
import { useCallback, useRef, useState } from "react";

type Options = {
  pageSize?: number;
  maxTotal?: number;
  searchQuery?: string;
  sortBy?: "date" | "score";
  sortDir?: "asc" | "desc";
};

export function usePaginatedRounds(userId: string, options?: Options) {
  const pageSize = options?.pageSize ?? 20;
  const maxTotal = options?.maxTotal;
  const searchQuery = options?.searchQuery?.trim() || "";
  const sortBy = options?.sortBy ?? "date";
  const sortDir = options?.sortDir ?? "desc";

  const [rounds, setRounds] = useState<RecentRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const scoreMapRef = useRef<Map<number, any>>(new Map());
  const allRoundIdsRef = useRef<number[]>([]);
  const sortedIdsRef = useRef<number[]>([]);
  const scoresToParRef = useRef<Map<number, number | null>>(new Map());

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const fetchPage = useCallback(
    async (offset: number, limit: number): Promise<RecentRound[]> => {
      const ids = sortedIdsRef.current;
      if (ids.length === 0) return [];

      const pageIds = ids.slice(offset, offset + limit);
      if (pageIds.length === 0) return [];

      const search = searchQueryRef.current;

      let query = supabase
        .from("rounds")
        .select(
          search
            ? "id, course_id, creator_id, teebox_data, status, created_at, date_played, courses!inner(club_name, course_name)"
            : "id, course_id, creator_id, teebox_data, status, created_at, date_played, courses(club_name, course_name)",
        )
        .in("id", pageIds);

      if (search) {
        const pattern = `%${search}%`;
        query = query.or(
          `club_name.ilike.${pattern},course_name.ilike.${pattern}`,
          { referencedTable: "courses" },
        );
      }

      const { data } = await query;

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

      // Build an order map from the pre-sorted pageIds so results match our sort
      const orderMap = new Map(pageIds.map((id, i) => [id, i]));

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
        } else if (scoreRow?.score != null && round.teebox_data?.holes) {
          // Past rounds: no score_details, but we have total score + teebox pars
          const holes = round.teebox_data.holes as Record<string, { par: string }>;
          const totalPar = Object.values(holes).reduce(
            (sum, h) => sum + (parseInt(h.par, 10) || 0), 0,
          );
          holeCount = Object.keys(holes).length;
          holesCompleted = holeCount;
          scoreToPar = scoreRow.score - totalPar;
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
      }).sort(
        (a, b) =>
          (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );
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

    // Fetch lightweight round metadata for sorting
    const { data: roundMeta } = await supabase
      .from("rounds")
      .select("id, teebox_data, date_played")
      .in("id", allRoundIdsRef.current);

    // Compute score_to_par for all rounds (used for score sorting)
    const parMap = new Map<number, number | null>();
    const dateMap = new Map<number, string | null>();
    for (const rm of roundMeta || []) {
      dateMap.set(rm.id, rm.date_played);
      const scoreRow = scoreMapRef.current.get(rm.id);
      if (scoreRow?.score_details && rm.teebox_data?.holes) {
        const result = computePlayerResult(
          scoreRow.score_details as ScoreDetails,
          rm.teebox_data.holes,
          userId,
          "",
        );
        parMap.set(rm.id, result.score_to_par);
      } else if (scoreRow?.score != null && rm.teebox_data?.holes) {
        const holes = rm.teebox_data.holes as Record<string, { par: string }>;
        const totalPar = Object.values(holes).reduce(
          (sum: number, h: { par: string }) => sum + (parseInt(h.par, 10) || 0), 0,
        );
        parMap.set(rm.id, scoreRow.score - totalPar);
      } else {
        parMap.set(rm.id, null);
      }
    }
    scoresToParRef.current = parMap;

    // Sort IDs based on current sort mode
    const sorted = [...allRoundIdsRef.current];
    if (sortBy === "score") {
      const nullVal = sortDir === "asc" ? 999 : -999;
      sorted.sort((a, b) => {
        const sa = parMap.get(a) ?? nullVal;
        const sb = parMap.get(b) ?? nullVal;
        return sortDir === "asc" ? sa - sb : sb - sa;
      });
    } else {
      sorted.sort((a, b) => {
        const da = dateMap.get(a) ?? "";
        const db = dateMap.get(b) ?? "";
        return sortDir === "asc"
          ? da.localeCompare(db)
          : db.localeCompare(da);
      });
    }
    sortedIdsRef.current = sorted;

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
  }, [userId, pageSize, maxTotal, searchQuery, sortBy, sortDir, fetchPage]);

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

  const pullToRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  return { rounds, isLoading, isRefreshing, isLoadingMore, hasMore, refresh, pullToRefresh, loadMore };
}
