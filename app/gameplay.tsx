import HoleEntryPanel, { HoleEntryPanelRef } from "@/components/HoleEntryPanel";
import HoleNavigation from "@/components/HoleNavigation";
import Scorecard, {
  ScorecardPlayer,
  ScorecardRef,
} from "@/components/Scorecard";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { HoleStats, ScoreDetails } from "@/types/scoring";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
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
  score_details: ScoreDetails;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  };
};

function getCurrentHole(players: PlayerScore[], userId: string): number | null {
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
  const holeEntryRef = useRef<HoleEntryPanelRef>(null);

  const [round, setRound] = useState<RoundData | null>(null);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeHole, setActiveHole] = useState<number>(1);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Fetch user avatar
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [user?.id]);

  const fetchRound = useCallback(async () => {
    setIsLoading(true);

    const { data: roundData } = await supabase
      .from("rounds")
      .select(
        "id, creator_id, course_id, status, created_at, teebox_data, courses(name)",
      )
      .eq("id", roundId)
      .single();

    if (roundData) {
      setRound(roundData as unknown as RoundData);
      setIsCreator(roundData.creator_id === user?.id);
    }

    const { data: scoreData } = await supabase
      .from("scores")
      .select(
        "id, golfer_id, score_details, profiles(first_name, last_name, display_name)",
      )
      .eq("round_id", roundId);

    if (scoreData) setPlayers(scoreData as unknown as PlayerScore[]);

    setIsLoading(false);
  }, [roundId, user?.id]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // Set activeHole to first empty hole on initial load
  useEffect(() => {
    if (!isLoading && players.length > 0 && user?.id && !initialLoadDone) {
      const firstEmpty = getCurrentHole(players, user.id);
      const startHole = firstEmpty ?? 1;
      setActiveHole(startHole);
      setTimeout(() => scorecardRef.current?.scrollToHole(startHole), 100);
      setInitialLoadDone(true);
    }
  }, [isLoading, players, user?.id, initialLoadDone]);

  // Current user's score row
  const myScore = useMemo(
    () => players.find((p) => p.golfer_id === user?.id),
    [players, user?.id],
  );

  const holeCount = useMemo(
    () =>
      round?.teebox_data?.holes
        ? Object.keys(round.teebox_data.holes).length
        : 18,
    [round],
  );

  const activeHoleKey = `hole-${activeHole}`;
  const activeHoleData = myScore?.score_details?.holes[activeHoleKey];
  const teeboxHoleData = round?.teebox_data?.holes[activeHoleKey];

  // Save score + stats for the active hole
  const handleHoleSave = useCallback(
    async (data: { score: string; stats: HoleStats }) => {
      if (!myScore || !round) return;

      const updatedHoleData = {
        ...myScore.score_details.holes[activeHoleKey],
        score: data.score,
        stats: data.stats,
      };

      const updatedScoreDetails = {
        ...myScore.score_details,
        holes: {
          ...myScore.score_details.holes,
          [activeHoleKey]: updatedHoleData,
        },
      };

      // Optimistic update
      const prevPlayers = players;
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === myScore.id
            ? { ...p, score_details: updatedScoreDetails }
            : p,
        ),
      );

      const { error } = await supabase
        .from("scores")
        .update({ score_details: updatedScoreDetails })
        .eq("id", myScore.id);

      if (error) {
        setPlayers(prevPlayers);
        Alert.alert("Error", "Failed to save. Please try again.");
      }
    },
    [myScore, players, activeHoleKey, round],
  );

  // Save current hole (used by HoleNavigation)
  const saveCurrentHole = useCallback(() => {
    holeEntryRef.current?.saveCurrentHole();
  }, []);

  // Navigate to a different hole
  const handleNavigate = useCallback((holeNumber: number) => {
    setActiveHole(holeNumber);
    scorecardRef.current?.scrollToHole(holeNumber);
  }, []);

  // Tapping a hole number on the scorecard — save current, then jump
  const handleHolePress = useCallback((holeNumber: number) => {
    holeEntryRef.current?.saveCurrentHole();
    setActiveHole(holeNumber);
    scorecardRef.current?.scrollToHole(holeNumber);
  }, []);

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
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#fff", paddingTop: 20 }}
    >
      {/* Nav header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 20,
        }}
      >
        <Pressable
          onPress={() => {
            holeEntryRef.current?.saveCurrentHole();
            router.back();
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <MaterialIcons name="chevron-left" size={28} color="#1a1a1a" />
          <Text style={{ fontSize: 17, color: "#1a1a1a" }}>Dashboard</Text>
        </Pressable>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: "#e5e5e5",
            }}
          />
        ) : (
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: "#e5e5e5",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="person" size={22} color="#999" />
          </View>
        )}
      </View>

      {/* Course info card */}
      <View className="px-4 pb-4">
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
              <Text
                style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}
              >
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

      {/* Scorecard + HoleEntryPanel */}
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
        {myScore && teeboxHoleData && (
          <View className="px-4 pb-4">
            <HoleEntryPanel
              ref={holeEntryRef}
              holeNumber={activeHole}
              par={teeboxHoleData.par}
              yardage={teeboxHoleData.length}
              currentScore={activeHoleData?.score ?? ""}
              currentStats={activeHoleData?.stats}
              onSave={handleHoleSave}
            />
          </View>
        )}

        {myScore && teeboxHoleData && (
          <View className="px-4 pb-4">
            <HoleNavigation
              holeNumber={activeHole}
              holeCount={holeCount}
              onSave={saveCurrentHole}
              onNavigate={handleNavigate}
            />
          </View>
        )}

        <View className="px-4 pb-4">
          <Scorecard
            ref={scorecardRef}
            teeboxData={round.teebox_data}
            players={scorecardPlayers}
            onHolePress={handleHolePress}
            currentUserId={user?.id}
            currentHole={activeHole}
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
    </SafeAreaView>
  );
}
