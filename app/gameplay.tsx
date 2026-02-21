import Scorecard, {
  ScorecardPlayer,
  ScorecardRef,
} from "@/components/Scorecard";
import ScoreEntryModal from "@/components/ScoreEntryModal";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import "../global.css";

type RoundData = {
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
  courses: { name: string };
};

type PlayerScore = {
  id: number;
  golfer_id: string;
  score_details: {
    name: string;
    holes: Record<string, { par: string; length: string; score: string }>;
  };
  profiles: { first_name: string | null; last_name: string | null; display_name: string | null };
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
  const router = useRouter();
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const scorecardRef = useRef<ScorecardRef>(null);

  const [round, setRound] = useState<RoundData | null>(null);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

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
      .select("id, creator_id, course_id, status, created_at, teebox_data, courses(name)")
      .eq("id", roundId)
      .single();

    if (roundData) {
      setRound(roundData as unknown as RoundData);
      setIsCreator(roundData.creator_id === user?.id);
    }

    const { data: scoreData } = await supabase
      .from("scores")
      .select("id, golfer_id, score_details, profiles(first_name, last_name, display_name)")
      .eq("round_id", roundId);

    if (scoreData) setPlayers(scoreData as unknown as PlayerScore[]);

    setIsLoading(false);
  }, [roundId, user?.id]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // Auto-scroll to current hole after data loads
  useEffect(() => {
    if (!isLoading && players.length > 0 && user?.id) {
      const nextHole = getCurrentHole(players, user.id);
      if (nextHole) {
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

      const targetPlayer = players.find((p) => p.id === player.id);
      if (!targetPlayer) return;

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

  const handleDeleteRound = () => {
    Alert.alert(
      "Delete Round",
      "Are you sure you want to delete this round and all scores? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            await supabase.from("scores").delete().eq("round_id", roundId);
            const { error } = await supabase
              .from("rounds")
              .delete()
              .eq("id", roundId);
            setIsDeleting(false);
            if (!error) {
              router.back();
            }
          },
        },
      ],
    );
  };

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
        first_name: p.profiles?.display_name || p.profiles?.first_name || "?",
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
      {/* Header */}
      <View className="px-4 pt-6 pb-4">
        <View
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: "#d4d4d4",
            borderRadius: 8,
            backgroundColor: "#fff",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              variant="titleLarge"
              style={{
                fontWeight: "700",
                color: "#1a1a1a",
                flex: 1,
                textTransform: "capitalize",
              }}
            >
              {round.courses?.name || "Unknown"}
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "#86efac",
                backgroundColor: "#f0fdf4",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>
                Active
              </Text>
            </View>
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: "#555", marginTop: 4, textTransform: "capitalize" }}
          >
            {round.courses?.name}
            {(round.teebox_data as any)?.name
              ? ` · ${(round.teebox_data as any).name} tees`
              : ""}
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
            teeboxData={round.teebox_data}
            players={scorecardPlayers}
            onCellPress={handleCellPress}
            currentUserId={user?.id}
            currentHole={getCurrentHole(players, user?.id ?? "")}
          />
        </View>
        {isCreator && (
          <Button
            mode="text"
            onPress={handleDeleteRound}
            loading={isDeleting}
            textColor="#dc2626"
            style={{ marginTop: 8, marginBottom: 16 }}
          >
            Delete Round
          </Button>
        )}
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
