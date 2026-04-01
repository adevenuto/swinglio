import CourseCard from "@/components/CourseCard";
import GradientButton from "@/components/GradientButton";
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
  parseTeeboxes,
  Teebox,
  useCourseSearch,
} from "@/hooks/use-course-search";
import { supabase } from "@/lib/supabase";
import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { Button, Chip, Searchbar, Text } from "react-native-paper";
import { toast } from "sonner-native";

function teeboxHasRatings(tb: Teebox): boolean {
  const cr = Number(tb.courseRating);
  const slope = Number(tb.slope);
  return !isNaN(cr) && cr > 0 && !isNaN(slope) && slope >= 55 && slope <= 155;
}

function computeParFromTeebox(tb: Teebox): number {
  return Object.values(tb.holes).reduce((sum, h) => {
    const p = parseInt(h.par, 10);
    return sum + (isNaN(p) ? 0 : p);
  }, 0);
}

export default function AddPastRoundScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Course search
  const {
    query: courseQuery,
    results: courseResults,
    isSearching: courseSearching,
    search: searchCourses,
  } = useCourseSearch();

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [teeboxes, setTeeboxes] = useState<Teebox[]>([]);
  const [selectedTeebox, setSelectedTeebox] = useState<Teebox | null>(null);
  const [featuredImages, setFeaturedImages] = useState<Record<number, string>>(
    {},
  );

  // Date + score
  const [datePlayed, setDatePlayed] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === "ios");
  const [scoreText, setScoreText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const courseIds = courseResults.map((c) => c.id);
    if (courseIds.length === 0) return;

    supabase
      .from("course_images")
      .select("course_id, image_url")
      .eq("is_featured", true)
      .in("course_id", courseIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<number, string> = {};
        for (const row of data) {
          map[row.course_id] = row.image_url;
        }
        setFeaturedImages((prev) => ({ ...prev, ...map }));
      });
  }, [courseResults]);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    const parsed = parseTeeboxes(course.layout_data);
    // Only show teeboxes with valid ratings
    const ratedTeeboxes = parsed.filter(teeboxHasRatings);
    setTeeboxes(ratedTeeboxes);
    setSelectedTeebox(ratedTeeboxes.length === 1 ? ratedTeeboxes[0] : null);
  };

  const handleChangeCourse = () => {
    setSelectedCourse(null);
    setTeeboxes([]);
    setSelectedTeebox(null);
    setScoreText("");
  };

  const handleChangeTeebox = () => {
    setSelectedTeebox(null);
    setScoreText("");
  };

  const handleSave = async () => {
    if (!selectedCourse || !selectedTeebox || !user?.id) return;
    const score = parseInt(scoreText, 10);
    if (isNaN(score) || score <= 0) {
      Alert.alert("Invalid Score", "Please enter a valid total score.");
      return;
    }

    setIsSaving(true);
    Keyboard.dismiss();

    const dateStr = datePlayed.toISOString().split("T")[0];

    // Insert round
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        creator_id: user.id,
        course_id: selectedCourse.id,
        teebox_data: selectedTeebox,
        status: "completed",
        date_played: dateStr,
      })
      .select()
      .single();

    if (roundError || !round) {
      Alert.alert("Error", "Failed to create round.");
      setIsSaving(false);
      return;
    }

    // Insert score
    const { error: scoreError } = await supabase.from("scores").insert({
      golfer_id: user.id,
      round_id: round.id,
      course_id: selectedCourse.id,
      score,
      score_details: null,
      player_status: "completed",
      self_attested: true,
    });

    setIsSaving(false);

    if (scoreError) {
      Alert.alert("Error", "Round created but failed to save score.");
      return;
    }

    toast.success("Past round added");
    router.back();
  };

  const score = parseInt(scoreText, 10);
  const canSave = !isSaving && !isNaN(score) && score > 0;
  const par = selectedTeebox ? computeParFromTeebox(selectedTeebox) : 0;

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
        ) : null}
      </View>
    );
  }

  // --- Step 1b: Teebox selection ---
  if (!selectedTeebox) {
    return (
      <View style={styles.screen}>
        <View style={styles.section}>
          <View style={styles.courseCard}>
            <View style={styles.cardRow}>
              <Text style={styles.courseName}>{selectedCourse.club_name}</Text>
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
          {teeboxes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No tee boxes with valid course rating and slope found for this
                course.
              </Text>
            </View>
          ) : (
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: Space.sm }}
            >
              {teeboxes.map((tb) => (
                <Chip
                  key={tb.name}
                  mode="flat"
                  onPress={() => setSelectedTeebox(tb)}
                  style={{ backgroundColor: Color.primary }}
                  textStyle={{ fontFamily: Font.medium, color: Color.white }}
                >
                  {tb.name.charAt(0).toUpperCase() + tb.name.slice(1)}
                </Chip>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // --- Step 2: Date + Score entry ---
  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Course + teebox summary */}
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
              onPress={handleChangeTeebox}
              compact
              textColor={Color.primary}
              style={{ borderColor: Color.primary }}
              labelStyle={{ fontFamily: Font.medium }}
            >
              Change
            </Button>
          </View>
          {/* Rating info */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>Rating</Text>
              <Text style={styles.ratingValue}>
                {Number(selectedTeebox.courseRating).toFixed(1)}
              </Text>
            </View>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>Slope</Text>
              <Text style={styles.ratingValue}>{selectedTeebox.slope}</Text>
            </View>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>Par</Text>
              <Text style={styles.ratingValue}>{par}</Text>
            </View>
          </View>
        </View>

        {/* Date picker */}
        <Text style={styles.sectionLabel}>Date Played</Text>
        {Platform.OS === "android" && (
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [
              styles.dateButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="calendar" size={18} color={Color.neutral700} />
            <Text style={styles.dateText}>
              {datePlayed.toLocaleDateString()}
            </Text>
          </Pressable>
        )}
        {showDatePicker && (
          <DateTimePicker
            value={datePlayed}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            maximumDate={new Date()}
            onChange={(_, selected) => {
              if (Platform.OS === "android") setShowDatePicker(false);
              if (selected) setDatePlayed(selected);
            }}
            accentColor={Color.primary}
            style={Platform.OS === "ios" ? styles.iosPicker : undefined}
          />
        )}

        {/* Score input */}
        <Text style={[styles.sectionLabel, { marginTop: Space.xl }]}>
          Total Score
        </Text>
        <View style={styles.scoreInputWrap}>
          <TextInput
            style={styles.scoreInput}
            value={scoreText}
            onChangeText={(t) => setScoreText(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="e.g. 92"
            placeholderTextColor={Color.neutral400}
            maxLength={3}
            returnKeyType="done"
          />
          {canSave && par > 0 && (
            <Text style={styles.scoreContext}>
              {score - par === 0
                ? "Even par"
                : score - par > 0
                  ? `+${score - par}`
                  : `${score - par}`}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.stickyFooter}>
        <GradientButton
          onPress={handleSave}
          label="Save Round"
          loading={isSaving}
          disabled={!canSave}
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
  scrollContent: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    paddingBottom: Space.xxxl,
  },
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.md,
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
  ratingRow: {
    flexDirection: "row",
    marginTop: Space.md,
    gap: Space.xl,
  },
  ratingItem: {
    alignItems: "center",
  },
  ratingLabel: {
    ...Type.caption,
    fontSize: 11,
    marginBottom: 2,
  },
  ratingValue: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.neutral900,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.lg,
    backgroundColor: Color.white,
    paddingHorizontal: Space.lg,
    height: 52,
  },
  dateText: {
    fontFamily: Font.medium,
    fontSize: 15,
    color: Color.neutral900,
  },
  iosPicker: {
    alignSelf: "flex-start",
    marginBottom: Space.sm,
  },
  scoreInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.lg,
  },
  scoreInput: {
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.lg,
    backgroundColor: Color.white,
    paddingHorizontal: Space.xl,
    height: 52,
    fontFamily: Font.bold,
    fontSize: 24,
    color: Color.neutral900,
    minWidth: 120,
    textAlign: "center",
  },
  scoreContext: {
    fontFamily: Font.semiBold,
    fontSize: 16,
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
