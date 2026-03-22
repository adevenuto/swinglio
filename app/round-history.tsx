import RoundCard from "@/components/RoundCard";
import { Color, Font, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { RecentRound, useRecentRounds } from "@/hooks/use-recent-rounds";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export default function RoundHistoryScreen() {
  const { filter = "all" } = useLocalSearchParams<{
    filter?: "completed" | "incomplete" | "all";
  }>();
  const { user } = useAuth();
  const router = useRouter();
  const { recentRounds, isLoading, refresh } = useRecentRounds(user?.id ?? "");

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    if (filter === "completed")
      return recentRounds.filter((r) => r.player_status === "completed");
    if (filter === "incomplete")
      return recentRounds.filter((r) => r.player_status === "incomplete");
    return recentRounds;
  }, [recentRounds, filter]);

  const renderItem = useCallback(
    ({ item }: { item: RecentRound }) => (
      <RoundCard
        courseName={item.courses?.club_name || "Unknown Course"}
        courseNameSub={
          item.courses?.course_name &&
          item.courses.course_name !== item.courses.club_name
            ? `- ${item.courses.course_name}`
            : null
        }
        playerStatus={item.player_status}
        teeboxName={(item.teebox_data as any)?.name}
        date={item.display_date}
        playerScore={item.player_score}
        scoreToPar={item.score_to_par}
        holesCompleted={item.holes_completed}
        holeCount={item.hole_count}
        onPress={() =>
          router.push({
            pathname: "/round-summary",
            params: { roundId: item.id },
          })
        }
      />
    ),
    [router],
  );

  const keyExtractor = useCallback(
    (item: RecentRound) => String(item.id),
    [],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No rounds to show.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  list: {
    padding: Space.lg,
    paddingBottom: Space.xxxl,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: Space.xxxl,
  },
  emptyText: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral400,
    textAlign: "center",
  },
});
