import { useAuth } from "@/contexts/auth-context";
import { useCourseSearch } from "@/hooks/use-course-search";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import { Button, Searchbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditorScreen() {
  const { isEditor } = useAuth();
  const router = useRouter();
  const { query, results, isSearching, search, clearSearch } =
    useCourseSearch();

  if (!isEditor) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Text variant="titleMedium" style={{ color: "#555" }}>
            Access denied
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const showResults = query.length >= 2;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
          >
            <MaterialIcons name="chevron-left" size={28} color="#1a1a1a" />
            <RNText style={{ fontSize: 16, color: "#1a1a1a" }}>Back</RNText>
          </Pressable>
        </View>
        <View className="px-4">
          {/* Create Section */}
          <View
            style={{
              borderWidth: 1,
              borderColor: "#d4d4d4",
              borderRadius: 8,
              backgroundColor: "#fff",
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              variant="titleMedium"
              style={{ color: "#1a1a1a", fontWeight: "600", marginBottom: 4 }}
            >
              Create New Course
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: "#555", marginBottom: 12 }}
            >
              Add a course that doesn't exist yet
            </Text>
            <Button
              mode="outlined"
              onPress={() => router.push("/course-editor")}
            >
              Create Course
            </Button>
          </View>

          {/* Edit Section */}
          <Text
            variant="titleMedium"
            style={{ color: "#1a1a1a", fontWeight: "600", marginBottom: 12 }}
          >
            Edit Existing
          </Text>

          <Searchbar
            placeholder="Search courses..."
            onChangeText={search}
            value={query}
            loading={isSearching}
            mode="bar"
            style={{
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "#d4d4d4",
              borderRadius: 8,
              marginBottom: 16,
            }}
            inputStyle={{ color: "#1a1a1a" }}
          />

          {showResults && results.length === 0 && !isSearching && (
            <View className="items-center py-4">
              <Text variant="bodyMedium" style={{ color: "#999" }}>
                No courses found
              </Text>
            </View>
          )}

          {showResults &&
            results.map((course) => (
              <View
                key={course.id}
                style={{
                  borderWidth: 1,
                  borderColor: "#d4d4d4",
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    variant="bodyLarge"
                    style={{ color: "#1a1a1a", fontWeight: "600" }}
                  >
                    {course.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: "#555" }}>
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
                >
                  Edit
                </Button>
              </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
