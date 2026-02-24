import UserAvatar from "@/components/UserAvatar";
import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import {
  Course,
  Teebox,
  parseTeeboxes,
  useCourseSearch,
} from "@/hooks/use-course-search";
import { useNearbyCourses } from "@/hooks/use-nearby-courses";
import { FriendWithProfile, useFriends } from "@/hooks/use-friends";
import { supabase } from "@/lib/supabase";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Chip,
  List,
  Searchbar,
  Text,
} from "react-native-paper";
import { createDefaultHoleStats, HoleData, ScoreDetails } from "@/types/scoring";
import "../global.css";

function buildScoreDetails(teebox: Teebox): ScoreDetails {
  const holes: Record<string, HoleData> = {};
  for (const [key, value] of Object.entries(teebox.holes)) {
    holes[key] = { ...value, score: "", stats: createDefaultHoleStats() };
  }
  return { name: teebox.name, holes };
}

export default function StartRoundScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Step 1: Course + Teebox
  const {
    query: courseQuery,
    results: courseResults,
    isSearching: courseSearching,
    search: searchCourses,
    clearSearch: clearCourseSearch,
  } = useCourseSearch();

  const {
    courses: nearbyCourses,
    isLoading: nearbyLoading,
    locationDenied,
  } = useNearbyCourses(10);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [teeboxes, setTeeboxes] = useState<Teebox[]>([]);
  const [selectedTeebox, setSelectedTeebox] = useState<Teebox | null>(null);

  // Step 2: Friends selection
  const { friends, refresh: refreshFriends } = useFriends(user?.id ?? "");
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    new Set(),
  );
  const [isStarting, setIsStarting] = useState(false);

  // Load friends when reaching step 2
  useEffect(() => {
    if (selectedTeebox) {
      refreshFriends();
    }
  }, [selectedTeebox, refreshFriends]);

  // --- Course selection ---
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    const parsed = parseTeeboxes(course.layout_data);
    setTeeboxes(parsed);
    setSelectedTeebox(parsed.length === 1 ? parsed[0] : null);
    clearCourseSearch();
  };

  const handleChangeCourse = () => {
    setSelectedCourse(null);
    setTeeboxes([]);
    setSelectedTeebox(null);
  };

  // --- Friend toggle ---
  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  // --- Start round ---
  const handleStartRound = async () => {
    if (!selectedCourse || !selectedTeebox || !user?.id) return;

    // All players = current user + selected friends
    const allPlayerIds = [
      user.id,
      ...friends
        .filter((f) => selectedFriendIds.has(f.profile.id))
        .map((f) => f.profile.id),
    ];

    setIsStarting(true);

    // 1. Create the round
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        creator_id: user.id,
        course_id: selectedCourse.id,
        teebox_data: selectedTeebox,
        status: "active",
      })
      .select()
      .single();

    if (roundError || !round) {
      Alert.alert("Error", "Failed to create round.");
      setIsStarting(false);
      return;
    }

    // 2. Create score rows for all players
    const scoreRows = allPlayerIds.map((golferId) => ({
      golfer_id: golferId,
      round_id: round.id,
      course_id: selectedCourse.id,
      score: null,
      score_details: buildScoreDetails(selectedTeebox),
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

  const getFriendName = (f: FriendWithProfile) =>
    [f.profile.first_name, f.profile.last_name].filter(Boolean).join(" ") ||
    f.profile.email ||
    "Unknown";

  const totalPlayers = selectedFriendIds.size + 1; // +1 for current user

  // --- Step 1: Course search ---
  if (!selectedCourse) {
    return (
      <View className="flex-1 bg-white">
        <View className="px-4 pt-4">
          <Text style={styles.sectionLabel}>
            Search for a Course
          </Text>
          <Searchbar
            placeholder="Search courses..."
            onChangeText={searchCourses}
            value={courseQuery}
            loading={courseSearching}
            mode="bar"
            style={styles.searchbar}
            inputStyle={{ color: Color.neutral900 }}
          />
        </View>
        {courseQuery.length >= 2 ? (
          <FlatList
            data={courseResults}
            keyExtractor={(item) => item.id.toString()}
            className="mt-2 px-4"
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                titleStyle={{ color: Color.neutral900, fontWeight: "600" }}
                description={
                  [item.street, item.state, item.postal_code]
                    .filter(Boolean)
                    .join(", ") || undefined
                }
                descriptionStyle={{ color: Color.neutral500 }}
                onPress={() => handleSelectCourse(item)}
                left={(props) => <List.Icon {...props} icon="golf" />}
              />
            )}
            ListEmptyComponent={
              !courseSearching ? (
                <View className="items-center py-8">
                  <Text variant="bodyMedium">No courses found</Text>
                </View>
              ) : null
            }
          />
        ) : !locationDenied ? (
          <ScrollView className="mt-4 px-4">
            <Text style={styles.sectionLabel}>
              Nearby
            </Text>
            {nearbyLoading ? (
              <ActivityIndicator
                size="small"
                color={Color.neutral900}
                style={{ marginTop: Space.xl }}
              />
            ) : nearbyCourses.length > 0 ? (
              nearbyCourses.map((item) => (
                <List.Item
                  key={item.id}
                  title={item.name}
                  titleStyle={{ color: Color.neutral900, fontWeight: "600" }}
                  description={
                    [
                      item.street,
                      item.state,
                      item.distance_miles != null
                        ? `${item.distance_miles.toFixed(1)} mi`
                        : null,
                    ]
                      .filter(Boolean)
                      .join("  ·  ") || undefined
                  }
                  descriptionStyle={{ color: Color.neutral500 }}
                  onPress={() => handleSelectCourse(item)}
                  left={(props) => (
                    <List.Icon {...props} icon="map-marker" />
                  )}
                />
              ))
            ) : (
              <View className="items-center py-8">
                <Text variant="bodyMedium" style={{ color: Color.neutral400 }}>
                  No nearby courses found
                </Text>
              </View>
            )}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  // --- Step 1b: Teebox selection (if course has multiple) ---
  if (!selectedTeebox) {
    return (
      <View className="flex-1 bg-white">
        <View className="px-4 pt-4">
          <View style={styles.courseCard}>
            <View style={styles.cardRow}>
              <Text
                variant="titleMedium"
                style={styles.courseName}
              >
                {selectedCourse.name}
              </Text>
              <Button mode="outlined" onPress={handleChangeCourse} compact>
                Change
              </Button>
            </View>
          </View>

          <Text style={styles.sectionLabel}>
            Select Tee Box
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Space.sm }}>
            {teeboxes.map((tb) => (
              <Chip
                key={tb.name}
                mode="outlined"
                onPress={() => setSelectedTeebox(tb)}
              >
                {tb.name.charAt(0).toUpperCase() + tb.name.slice(1)}
              </Chip>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // --- Step 2: Select friends ---
  return (
    <View className="flex-1 bg-white">
      {/* Header: Course + Teebox */}
      <View className="px-4 pt-4 pb-2">
        <View style={styles.courseCard}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text
                variant="titleMedium"
                style={styles.courseName}
              >
                {selectedCourse.name}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: Color.neutral500,
                  marginTop: 2,
                  textTransform: "capitalize",
                }}
              >
                {selectedTeebox.name} tees
              </Text>
            </View>
            <Button mode="outlined" onPress={handleChangeCourse} compact>
              Change
            </Button>
          </View>
        </View>
      </View>

      {/* Friends selection */}
      <View className="px-4 pb-2">
        <Text style={styles.sectionLabel}>
          Select Players ({totalPlayers})
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Current user (always included) */}
        <View style={styles.playerCard}>
          <View
            style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          >
            <Text
              variant="bodyLarge"
              style={{
                color: Color.neutral900,
                fontWeight: "600",
              }}
            >
              You
            </Text>
          </View>
          <FontAwesome5 name="check-circle" size={20} color={Color.primary} />
        </View>

        {/* Friends list */}
        {friends.map((friend) => {
          const isSelected = selectedFriendIds.has(friend.profile.id);
          return (
            <Pressable
              key={friend.id}
              onPress={() => toggleFriend(friend.profile.id)}
            >
              <View
                style={[
                  styles.playerCard,
                  isSelected && styles.playerCardSelected,
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    gap: Space.md,
                  }}
                >
                  <UserAvatar
                    avatarUrl={friend.profile.avatar_url}
                    firstName={friend.profile.first_name}
                    size={36}
                  />
                  <View>
                    <Text
                      variant="bodyLarge"
                      style={{
                        color: Color.neutral900,
                        fontWeight: "600",
                        textTransform: "capitalize",
                      }}
                    >
                      {getFriendName(friend)}
                    </Text>
                    {friend.profile.email && (
                      <Text variant="bodySmall" style={{ color: Color.neutral500 }}>
                        {friend.profile.email}
                      </Text>
                    )}
                  </View>
                </View>
                {isSelected ? (
                  <FontAwesome5
                    name="check-circle"
                    size={20}
                    color={Color.primary}
                  />
                ) : (
                  <FontAwesome5 name="circle" size={20} color={Color.neutral300} />
                )}
              </View>
            </Pressable>
          );
        })}

        {/* Empty friends message */}
        {friends.length === 0 && (
          <View className="items-center py-8">
            <Text
              variant="bodyMedium"
              style={{ color: Color.neutral400, textAlign: "center" }}
            >
              No friends yet. Add friends from the Friends tab to play
              together!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Footer */}
      <View
        className="px-4 pt-4 pb-14"
        style={{ borderTopWidth: 1, borderTopColor: Color.neutral200 }}
      >
        <Button
          mode="contained"
          buttonColor={Color.primary}
          textColor={Color.white}
          onPress={handleStartRound}
          loading={isStarting}
          disabled={isStarting}
          style={{ borderRadius: Radius.lg }}
        >
          Start Round ({totalPlayers}{" "}
          {totalPlayers === 1 ? "player" : "players"})
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.md,
    textTransform: "uppercase",
  },
  searchbar: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.full,
  },
  courseCard: {
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    marginBottom: Space.lg,
    ...Shadow.sm,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseName: {
    fontWeight: "700",
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  playerCard: {
    borderWidth: 1,
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.lg,
    marginBottom: Space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Shadow.sm,
  },
  playerCardSelected: {
    borderColor: Color.primary,
    backgroundColor: Color.primaryLight,
  },
});
