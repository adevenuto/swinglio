import RoundCard from "@/components/RoundCard";
import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/contexts/subscription-context";
import { usePaginatedRounds } from "@/hooks/use-paginated-rounds";
import { RecentRound } from "@/hooks/use-recent-rounds";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "react-native-paper";

export default function RoundHistoryScreen() {
  const { filter = "all" } = useLocalSearchParams<{
    filter?: "completed" | "incomplete" | "all";
  }>();
  const { user } = useAuth();
  const { isPro, presentPaywall } = useSubscription();
  const router = useRouter();
  const listRef = useRef<FlatList<RecentRound>>(null);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortMode, setSortMode] = useState<
    "date-desc" | "date-asc" | "score-low" | "score-high"
  >("date-desc");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const {
    rounds, isLoading, isRefreshing, isLoadingMore, hasMore,
    refresh, pullToRefresh, loadMore,
  } = usePaginatedRounds(user?.id ?? "", {
      pageSize: 20,
      maxTotal: isPro ? undefined : 10,
      searchQuery: debouncedSearch,
      sortBy: sortMode.startsWith("date") ? "date" : "score",
      sortDir:
        sortMode === "date-asc" || sortMode === "score-low" ? "asc" : "desc",
    });

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [debouncedSearch]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [sortMode]);

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

  const keyExtractor = useCallback((item: RecentRound) => String(item.id), []);

  return (
    <View style={styles.screen}>
      <View style={styles.searchWrap}>
        <Feather
          name="search"
          size={18}
          color={Color.neutral400}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by course name..."
          placeholderTextColor={Color.neutral400}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <Pressable
            onPress={() => setSearchText("")}
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
            hitSlop={8}
          >
            <Feather name="x" size={18} color={Color.neutral400} />
          </Pressable>
        )}
      </View>
      <View style={styles.sortRow}>
        <Pressable
          onPress={() =>
            setSortMode((m) => (m === "date-desc" ? "date-asc" : "date-desc"))
          }
          style={({ pressed }) => [
            styles.sortChip,
            sortMode.startsWith("date") && styles.sortChipActive,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[
              styles.sortChipText,
              sortMode.startsWith("date") && styles.sortChipTextActive,
            ]}
          >
            {sortMode === "date-asc" ? "Date - Oldest" : "Date - Recent"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            setSortMode((m) => (m === "score-low" ? "score-high" : "score-low"))
          }
          style={({ pressed }) => [
            styles.sortChip,
            sortMode.startsWith("score") && styles.sortChipActive,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[
              styles.sortChipText,
              sortMode.startsWith("score") && styles.sortChipTextActive,
            ]}
          >
            {sortMode === "score-high" ? "Score - High" : "Score - Low"}
          </Text>
        </Pressable>
      </View>
      <FlatList
        ref={listRef}
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        onRefresh={pullToRefresh}
        refreshing={isRefreshing}
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Color.white,
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.lg,
    marginHorizontal: Space.lg,
    marginTop: Space.lg,
    paddingHorizontal: Space.md,
    height: 44,
  },
  searchIcon: {
    marginRight: Space.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral900,
    paddingVertical: 0,
  },
  sortRow: {
    flexDirection: "row",
    gap: Space.sm,
    marginHorizontal: Space.lg,
    marginTop: Space.sm,
    marginBottom: Space.sm,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Color.neutral200,
    backgroundColor: Color.white,
  },
  sortChipActive: {
    borderColor: Color.primary,
    backgroundColor: Color.primaryLight,
  },
  sortChipText: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral500,
  },
  sortChipTextActive: {
    color: Color.primary,
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
