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
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Alert, FlatList, Platform, Pressable, ScrollView, View } from "react-native";
import { Button, Chip, List, Searchbar, Text } from "react-native-paper";
import "../global.css";

export default function CreateLeagueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { query, results, isSearching, search, clearSearch } =
    useCourseSearch();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeebox, setSelectedTeebox] = useState<Teebox | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playDay, setPlayDay] = useState<string | null>(null);
  const [playTime, setPlayTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

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
    const { data: newLeague, error } = await supabase
      .from("leagues")
      .insert({
        owner_id: user?.id,
        course_id: selectedCourse.id,
        teebox_data: selectedTeebox,
        game_config: gameConfig,
        play_day: playDay,
        play_time: playTime
          ? playTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
          : null,
      })
      .select()
      .single();
    setIsSubmitting(false);

    if (error || !newLeague) {
      Alert.alert("Error", "Failed to create league. Please try again.");
      return;
    }

    // Auto-add owner as league coordinator
    await supabase.from("league_users").insert({
      league_id: newLeague.id,
      golfer_id: user?.id,
      role: "coordinator",
    });

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
          <ScrollView keyboardShouldPersistTaps="handled">
            <View
              style={{
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#d4d4d4",
                borderRadius: 8,
                backgroundColor: "#fff",
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    variant="titleMedium"
                    style={{ color: "#1a1a1a", fontWeight: "600" }}
                  >
                    {selectedCourse.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: "#555" }}>
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

            {/* Play Day (optional) */}
            <Text
              variant="titleSmall"
              style={{ marginTop: 16, marginBottom: 12, color: "#111827" }}
            >
              Play Day
              <Text variant="bodySmall" style={{ color: "#999" }}>
                {" "}(optional)
              </Text>
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
                (day) => (
                  <Chip
                    key={day}
                    mode="outlined"
                    selected={playDay === day}
                    onPress={() => setPlayDay(playDay === day ? null : day)}
                    style={
                      playDay === day
                        ? undefined
                        : { backgroundColor: "transparent" }
                    }
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </Chip>
                ),
              )}
            </View>

            {/* Tee Time (optional) */}
            <Text
              variant="titleSmall"
              style={{ marginTop: 12, marginBottom: 12, color: "#111827" }}
            >
              Tee Time
              <Text variant="bodySmall" style={{ color: "#999" }}>
                {" "}(optional)
              </Text>
            </Text>
            <View className="flex-row items-center gap-3 mb-2">
              <Pressable
                onPress={() => {
                  if (!playTime) setPlayTime(new Date());
                  setShowTimePicker(true);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: "#d4d4d4",
                  borderRadius: 8,
                  backgroundColor: "#fff",
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={{ color: playTime ? "#1a1a1a" : "#999" }}
                >
                  {playTime
                    ? playTime.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Select time"}
                </Text>
              </Pressable>
              {playTime && (
                <Pressable onPress={() => { setPlayTime(null); setShowTimePicker(false); }}>
                  <Text variant="bodySmall" style={{ color: "#dc2626" }}>
                    Clear
                  </Text>
                </Pressable>
              )}
            </View>
            {showTimePicker && (
              <DateTimePicker
                value={playTime || new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS === "android") setShowTimePicker(false);
                  if (date) setPlayTime(date);
                }}
              />
            )}

            <Button
              mode="outlined"
              onPress={() => setStep(2)}
              disabled={!selectedTeebox}
              style={{ marginTop: 16, marginBottom: 32 }}
            >
              Next
            </Button>
          </ScrollView>
        )}
      </View>
    );
  }

  // Step 2: Game configuration
  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4 pt-4">
        <View
          style={{
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#d4d4d4",
            borderRadius: 8,
            backgroundColor: "#fff",
          }}
        >
          <Text
            variant="bodyMedium"
            style={{ color: "#1a1a1a", fontWeight: "600" }}
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
