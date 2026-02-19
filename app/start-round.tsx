import { useAuth } from "@/contexts/auth-context";
import { useLeagueUsers, LeagueUser } from "@/hooks/use-league-users";
import { League } from "@/hooks/use-leagues";
import { Teebox } from "@/hooks/use-course-search";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Switch,
  Text,
} from "react-native-paper";
import "../global.css";

function buildScoreDetails(teebox: Teebox) {
  const holes: Record<string, { par: string; length: string; score: string }> = {};
  for (const [key, value] of Object.entries(teebox.holes)) {
    holes[key] = { ...value, score: "" };
  }
  return { name: teebox.name, holes };
}

export default function StartRoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [league, setLeague] = useState<League | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  const { members, isLoading: membersLoading, fetchMembers } = useLeagueUsers(id!);

  const fetchLeague = useCallback(async () => {
    const { data, error } = await supabase
      .from("leagues")
      .select("*, courses(name)")
      .eq("id", id)
      .single();

    if (!error && data) {
      setLeague(data as League);
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);

      // Check for existing active round — prevent duplicates
      const { data: activeRound } = await supabase
        .from("rounds")
        .select("id")
        .eq("league_id", id)
        .eq("status", "active")
        .limit(1);

      if (activeRound && activeRound.length > 0) {
        Alert.alert(
          "Active Round Exists",
          "There is already an active round for this league.",
          [
            {
              text: "Go to Round",
              onPress: () => {
                router.dismissAll();
                router.push({
                  pathname: "/gameplay",
                  params: { roundId: activeRound[0].id },
                });
              },
            },
            {
              text: "Cancel",
              onPress: () => router.back(),
              style: "cancel",
            },
          ]
        );
        setIsLoading(false);
        return;
      }

      // Verify coordinator access
      const { data: membership } = await supabase
        .from("league_users")
        .select("role")
        .eq("league_id", id)
        .eq("golfer_id", user?.id)
        .single();

      if (!membership || membership.role !== "coordinator") {
        Alert.alert("Access Denied", "Only coordinators can start rounds.");
        router.back();
        return;
      }

      await Promise.all([fetchLeague(), fetchMembers()]);

      // Determine pre-selected players from most recent round
      const { data: lastRound } = await supabase
        .from("rounds")
        .select("id")
        .eq("league_id", id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastRound && lastRound.length > 0) {
        const { data: lastScores } = await supabase
          .from("scores")
          .select("golfer_id")
          .eq("round_id", lastRound[0].id);

        if (lastScores) {
          setSelectedPlayerIds(new Set(lastScores.map((s) => s.golfer_id)));
        }
      } else {
        // First round — will select all members once they load
        setSelectedPlayerIds(new Set(["__ALL__"]));
      }

      setIsLoading(false);
    }

    init();
  }, [id, fetchLeague, fetchMembers, router]);

  // Once members load, if __ALL__ marker is set, select all
  useEffect(() => {
    if (members.length > 0 && selectedPlayerIds.has("__ALL__")) {
      setSelectedPlayerIds(new Set(members.map((m) => m.golfer_id)));
    }
  }, [members, selectedPlayerIds]);

  const togglePlayer = (golferId: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(golferId)) {
        next.delete(golferId);
      } else {
        next.add(golferId);
      }
      return next;
    });
  };

  const handleStartRound = async () => {
    if (!league) return;

    const playerIds = Array.from(selectedPlayerIds);
    if (playerIds.length === 0) {
      Alert.alert("No Players", "Select at least one player to start a round.");
      return;
    }

    setIsStarting(true);

    // 1. Create the round
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({ league_id: Number(id), course_id: league.course_id, status: "active" })
      .select()
      .single();

    if (roundError || !round) {
      Alert.alert("Error", "Failed to create round.");
      setIsStarting(false);
      return;
    }

    // 2. Build score_details from teebox_data
    const scoreDetails = buildScoreDetails(league.teebox_data);

    // 3. Batch insert scores for selected players
    const scoreRows = playerIds.map((golferId) => ({
      golfer_id: golferId,
      round_id: round.id,
      course_id: league.course_id,
      score: null,
      score_details: scoreDetails,
    }));

    const { error: scoresError } = await supabase
      .from("scores")
      .insert(scoreRows);

    setIsStarting(false);

    if (scoresError) {
      Alert.alert("Error", "Round created but failed to add player scores.");
      return;
    }

    router.dismissAll();
    router.push({
      pathname: "/gameplay",
      params: { roundId: round.id },
    });
  };

  if (isLoading || membersLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!league) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <Text variant="bodyLarge">League not found</Text>
      </View>
    );
  }

  const selectedCount = selectedPlayerIds.size;

  const getName = (member: LeagueUser) =>
    [member.profiles.first_name, member.profiles.last_name]
      .filter(Boolean)
      .join(" ") || "Unknown";

  return (
    <View className="flex-1 bg-white">
      {/* Sticky Header */}
      <View className="px-4 pt-6 pb-4">
        <View className="p-4 border border-green-200 rounded-lg bg-green-50">
          <Text
            variant="titleLarge"
            style={{ fontWeight: "700", color: "#14532d", marginBottom: 2 }}
          >
            {league.courses?.name ?? "Unknown Course"}
          </Text>
          <Text variant="bodyMedium" style={{ color: "#15803d" }}>
            {league.teebox_data?.name ?? "N/A"} tees
          </Text>
        </View>
      </View>

      {/* Player List */}
      <ScrollView className="flex-1 px-4">
        <Text
          variant="titleSmall"
          style={{ color: "#111827", marginBottom: 12 }}
        >
          Select Players ({selectedCount} of {members.length})
        </Text>

        {members.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: "#999", paddingVertical: 8 }}>
            No members in this league
          </Text>
        ) : (
          members.map((member) => (
            <View
              key={member.id}
              className="flex-row items-center justify-between py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}
            >
              <View className="flex-1">
                <Text
                  variant="bodyLarge"
                  style={{ color: "#1a1a1a", fontWeight: "600" }}
                >
                  {getName(member)}
                </Text>
                {member.profiles.email && (
                  <Text variant="bodySmall" style={{ color: "#555" }}>
                    {member.profiles.email}
                  </Text>
                )}
              </View>
              <Switch
                value={selectedPlayerIds.has(member.golfer_id)}
                onValueChange={() => togglePlayer(member.golfer_id)}
              />
            </View>
          ))
        )}
      </ScrollView>

      {/* Sticky Footer */}
      <View
        className="px-4 pt-4 pb-14"
        style={{ borderTopWidth: 1, borderTopColor: "#e5e5e5" }}
      >
        <Button
          mode="outlined"
          onPress={handleStartRound}
          loading={isStarting}
          disabled={selectedCount === 0 || isStarting}
        >
          Start Round ({selectedCount} players)
        </Button>
      </View>
    </View>
  );
}
