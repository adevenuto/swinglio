import { parseTeeboxes, Teebox } from "@/hooks/use-course-search";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Text,
  TextInput,
} from "react-native-paper";
import "../global.css";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function parseTimeToDate(time: string | null): Date | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export default function EditLeagueInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [teeboxes, setTeeboxes] = useState<Teebox[]>([]);
  const [selectedTeebox, setSelectedTeebox] = useState<Teebox | null>(null);
  const [playDay, setPlayDay] = useState<string | null>(null);
  const [playTime, setPlayTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch league data
      const { data: league, error } = await supabase
        .from("leagues")
        .select("name, course_id, teebox_data, play_day, play_time")
        .eq("id", id)
        .single();

      if (error || !league) {
        Alert.alert("Error", "Failed to load league.");
        router.back();
        return;
      }

      // Verify coordinator access
      const { data: membership } = await supabase
        .from("league_users")
        .select("role")
        .eq("league_id", id)
        .eq("golfer_id", user?.id)
        .single();

      if (!membership || membership.role !== "coordinator") {
        Alert.alert(
          "Access Denied",
          "Only coordinators can edit league info.",
        );
        router.back();
        return;
      }

      // Fetch course layout_data for teebox options
      const { data: course } = await supabase
        .from("courses")
        .select("layout_data")
        .eq("id", league.course_id)
        .single();

      const parsed = parseTeeboxes(course?.layout_data ?? null);
      setTeeboxes(parsed);

      // Pre-fill state
      setName(league.name ?? "");
      setPlayDay(league.play_day);
      setPlayTime(parseTimeToDate(league.play_time));

      // Match current teebox by name
      const currentTeebox = league.teebox_data as Teebox;
      const match = parsed.find((t) => t.name === currentTeebox?.name);
      setSelectedTeebox(match ?? currentTeebox);

      setIsLoading(false);
    }
    load();
  }, [id, user?.id]);

  const handleSave = async () => {
    if (!selectedTeebox) {
      Alert.alert("Required", "Please select a teebox.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("leagues")
      .update({
        name: name.trim() || null,
        teebox_data: selectedTeebox,
        play_day: playDay,
        play_time: playTime
          ? playTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : null,
      })
      .eq("id", id);
    setIsSaving(false);

    if (error) {
      Alert.alert("Error", "Failed to save changes.");
      return;
    }

    router.back();
  };

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* League Name */}
        <Text
          variant="titleSmall"
          style={{ marginBottom: 12, color: "#111827" }}
        >
          League Name
          <Text variant="bodySmall" style={{ color: "#999" }}>
            {" "}
            (optional)
          </Text>
        </Text>
        <TextInput
          mode="outlined"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Saturday Morning League"
          style={{ marginBottom: 16 }}
        />

        {/* Teebox */}
        <Text
          variant="titleSmall"
          style={{ marginBottom: 12, color: "#111827" }}
        >
          Teebox
        </Text>
        {teeboxes.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: "#999", marginBottom: 16 }}>
            No teebox data available.
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

        {/* Play Day */}
        <Text
          variant="titleSmall"
          style={{ marginBottom: 12, color: "#111827" }}
        >
          Play Day
          <Text variant="bodySmall" style={{ color: "#999" }}>
            {" "}
            (optional)
          </Text>
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {DAYS.map((day) => (
            <Chip
              key={day}
              mode="outlined"
              selected={playDay === day}
              onPress={() => setPlayDay(playDay === day ? null : day)}
              style={
                playDay === day ? undefined : { backgroundColor: "transparent" }
              }
            >
              {day.charAt(0).toUpperCase() + day.slice(1, 3)}
            </Chip>
          ))}
        </View>

        {/* Tee Time */}
        <Text
          variant="titleSmall"
          style={{ marginBottom: 12, color: "#111827" }}
        >
          Tee Time
          <Text variant="bodySmall" style={{ color: "#999" }}>
            {" "}
            (optional)
          </Text>
        </Text>
        <View className="flex-row items-center gap-3 mb-4">
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
            <Pressable
              onPress={() => {
                setPlayTime(null);
                setShowTimePicker(false);
              }}
            >
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
      </ScrollView>

      {/* Sticky Footer */}
      <View
        className="flex-row gap-3 px-4 pt-4 pb-12"
        style={{ borderTopWidth: 1, borderTopColor: "#e5e5e5" }}
      >
        <View className="flex-1">
          <Button mode="outlined" onPress={() => router.back()}>
            Cancel
          </Button>
        </View>
        <View className="flex-1">
          <Button mode="outlined" onPress={handleSave} loading={isSaving}>
            Save
          </Button>
        </View>
      </View>
    </View>
  );
}
