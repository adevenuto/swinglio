import { supabase } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
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
      name: string;
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

export default function GameplayScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const [round, setRound] = useState<RoundData | null>(null);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      {/* Players list */}
      <ScrollView
        className="flex-1 px-4"
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
        <Text
          variant="titleSmall"
          style={{ color: "#111827", marginBottom: 12 }}
        >
          Players ({players.length})
        </Text>
        {players.map((p) => {
          const name =
            [p.profiles?.first_name, p.profiles?.last_name]
              .filter(Boolean)
              .join(" ") || "Unknown";
          return (
            <View
              key={p.id}
              className="py-3"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#f0f0f0",
              }}
            >
              <Text
                variant="bodyLarge"
                style={{ color: "#1a1a1a", fontWeight: "600" }}
              >
                {name}
              </Text>
              <Text variant="bodySmall" style={{ color: "#555" }}>
                Teebox: {p.score_details?.name ?? "N/A"}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
