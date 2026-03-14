import { Btn, Color, Font, Radius, Shadow, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useCourseSearch } from "@/hooks/use-course-search";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Searchbar, Text } from "react-native-paper";

export default function EditorScreen() {
  const { isEditor } = useAuth();
  const router = useRouter();
  const { query, results, isSearching, search, clearSearch } =
    useCourseSearch();

  if (!isEditor) {
    return (
      <View style={styles.screen}>
        <View style={styles.centeredContainer}>
          <Text style={{ fontFamily: Font.medium, fontSize: 16, color: Color.neutral500 }}>
            Access denied
          </Text>
        </View>
      </View>
    );
  }

  const showResults = query.length >= 2;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="chevron-left" size={28} color={Color.neutral900} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: Space.lg }}>
          {/* Create Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create New Course</Text>
            <Text style={styles.cardSubtitle}>Add a course that doesn't exist yet</Text>
            <Button
              mode="contained"
              buttonColor={Color.primary}
              textColor={Color.white}
              onPress={() => router.push("/course-editor")}
              style={Btn.pill}
              labelStyle={{ fontFamily: Font.bold }}
            >
              Create Course
            </Button>
          </View>

          {/* Edit Section */}
          <Text style={styles.sectionTitle}>Edit Existing</Text>

          <Searchbar
            placeholder="Search courses..."
            onChangeText={search}
            value={query}
            loading={isSearching}
            mode="bar"
            style={styles.searchbar}
            inputStyle={{ fontFamily: Font.regular, color: Color.neutral900 }}
          />

          {showResults && results.length === 0 && !isSearching && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No courses found</Text>
            </View>
          )}

          {showResults &&
            results.map((course) => (
              <View key={course.id} style={styles.courseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseName}>{course.club_name}</Text>
                  <Text style={styles.courseAddress}>
                    {[course.street, course.state, course.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  compact
                  onPress={() =>
                    router.push({
                      pathname: "/course-editor",
                      params: { courseId: String(course.id) },
                    })
                  }
                  textColor={Color.primary}
                  style={{ borderColor: Color.primary }}
                  labelStyle={{ fontFamily: Font.medium }}
                >
                  Edit
                </Button>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  scroll: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.lg,
  },
  navRow: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.md,
  },
  backText: {
    fontFamily: Font.regular,
    fontSize: 16,
    color: Color.neutral900,
  },
  card: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    marginBottom: Space.xl,
    ...Shadow.sm,
  },
  cardTitle: {
    fontFamily: Font.semiBold,
    fontSize: 17,
    color: Color.neutral900,
    marginBottom: Space.xs,
  },
  cardSubtitle: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginBottom: Space.md,
  },
  sectionTitle: {
    fontFamily: Font.semiBold,
    fontSize: 17,
    color: Color.neutral900,
    marginBottom: Space.md,
  },
  searchbar: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.full,
    marginBottom: Space.lg,
  },
  courseRow: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.md,
    marginBottom: Space.sm,
    flexDirection: "row",
    alignItems: "center",
    ...Shadow.sm,
  },
  courseName: {
    fontFamily: Font.semiBold,
    fontSize: 16,
    color: Color.neutral900,
  },
  courseAddress: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Space.lg,
  },
  emptyText: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral400,
  },
});
