import Scorecard, {
  ScorecardPlayer,
  ScorecardRef,
} from "@/components/Scorecard";
import ScoreEntryModal from "@/components/ScoreEntryModal";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import "../global.css";

type RoundData = {
  id: number;
  league_id: number;
  course_id: number;
  status: string;
  created_at: string;
  leagues: {
    courses: { name: string };
    teebox_data: {
      order: number;
      name: string;
      color?: string;
      holes: Record<string, { par: string; length: string }>;
    };
  };
};

type PlayerScore = {
  id: number;
  golfer_id: string;
  score_details: {
    name: string;
    holes: Record<string, { par: string; length: string; score: string }>;
  };
  profiles: { first_name: string | null; last_name: string | null };
};

function getCurrentHole(
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

export default function GameplayScreen() {
  const { user } = useAuth();
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const scorecardRef = useRef<ScorecardRef>(null);

  const [round, setRound] = useState<RoundData | null>(null);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Score entry modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    player: ScorecardPlayer;
    holeKey: string;
  } | null>(null);

  const fetchRound = useCallback(async () => {
    setIsLoading(true);

    const { data: roundData } = await supabase
      .from("rounds")
      .select(
        "id, league_id, course_id, status, created_at, leagues(courses(name), teebox_data)",
      )
      .eq("id", roundId)
      .single();

    if (roundData) setRound(roundData as unknown as RoundData);

    const { data: scoreData } = await supabase
      .from("scores")
      .select("id, golfer_id, score_details, profiles(first_name, last_name)")
      .eq("round_id", roundId);

    if (scoreData) setPlayers(scoreData as unknown as PlayerScore[]);

    setIsLoading(false);
  }, [roundId]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // Auto-scroll to current hole after data loads
  useEffect(() => {
    if (!isLoading && players.length > 0 && user?.id) {
      const nextHole = getCurrentHole(players, user.id);
      if (nextHole) {
        // Small delay to let the scorecard layout complete
        setTimeout(() => scorecardRef.current?.scrollToHole(nextHole), 100);
      }
    }
  }, [isLoading, players, user?.id]);

  const handleCellPress = useCallback(
    (player: ScorecardPlayer, holeKey: string) => {
      if (player.golfer_id !== user?.id) return;
      setSelectedCell({ player, holeKey });
      setModalVisible(true);
    },
    [user?.id],
  );

  const handleSaveScore = useCallback(
    async (score: string) => {
      if (!selectedCell) return;
      const { player, holeKey } = selectedCell;

      // Find the full player data for Supabase update
      const targetPlayer = players.find((p) => p.id === player.id);
      if (!targetPlayer) return;

      // Build updated score_details
      const updatedScoreDetails = {
        ...targetPlayer.score_details,
        holes: {
          ...targetPlayer.score_details.holes,
          [holeKey]: {
            ...targetPlayer.score_details.holes[holeKey],
            score,
          },
        },
      };

      // Optimistic update
      const prevPlayers = players;
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? { ...p, score_details: updatedScoreDetails }
            : p,
        ),
      );
      setModalVisible(false);

      // Persist to Supabase
      const { error } = await supabase
        .from("scores")
        .update({ score_details: updatedScoreDetails })
        .eq("id", player.id);

      if (error) {
        setPlayers(prevPlayers);
        Alert.alert("Error", "Failed to save score. Please try again.");
        return;
      }

      // Auto-scroll to next empty hole
      const updatedPlayers = prevPlayers.map((p) =>
        p.id === player.id
          ? { ...p, score_details: updatedScoreDetails }
          : p,
      );
      if (user?.id) {
        const nextHole = getCurrentHole(updatedPlayers, user.id);
        if (nextHole) {
          scorecardRef.current?.scrollToHole(nextHole);
        }
      }
    },
    [selectedCell, players, user?.id],
  );

  // Derive modal props from selected cell
  const modalProps = useMemo(() => {
    if (!selectedCell) {
      return { holeNumber: 0, par: "", yardage: "", playerName: "", currentScore: "" };
    }
    const { player, holeKey } = selectedCell;
    const holeNumber = parseInt(holeKey.replace("hole-", ""), 10);
    const holeData = player.score_details?.holes[holeKey];
    return {
      holeNumber,
      par: holeData?.par ?? "",
      yardage: holeData?.length ?? "",
      playerName: player.first_name,
      currentScore: holeData?.score ?? "",
    };
  }, [selectedCell]);

  const scorecardPlayers: ScorecardPlayer[] = useMemo(
    () =>
      players.map((p) => ({
        id: p.id,
        golfer_id: p.golfer_id,
        first_name: p.profiles?.first_name ?? "?",
        score_details: p.score_details,
      })),
    [players],
  );

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!round) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <Text variant="bodyLarge">Round not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Course info header */}
      <View className="px-4 pt-6 pb-4">
        <View className="p-4 border border-green-200 rounded-lg bg-green-50">
          <Text
            variant="titleLarge"
            style={{ fontWeight: "700", color: "#14532d", marginBottom: 2 }}
          >
            {round.leagues?.courses?.name ?? "Unknown Course"}
          </Text>
          <Text variant="bodyMedium" style={{ color: "#15803d" }}>
            {round.leagues?.teebox_data?.name ?? "N/A"} tees
          </Text>
          <Text variant="bodySmall" style={{ color: "#15803d", marginTop: 4 }}>
            Round — {round.status}
          </Text>
        </View>
      </View>

      {/* Scorecard */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchRound();
              setRefreshing(false);
            }}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        <View className="px-4 pb-4">
          <Scorecard
            ref={scorecardRef}
            teeboxData={round.leagues.teebox_data}
            players={scorecardPlayers}
            onCellPress={handleCellPress}
          />
        </View>
      </ScrollView>

      {/* Score entry modal */}
      <ScoreEntryModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSave={handleSaveScore}
        holeNumber={modalProps.holeNumber}
        par={modalProps.par}
        yardage={modalProps.yardage}
        playerName={modalProps.playerName}
        currentScore={modalProps.currentScore}
      />
    </View>
  );
}
