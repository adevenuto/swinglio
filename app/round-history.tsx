import RoundCard from "@/components/RoundCard";
import { Color, Font, Radius, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/contexts/subscription-context";
import { RecentRound } from "@/hooks/use-recent-rounds";
import { usePaginatedRounds } from "@/hooks/use-paginated-rounds";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export default function RoundHistoryScreen() {
  const { filter = "all" } = useLocalSearchParams<{
    filter?: "completed" | "incomplete" | "all";
  }>();
  const { user } = useAuth();
  const { isPro, presentPaywall } = useSubscription();
  const router = useRouter();
  const { rounds, isLoading, isLoadingMore, hasMore, refresh, loadMore } =
    usePaginatedRounds(user?.id ?? "", {
      pageSize: 20,
      maxTotal: isPro ? undefined : 10,
    });

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    if (filter === "completed")
      return rounds.filter((r) => r.player_status === "completed");
    if (filter === "incomplete")
      return rounds.filter((r) => r.player_status === "incomplete");
    return rounds;
  }, [rounds, filter]);

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
        players={item.players}
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No rounds to show.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          !isPro && filtered.length >= 10 ? (
            <Pressable
              onPress={presentPaywall}
              style={({ pressed }) => [
                styles.upgradeFooter,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="lock" size={16} color={Color.primary} />
              <Text style={styles.upgradeFooterText}>
                Viewing last 10 rounds — Upgrade to see all
              </Text>
            </Pressable>
          ) : isLoadingMore ? (
            <ActivityIndicator
              style={styles.loadingMore}
              color={Color.primary}
            />
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
  upgradeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
    paddingVertical: Space.lg,
    marginTop: Space.sm,
    backgroundColor: Color.primaryLight,
    borderRadius: Radius.md,
  },
  upgradeFooterText: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.primary,
  },
  loadingMore: {
    paddingVertical: Space.lg,
  },
});
