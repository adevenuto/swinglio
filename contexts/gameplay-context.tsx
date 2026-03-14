import { ScorecardPlayer } from "@/components/Scorecard";
import { useAuth } from "@/contexts/auth-context";
import {
  GreenCenter,
  parseGreenCenters,
} from "@/hooks/use-course-search";
import { emit } from "@/lib/events";
import { buildResultsData, computePlayerResult } from "@/lib/scoring-utils";
import { supabase } from "@/lib/supabase";
import { HoleData, HoleStats, ScoreDetails } from "@/types/scoring";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";

// === Types (moved from gameplay.tsx) ===

export type RoundData = {
  id: number;
  creator_id: string;
  course_id: number;
  status: string;
  created_at: string;
  teebox_data: {
    order: number;
    name: string;
    color?: string;
    holes: Record<string, { par: string; length: string }>;
  };
  courses: { club_name: string };
};

export type PlayerScore = {
  id: number;
  golfer_id: string;
  score: number | null;
  score_details: ScoreDetails;
  player_status: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  };
};

export function getCurrentHole(
  players: PlayerScore[],
  userId: string,
): number | null {
  const me = players.find((p) => p.golfer_id === userId);
  if (!me?.score_details?.holes) return null;
  const holeCount = Object.keys(me.score_details.holes).length;
  for (let i = 1; i <= holeCount; i++) {
    if (!me.score_details.holes[`hole-${i}`]?.score) return i;
  }
  return null;
}

// === Context shape ===

type GameplayContextType = {
  // State
  round: RoundData | null;
  players: PlayerScore[];
  activeHole: number;
  isLoading: boolean;
  isQuitting: boolean;
  featuredImageUrl: string | null;

  // Derived
  myScore: PlayerScore | undefined;
  myFinished: boolean;
  holeCount: number;
  activeHoleKey: string;
  activeHoleData: HoleData | undefined;
  teeboxHoleData: { par: string; length: string } | undefined;
  scorecardPlayers: ScorecardPlayer[];
  greenCenters: Record<string, GreenCenter>;
  hasGreenCenters: boolean;

  // Actions
  fetchRound: () => Promise<void>;
  updateHole: (data: { score: string; stats: HoleStats }) => void;
  flushPersist: () => Promise<void>;
  setActiveHole: (hole: number) => void;
  handleQuitRound: () => void;
  quitWithStatus: (
    status: "completed" | "incomplete" | "withdrew",
  ) => Promise<void>;
  getHolesScored: () => number;
};

const GameplayContext = createContext<GameplayContextType | null>(null);

export function useGameplay(): GameplayContextType {
  const ctx = useContext(GameplayContext);
  if (!ctx) throw new Error("useGameplay must be used within GameplayProvider");
  return ctx;
}

// === Provider ===

export function GameplayProvider({
  roundId,
  children,
}: {
  roundId: string;
  children: ReactNode;
}) {
  const { user } = useAuth();

  const [round, setRound] = useState<RoundData | null>(null);
  const [players, setPlayersState] = useState<PlayerScore[]>([]);
  const [activeHole, setActiveHole] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuitting, setIsQuitting] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [greenCenters, setGreenCenters] = useState<Record<string, GreenCenter>>(
    {},
  );

  // Synchronous ref mirror — always up-to-date, even before React re-renders
  const playersRef = useRef<PlayerScore[]>([]);

  const updatePlayers = useCallback(
    (
      updater:
        | PlayerScore[]
        | ((prev: PlayerScore[]) => PlayerScore[]),
    ) => {
      if (typeof updater === "function") {
        setPlayersState((prev) => {
          const next = updater(prev);
          playersRef.current = next;
          return next;
        });
      } else {
        playersRef.current = updater;
        setPlayersState(updater);
      }
    },
    [],
  );

  // --- Fetch round + scores ---
  const fetchRound = useCallback(async () => {
    setIsLoading(true);

    const { data: roundData } = await supabase
      .from("rounds")
      .select(
        "id, creator_id, course_id, status, created_at, teebox_data, courses(club_name)",
      )
      .eq("id", roundId)
      .single();

    if (roundData) {
      setRound(roundData as unknown as RoundData);

      // Fetch featured course image (table may not exist yet)
      try {
        const { data: imgData } = await supabase
          .from("course_images")
          .select("image_url")
          .eq("course_id", (roundData as any).course_id)
          .eq("is_featured", true)
          .maybeSingle();
        setFeaturedImageUrl(imgData?.image_url ?? null);
      } catch {
        // course_images table may not exist yet — ignore
      }

      // Fetch green centers from course layout_data
      try {
        const { data: courseRow } = await supabase
          .from("courses")
          .select("layout_data")
          .eq("id", (roundData as any).course_id)
          .single();
        if (courseRow?.layout_data) {
          setGreenCenters(parseGreenCenters(courseRow.layout_data));
        }
      } catch {
        // Non-critical — green centers just won't be available
      }
    }

    const { data: scoreData } = await supabase
      .from("scores")
      .select(
        "id, golfer_id, score, score_details, player_status, profiles(first_name, last_name, display_name)",
      )
      .eq("round_id", roundId);

    if (scoreData) updatePlayers(scoreData as unknown as PlayerScore[]);

    setIsLoading(false);
  }, [roundId, updatePlayers]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // --- Derived values ---

  const myScore = useMemo(
    () => players.find((p) => p.golfer_id === user?.id),
    [players, user?.id],
  );

  const myFinished = myScore?.score != null;

  const holeCount = useMemo(
    () =>
      round?.teebox_data?.holes
        ? Object.keys(round.teebox_data.holes).length
        : 18,
    [round],
  );

  const hasGreenCenters = Object.keys(greenCenters).length > 0;

  const activeHoleKey = `hole-${activeHole}`;
  const activeHoleData = myScore?.score_details?.holes[activeHoleKey];
  const teeboxHoleData = round?.teebox_data?.holes[activeHoleKey];

  const scorecardPlayers: ScorecardPlayer[] = useMemo(
    () =>
      players
        .map((p) => ({
          id: p.id,
          golfer_id: p.golfer_id,
          first_name:
            p.profiles?.display_name || p.profiles?.first_name || "?",
          score_details: p.score_details,
        }))
        .sort((a, b) => {
          if (a.golfer_id === user?.id) return -1;
          if (b.golfer_id === user?.id) return 1;
          return 0;
        }),
    [players, user?.id],
  );

  // --- Debounced persist mechanism ---
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistHole = useCallback(async () => {
    const me = playersRef.current.find((p) => p.golfer_id === user?.id);
    if (!me) return;
    const { error } = await supabase
      .from("scores")
      .update({ score_details: me.score_details })
      .eq("id", me.id);
    if (error) Alert.alert("Error", "Failed to save. Please try again.");
  }, [user?.id]);

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => persistHole(), 1000);
  }, [persistHole]);

  const flushPersist = useCallback(async () => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    await persistHole();
  }, [persistHole]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  // --- Update hole (optimistic only, schedules debounced persist) ---
  const updateHole = useCallback(
    (data: { score: string; stats: HoleStats }) => {
      const currentMyScore = playersRef.current.find(
        (p) => p.golfer_id === user?.id,
      );
      if (!currentMyScore || !round) return;

      const holeKey = `hole-${activeHole}`;

      const updatedScoreDetails = {
        ...currentMyScore.score_details,
        holes: {
          ...currentMyScore.score_details.holes,
          [holeKey]: {
            ...currentMyScore.score_details.holes[holeKey],
            score: data.score,
            stats: data.stats,
          },
        },
      };

      updatePlayers((prev) =>
        prev.map((p) =>
          p.id === currentMyScore.id
            ? { ...p, score_details: updatedScoreDetails }
            : p,
        ),
      );

      schedulePersist();
    },
    [user?.id, round, activeHole, updatePlayers, schedulePersist],
  );

  // --- Get holes scored (reads from ref — always current) ---
  const getHolesScored = useCallback((): number => {
    const me = playersRef.current.find((p) => p.golfer_id === user?.id);
    if (!me?.score_details?.holes) return 0;
    return Object.values(me.score_details.holes).filter(
      (h) => h.score && h.score !== "",
    ).length;
  }, [user?.id]);

  // --- Finalize round if all players done ---
  const finalizeRoundIfReady = useCallback(
    async (freshScores: any[]) => {
      if (!round || !user?.id) return;

      const teeboxHoles = round.teebox_data.holes;

      const allDone = freshScores.every(
        (s: any) => s.player_status !== "active",
      );

      if (allDone) {
        const playerResults = freshScores.map((p: any) => {
          const name =
            p.profiles?.display_name || p.profiles?.first_name || "Unknown";
          const result = computePlayerResult(
            p.score_details,
            teeboxHoles,
            p.golfer_id,
            name,
          );
          result.player_status = p.player_status;
          return result;
        });

        const allCompleted = freshScores.every(
          (s: any) => s.player_status === "completed",
        );
        const roundStatus = allCompleted ? "completed" : "incomplete";

        const resultsData = buildResultsData(
          playerResults,
          round.courses?.club_name || "Unknown",
          (round.teebox_data as any)?.name || "",
        );

        await supabase
          .from("rounds")
          .update({ status: roundStatus, results_data: resultsData })
          .eq("id", round.id);

        emit("round-completed");

        // Update local round status — component effect handles navigation
        setRound((prev) => (prev ? { ...prev, status: roundStatus } : prev));
      }
    },
    [round, user?.id],
  );

  // --- Quit round modal ---
  const handleQuitRound = useCallback(() => {
    if (!round || !user?.id) return;

    const me = playersRef.current.find((p) => p.golfer_id === user.id);
    if (!me) return;

    const totalHoles = Object.keys(round.teebox_data.holes).length;
    const holesScored = getHolesScored();

    const buttons: any[] = [{ text: "Cancel", style: "cancel" }];

    if (holesScored >= totalHoles) {
      buttons.push({
        text: "Mark as Complete",
        onPress: () => quitWithStatus("completed"),
      });
    } else if (holesScored > 0) {
      buttons.push({
        text: "Save as Incomplete",
        onPress: () => quitWithStatus("incomplete"),
      });
    }

    buttons.push({
      text: "Withdraw (WD)",
      style: "destructive",
      onPress: () => quitWithStatus("withdrew"),
    });

    const message =
      holesScored === 0
        ? "You haven't scored any holes yet."
        : holesScored >= totalHoles
          ? `You've scored all ${totalHoles} holes.`
          : `You've scored ${holesScored} of ${totalHoles} holes.`;

    Alert.alert("Finish Round", message, buttons);
  }, [round, user?.id, getHolesScored]);

  // --- Quit with specific status ---
  const quitWithStatus = useCallback(
    async (status: "completed" | "incomplete" | "withdrew") => {
      if (!round || !user?.id) return;
      setIsQuitting(true);

      try {
        // Re-fetch from Supabase to get the latest persisted data
        const { data: freshScores } = await supabase
          .from("scores")
          .select(
            "id, golfer_id, score, score_details, player_status, profiles(first_name, last_name, display_name)",
          )
          .eq("round_id", roundId);

        if (!freshScores) throw new Error("Failed to fetch scores");

        const myFreshScore = freshScores.find(
          (s: any) => s.golfer_id === user.id,
        );
        if (!myFreshScore) throw new Error("Score not found");

        const teeboxHoles = round.teebox_data.holes;
        const myName =
          (myFreshScore as any).profiles?.display_name ||
          (myFreshScore as any).profiles?.first_name ||
          "Unknown";
        const myResult = computePlayerResult(
          (myFreshScore as any).score_details,
          teeboxHoles,
          user.id,
          myName,
        );

        await supabase
          .from("scores")
          .update({
            score: myResult.total_score,
            player_status: status,
          })
          .eq("id", (myFreshScore as any).id);

        const updatedScores = freshScores.map((s: any) =>
          s.golfer_id === user.id
            ? { ...s, score: myResult.total_score, player_status: status }
            : s,
        );

        await finalizeRoundIfReady(updatedScores);

        // If we didn't navigate away, update local state
        updatePlayers((prev) =>
          prev.map((p) =>
            p.golfer_id === user.id
              ? { ...p, score: myResult.total_score, player_status: status }
              : p,
          ),
        );
      } catch (err) {
        Alert.alert("Error", "Failed to quit round. Please try again.");
      } finally {
        setIsQuitting(false);
      }
    },
    [round, user?.id, roundId, finalizeRoundIfReady, updatePlayers],
  );

  const value: GameplayContextType = useMemo(
    () => ({
      round,
      players,
      activeHole,
      isLoading,
      isQuitting,
      featuredImageUrl,
      myScore,
      myFinished,
      holeCount,
      activeHoleKey,
      activeHoleData,
      teeboxHoleData,
      scorecardPlayers,
      greenCenters,
      hasGreenCenters,
      fetchRound,
      updateHole,
      flushPersist,
      setActiveHole,
      handleQuitRound,
      quitWithStatus,
      getHolesScored,
    }),
    [
      round,
      players,
      activeHole,
      isLoading,
      isQuitting,
      featuredImageUrl,
      myScore,
      myFinished,
      holeCount,
      activeHoleKey,
      activeHoleData,
      teeboxHoleData,
      scorecardPlayers,
      greenCenters,
      hasGreenCenters,
      fetchRound,
      updateHole,
      flushPersist,
      handleQuitRound,
      quitWithStatus,
      getHolesScored,
    ],
  );

  return (
    <GameplayContext.Provider value={value}>
      {children}
    </GameplayContext.Provider>
  );
}
