import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import {
  Course,
  Teebox,
  parseTeeboxes,
  useCourseSearch,
} from "@/hooks/use-course-search";
import { FriendWithProfile, useFriends } from "@/hooks/use-friends";
import { supabase } from "@/lib/supabase";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, View } from "react-native";
import {
  Button,
  Chip,
  List,
  Searchbar,
  Text,
} from "react-native-paper";
import "../global.css";

function buildScoreDetails(teebox: Teebox) {
  const holes: Record<
    string,
    { par: string; length: string; score: string; handicap?: number }
  > = {};
  for (const [key, value] of Object.entries(teebox.holes)) {
    holes[key] = { ...value, score: "" };
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
          <Text
            variant="titleSmall"
            style={{ color: "#111827", marginBottom: 12 }}
          >
            Search for a Course
          </Text>
          <Searchbar
            placeholder="Search courses..."
            onChangeText={searchCourses}
            value={courseQuery}
            loading={courseSearching}
            mode="bar"
            style={{
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "#d4d4d4",
              borderRadius: 8,
            }}
            inputStyle={{ color: "#1a1a1a" }}
          />
        </View>
        <FlatList
          data={courseResults}
          keyExtractor={(item) => item.id.toString()}
          className="mt-2 px-4"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              titleStyle={{ color: "#1a1a1a", fontWeight: "600" }}
              description={
                [item.street, item.state, item.postal_code]
                  .filter(Boolean)
                  .join(", ") || undefined
              }
              descriptionStyle={{ color: "#555" }}
              onPress={() => handleSelectCourse(item)}
              left={(props) => <List.Icon {...props} icon="golf" />}
            />
          )}
          ListEmptyComponent={
            courseQuery.length >= 2 && !courseSearching ? (
              <View className="items-center py-8">
                <Text variant="bodyMedium">No courses found</Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  // --- Step 1b: Teebox selection (if course has multiple) ---
  if (!selectedTeebox) {
    return (
      <View className="flex-1 bg-white">
        <View className="px-4 pt-4">
          <View
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: "#d4d4d4",
              borderRadius: 8,
              backgroundColor: "#fff",
              marginBottom: 16,
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
                variant="titleMedium"
                style={{
                  fontWeight: "700",
                  color: "#1a1a1a",
                  textTransform: "capitalize",
                }}
              >
                {selectedCourse.name}
              </Text>
              <Button mode="outlined" onPress={handleChangeCourse} compact>
                Change
              </Button>
            </View>
          </View>

          <Text
            variant="titleSmall"
            style={{ color: "#111827", marginBottom: 12 }}
          >
            Select Tee Box
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
            <View style={{ flex: 1 }}>
              <Text
                variant="titleMedium"
                style={{
                  fontWeight: "700",
                  color: "#1a1a1a",
                  textTransform: "capitalize",
                }}
              >
                {selectedCourse.name}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: "#555",
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
        <Text
          variant="titleSmall"
          style={{ color: "#111827", marginBottom: 8 }}
        >
          Select Players ({totalPlayers})
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Current user (always included) */}
        <View
          style={{
            borderWidth: 1,
            borderColor: "#d4d4d4",
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 16,
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          >
            <Text
              variant="bodyLarge"
              style={{
                color: "#1a1a1a",
                fontWeight: "600",
              }}
            >
              You
            </Text>
          </View>
          <FontAwesome5 name="check-circle" size={20} color="#16a34a" />
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
                style={{
                  borderWidth: 1,
                  borderColor: isSelected ? "#16a34a" : "#d4d4d4",
                  backgroundColor: isSelected ? "#f0fdf4" : "#fff",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    gap: 12,
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
                        color: "#1a1a1a",
                        fontWeight: "600",
                        textTransform: "capitalize",
                      }}
                    >
                      {getFriendName(friend)}
                    </Text>
                    {friend.profile.email && (
                      <Text variant="bodySmall" style={{ color: "#555" }}>
                        {friend.profile.email}
                      </Text>
                    )}
                  </View>
                </View>
                {isSelected ? (
                  <FontAwesome5
                    name="check-circle"
                    size={20}
                    color="#16a34a"
                  />
                ) : (
                  <FontAwesome5 name="circle" size={20} color="#d4d4d4" />
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
              style={{ color: "#999", textAlign: "center" }}
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
        style={{ borderTopWidth: 1, borderTopColor: "#e5e5e5" }}
      >
        <Button
          mode="outlined"
          onPress={handleStartRound}
          loading={isStarting}
          disabled={isStarting}
        >
          Start Round ({totalPlayers}{" "}
          {totalPlayers === 1 ? "player" : "players"})
        </Button>
      </View>
    </View>
  );
}
