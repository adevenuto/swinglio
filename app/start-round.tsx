import CourseCard from "@/components/CourseCard";
import GradientButton from "@/components/GradientButton";
import UserAvatar from "@/components/UserAvatar";
import {
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
} from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import {
  Course,
  courseHasRatings,
  parseGreenCenters,
  parseTeeboxes,
  Teebox,
  useCourseSearch,
} from "@/hooks/use-course-search";
import { FriendWithProfile, useFriends } from "@/hooks/use-friends";
import { useNearbyCourses } from "@/hooks/use-nearby-courses";
import { supabase } from "@/lib/supabase";
import {
  createDefaultHoleStats,
  HoleData,
  ScoreDetails,
} from "@/types/scoring";
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
import { Button, Searchbar, Text } from "react-native-paper";

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

  const { friends, refresh: refreshFriends } = useFriends(user?.id ?? "");
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    new Set(),
  );
  const [isStarting, setIsStarting] = useState(false);
  const [featuredImages, setFeaturedImages] = useState<Record<number, string>>(
    {},
  );

  useEffect(() => {
    const courseIds = [
      ...courseResults.map((c) => c.id),
      ...nearbyCourses.map((c) => c.id),
    ];
    const uniqueIds = [...new Set(courseIds)];
    if (uniqueIds.length === 0) return;

    supabase
      .from("course_images")
      .select("course_id, image_url")
      .eq("is_featured", true)
      .in("course_id", uniqueIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<number, string> = {};
        for (const row of data) {
          map[row.course_id] = row.image_url;
        }
        setFeaturedImages((prev) => ({ ...prev, ...map }));
      });
  }, [courseResults, nearbyCourses]);

  useEffect(() => {
    if (selectedTeebox) {
      refreshFriends();
    }
  }, [selectedTeebox, refreshFriends]);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    const parsed = parseTeeboxes(course.layout_data);
    setTeeboxes(parsed);
    setSelectedTeebox(parsed.length === 1 ? parsed[0] : null);
  };

  const handleChangeCourse = () => {
    setSelectedCourse(null);
    setTeeboxes([]);
    setSelectedTeebox(null);
  };

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

  const handleStartRound = async () => {
    if (!selectedCourse || !selectedTeebox || !user?.id) return;

    const allPlayerIds = [
      user.id,
      ...friends
        .filter((f) => selectedFriendIds.has(f.profile.id))
        .map((f) => f.profile.id),
    ];

    setIsStarting(true);

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        creator_id: user.id,
        course_id: selectedCourse.id,
        teebox_data: selectedTeebox,
        status: "active",
        date_played: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (roundError || !round) {
      Alert.alert("Error", "Failed to create round.");
      setIsStarting(false);
      return;
    }

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

  const totalPlayers = selectedFriendIds.size + 1;

  // --- Step 1: Course search ---
  if (!selectedCourse) {
    return (
      <View style={styles.screen}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Search for a Course</Text>
          <Searchbar
            placeholder="Search courses..."
            onChangeText={searchCourses}
            value={courseQuery}
            loading={courseSearching}
            mode="bar"
            style={styles.searchbar}
            inputStyle={{ fontFamily: Font.regular, color: Color.neutral900 }}
          />
        </View>
        {courseQuery.length >= 2 ? (
          <FlatList
            data={courseResults}
            keyExtractor={(item) => item.id.toString()}
            style={{ marginTop: Space.sm, paddingHorizontal: Space.lg }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <CourseCard
                courseId={item.id}
                clubName={item.club_name}
                courseName={item.course_name}
                description={
                  [item.street, item.state, item.postal_code]
                    .filter(Boolean)
                    .join(", ") || undefined
                }
                featuredImageUrl={featuredImages[item.id]}
                missingRatings={!courseHasRatings(item.layout_data)}
                hasGreenCenters={
                  Object.keys(parseGreenCenters(item.layout_data)).length > 0
                }
                onPress={() => handleSelectCourse(item)}
              />
            )}
            ListEmptyComponent={
              !courseSearching ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No courses found</Text>
                </View>
              ) : null
            }
          />
        ) : !locationDenied ? (
          <ScrollView
            style={{ marginTop: Space.lg, paddingHorizontal: Space.lg }}
          >
            <Text style={styles.sectionLabel}>Nearby</Text>
            {nearbyLoading ? (
              <ActivityIndicator
                size="small"
                color={Color.neutral900}
                style={{ marginTop: Space.xl }}
              />
            ) : nearbyCourses.length > 0 ? (
              nearbyCourses.map((item) => (
                <CourseCard
                  key={item.id}
                  courseId={item.id}
                  clubName={item.club_name}
                  courseName={item.course_name}
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
                  featuredImageUrl={featuredImages[item.id]}
                  missingRatings={!courseHasRatings(item.layout_data)}
                  hasGreenCenters={
                    Object.keys(parseGreenCenters(item.layout_data)).length > 0
                  }
                  onPress={() => handleSelectCourse(item)}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No nearby courses found</Text>
              </View>
            )}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  // --- Step 1b: Teebox selection ---
  if (!selectedTeebox) {
    const holeCount = Object.keys(teeboxes[0]?.holes ?? {}).length;

    return (
      <View style={styles.screen}>
        <View style={styles.section}>
          <View style={styles.courseCard}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseName}>
                  {selectedCourse.club_name}
                </Text>
                {selectedCourse.course_name &&
                  selectedCourse.course_name !== selectedCourse.club_name && (
                    <Text style={styles.courseSubtitle}>
                      {selectedCourse.course_name}
                    </Text>
                  )}
                {selectedCourse.street && (
                  <Text style={styles.courseDetail}>
                    {selectedCourse.street}
                  </Text>
                )}
                <Text style={styles.courseDetail}>
                  {[
                    selectedCourse.state,
                    holeCount > 0 ? `${holeCount} holes` : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={handleChangeCourse}
                compact
                textColor={Color.primary}
                style={{ borderColor: Color.primary }}
                labelStyle={{ fontFamily: Font.medium }}
              >
                Change
              </Button>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Select Tee Box</Text>
          <View style={styles.teeboxGrid}>
          {teeboxes.map((tb) => {
            const label =
              tb.name.charAt(0).toUpperCase() + tb.name.slice(1);
            const accentColor = tb.color ?? Color.neutral300;
            const hasMeta = tb.slope != null || tb.courseRating != null;

            return (
              <Pressable
                key={tb.name}
                onPress={() => setSelectedTeebox(tb)}
                style={({ pressed }) => [
                  styles.teeboxCard,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View
                  style={[
                    styles.teeboxAccent,
                    { backgroundColor: accentColor },
                  ]}
                >
                  {tb.secondaryColor && (
                    <View
                      style={[
                        styles.teeboxAccentInner,
                        { backgroundColor: tb.secondaryColor },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.teeboxCardLeft}>
                  <Text style={styles.teeboxCardName}>{label}</Text>
                  {hasMeta && (
                    <Text style={styles.teeboxCardMeta}>
                      {[
                        tb.slope != null ? `Slope ${tb.slope}` : null,
                        tb.courseRating != null ? `${tb.courseRating}` : null,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </Text>
                  )}
                  {tb.totalYardage != null && (
                    <Text style={styles.teeboxYardageText}>
                      {tb.totalYardage.toLocaleString()} yds
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
          </View>
        </View>
      </View>
    );
  }

  // --- Step 2: Select friends ---
  return (
    <View style={styles.screen}>
      {/* Header: Course + Teebox */}
      <View style={styles.section}>
        <View style={styles.courseCard}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseName}>{selectedCourse.club_name}</Text>
              <Text style={styles.courseSubtitle}>
                {selectedTeebox.name} tees
              </Text>
            </View>
            <Button
              mode="outlined"
              onPress={handleChangeCourse}
              compact
              labelStyle={{ fontFamily: Font.medium }}
            >
              Change
            </Button>
          </View>
        </View>
      </View>

      {/* Friends selection */}
      <View style={{ paddingHorizontal: Space.lg, paddingBottom: Space.sm }}>
        <Text style={styles.sectionLabel}>Select Players ({totalPlayers})</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: Space.lg }}>
        {/* Current user (always included) */}
        <View style={styles.playerCard}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.playerYouText}>You</Text>
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
                    <Text style={styles.playerName}>
                      {getFriendName(friend)}
                    </Text>
                    {friend.profile.email && (
                      <Text style={styles.playerEmail}>
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
                  <FontAwesome5
                    name="circle"
                    size={20}
                    color={Color.neutral300}
                  />
                )}
              </View>
            </Pressable>
          );
        })}

        {/* Empty friends message */}
        {friends.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No friends yet. Add friends from the Friends tab to play together!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.stickyFooter}>
        <GradientButton
          onPress={handleStartRound}
          label={`Start Round (${totalPlayers} ${totalPlayers === 1 ? "player" : "players"})`}
          loading={isStarting}
          disabled={isStarting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  section: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
  },
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.md,
  },
  teeboxGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  teeboxCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Color.neutral200,
    paddingVertical: Space.md,
    paddingHorizontal: Space.md,
    width: "48.5%",
    ...Shadow.sm,
  },
  teeboxAccent: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginRight: Space.md,
    overflow: "hidden",
  },
  teeboxAccentInner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  teeboxCardLeft: {
    flex: 1,
  },
  teeboxCardName: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  teeboxCardMeta: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Color.neutral400,
    marginTop: 2,
  },
  teeboxYardageText: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.neutral700,
    marginTop: Space.xs,
  },
  courseDetail: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral400,
    marginTop: 2,
  },
  searchbar: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.full,
  },
  courseCard: {
    padding: Space.lg,
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
    fontFamily: Font.bold,
    fontSize: 17,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  courseSubtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginTop: 2,
    textTransform: "capitalize",
  },
  playerCard: {
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
    borderColor: Color.primaryBorder,
    backgroundColor: Color.primaryLight,
  },
  playerYouText: {
    fontFamily: Font.semiBold,
    fontSize: 16,
    color: Color.neutral900,
  },
  playerName: {
    fontFamily: Font.semiBold,
    fontSize: 16,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  playerEmail: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Space.xxl,
  },
  emptyText: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral400,
    textAlign: "center",
  },
  stickyFooter: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    paddingBottom: 56,
    borderTopWidth: 1,
    borderTopColor: Color.neutral200,
  },
});
