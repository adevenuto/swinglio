import GameConfigForm from "@/components/GameConfigForm";
import {
  Course,
  parseTeeboxes,
  Teebox,
  useCourseSearch,
} from "@/hooks/use-course-search";
import {
  DEFAULT_GAME_CONFIG,
  GameConfig,
  getPayoutTotal,
} from "@/lib/game-config";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, FlatList, ScrollView, View } from "react-native";
import { Button, Chip, List, Searchbar, Text } from "react-native-paper";
import "../global.css";

export default function CreateLeagueScreen() {
  const router = useRouter();
  const { query, results, isSearching, search, clearSearch } =
    useCourseSearch();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeebox, setSelectedTeebox] = useState<Teebox | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teeboxes = selectedCourse
    ? parseTeeboxes(selectedCourse.layout_data)
    : [];

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTeebox(null);
    clearSearch();
  };

  const handleChangeCourse = () => {
    setSelectedCourse(null);
    setSelectedTeebox(null);
    setStep(1);
  };

  const atLeastOneGameEnabled =
    gameConfig.proxLowNet.enabled || gameConfig.skins.enabled;

  const payoutValid =
    !gameConfig.proxLowNet.enabled ||
    getPayoutTotal(gameConfig.proxLowNet.payouts) === 100;

  const canSubmit = atLeastOneGameEnabled && payoutValid;

  const handleSubmit = async () => {
    if (!selectedCourse || !selectedTeebox || !canSubmit) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("leagues").insert({
      course_id: selectedCourse.id,
      teebox_data: selectedTeebox,
      game_config: gameConfig,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert("Error", "Failed to create league. Please try again.");
      return;
    }

    router.back();
  };

  // Step 1: Course search + teebox selection
  if (step === 1) {
    return (
      <View className="flex-1 px-4 pt-4 bg-white">
        {!selectedCourse ? (
          <>
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
              }}
              inputStyle={{ color: "#1a1a1a" }}
            />

            <FlatList
              data={results}
              keyExtractor={(item) => item.id.toString()}
              className="mt-2"
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
                query.length >= 2 && !isSearching ? (
                  <View className="items-center py-8">
                    <Text variant="bodyMedium">No courses found</Text>
                  </View>
                ) : null
              }
            />
          </>
        ) : (
          <>
            <View className="p-4 mb-4 border border-green-200 rounded-lg bg-green-50">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    variant="titleMedium"
                    style={{ color: "#14532d", fontWeight: "600" }}
                  >
                    {selectedCourse.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: "#15803d" }}>
                    {[
                      selectedCourse.street,
                      selectedCourse.state,
                      selectedCourse.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
                <Button mode="outlined" onPress={handleChangeCourse} compact>
                  Change
                </Button>
              </View>
            </View>

            <Text
              variant="titleSmall"
              style={{ marginBottom: 12, color: "#111827" }}
            >
              Select Teebox
            </Text>

            {teeboxes.length === 0 ? (
              <Text variant="bodyMedium">
                No teebox data available for this course.
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2 mb-6">
                {teeboxes.map((teebox) => (
                  <Chip
                    key={teebox.order}
                    mode="outlined"
                    selected={selectedTeebox?.order === teebox.order}
                    onPress={() => setSelectedTeebox(teebox)}
                    style={
                      selectedTeebox?.order === teebox.order
                        ? undefined
                        : { backgroundColor: "transparent" }
                    }
                  >
                    {teebox.name}
                  </Chip>
                ))}
              </View>
            )}

            <Button
              mode="outlined"
              onPress={() => setStep(2)}
              disabled={!selectedTeebox}
              style={{ marginTop: 16 }}
            >
              Next
            </Button>
          </>
        )}
      </View>
    );
  }

  // Step 2: Game configuration
  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
          <Text
            variant="bodyMedium"
            style={{ color: "#14532d", fontWeight: "600" }}
          >
            {selectedCourse?.name} — {selectedTeebox?.name} tees
          </Text>
        </View>

        <Text
          variant="titleSmall"
          style={{ marginBottom: 12, color: "#111827" }}
        >
          Game Configuration
        </Text>

        <GameConfigForm config={gameConfig} onConfigChange={setGameConfig} />

        <View className="flex-row gap-3 mt-2 mb-8">
          <View className="flex-1">
            <Button mode="outlined" onPress={() => setStep(1)}>
              Back
            </Button>
          </View>
          <View className="flex-1">
            <Button
              mode="outlined"
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              loading={isSubmitting}
            >
              Create League
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
