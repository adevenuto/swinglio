import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import { parseTeeboxes, Teebox } from "@/hooks/use-course-search";
import { CityResult, useCourses } from "@/hooks/use-courses";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Searchbar,
  Text,
  TextInput,
} from "react-native-paper";

type HoleData = { par: string; length: string; handicap?: number };

const TEEBOX_COLORS = [
  "#000000", // Black
  "#1565C0", // Blue
  "#FFFFFF", // White
  "#C62828", // Red
  "#F9A825", // Gold
  "#2E7D32", // Green
  "#6A1B9A", // Purple
  "#FF8F00", // Orange
  "#795548", // Brown
  "#FFEB3B", // Yellow
  "#9E9E9E", // Silver
  "#D2B48C", // Tan
  "#00897B", // Teal
];

export default function CourseEditorScreen() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const isEdit = !!courseId;
  const router = useRouter();
  const navigation = useNavigation();
  const {
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    checkCourseInUse,
    searchCities,
  } = useCourses();

  // Course details
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  // City/State
  const [cityId, setCityId] = useState<number | null>(null);
  const [stateId, setStateId] = useState<number | null>(null);
  const [cityName, setCityName] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [showCityResults, setShowCityResults] = useState(false);
  const cityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Layout data
  const [teeboxes, setTeeboxes] = useState<Teebox[]>([]);
  const [selectedTeeboxIndex, setSelectedTeeboxIndex] = useState(0);
  const [holeCount, setHoleCount] = useState(18);

  // UI state
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Edit Course" : "New Course",
    });
  }, [isEdit, navigation]);

  // Load course data in edit mode
  useEffect(() => {
    if (!courseId) return;
    setIsLoadingCourse(true);
    fetchCourse(Number(courseId)).then(({ data, error }) => {
      if (error || !data) {
        Alert.alert("Error", error ?? "Course not found");
        router.back();
        return;
      }
      setName(data.name);
      setStreet(data.street ?? "");
      setPostalCode(data.postal_code ?? "");
      setPhone(data.phone ?? "");
      setWebsite(data.website ?? "");
      setLat(data.lat != null ? String(data.lat) : "");
      setLng(data.lng != null ? String(data.lng) : "");
      setCityId(data.city_id);
      setStateId(data.state_id);
      setCityName(data.city_name ?? "");
      setStateAbbr(data.state_abbr ?? "");
      setCityQuery(data.city_name ?? "");

      const parsed = parseTeeboxes(data.layout_data);
      if (parsed.length > 0) {
        setTeeboxes(parsed);
        // Detect hole count from first teebox
        const firstHoles = Object.keys(parsed[0].holes || {}).length;
        setHoleCount(firstHoles === 9 ? 9 : 18);
      } else {
        setTeeboxes([makeEmptyTeebox(0, 18)]);
      }
      setIsLoadingCourse(false);
    });
  }, [courseId]);

  // City search
  const handleCitySearch = useCallback(
    (text: string) => {
      setCityQuery(text);
      if (cityDebounce.current) clearTimeout(cityDebounce.current);
      if (text.trim().length < 2) {
        setCityResults([]);
        setShowCityResults(false);
        return;
      }
      setShowCityResults(true);
      cityDebounce.current = setTimeout(async () => {
        const results = await searchCities(text);
        setCityResults(results);
      }, 300);
    },
    [searchCities],
  );

  const selectCity = (city: CityResult) => {
    setCityId(city.id);
    setStateId(city.state_id);
    setCityName(city.name);
    setStateAbbr(city.state_abbr);
    setCityQuery(city.name);
    setCityResults([]);
    setShowCityResults(false);
  };

  // Teebox helpers
  const selectedTeebox = teeboxes[selectedTeeboxIndex];

  const updateTeebox = (
    index: number,
    updates: Partial<Teebox>,
  ) => {
    setTeeboxes((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...updates } : t)),
    );
  };

  const updateHole = (
    teeboxIdx: number,
    holeKey: string,
    field: "par" | "length" | "handicap",
    value: string,
  ) => {
    setTeeboxes((prev) =>
      prev.map((t, i) => {
        if (i !== teeboxIdx) return t;
        const current = t.holes[holeKey] ?? { par: "4", length: "" };
        return {
          ...t,
          holes: {
            ...t.holes,
            [holeKey]: {
              ...current,
              ...(field === "handicap"
                ? { handicap: value ? parseInt(value, 10) || undefined : undefined }
                : { [field]: value }),
            },
          },
        };
      }),
    );
  };

  const addTeebox = () => {
    const firstTeebox = teeboxes[0];
    const newHoles: Record<string, HoleData> = {};
    for (let h = 1; h <= holeCount; h++) {
      const key = `hole-${h}`;
      newHoles[key] = {
        par: firstTeebox?.holes[key]?.par ?? "4",
        length: "",
      };
    }
    const newTeebox: Teebox = {
      order: teeboxes.length,
      name: "",
      holes: newHoles,
    };
    setTeeboxes((prev) => [...prev, newTeebox]);
    setSelectedTeeboxIndex(teeboxes.length);
  };

  const removeTeebox = (index: number) => {
    if (teeboxes.length <= 1) {
      Alert.alert("Cannot Remove", "At least one teebox is required.");
      return;
    }
    Alert.alert(
      "Remove Teebox",
      `Remove "${teeboxes[index].name || "Untitled"}" teebox?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setTeeboxes((prev) => {
              const updated = prev
                .filter((_, i) => i !== index)
                .map((t, i) => ({ ...t, order: i }));
              return updated;
            });
            setSelectedTeeboxIndex((prev) =>
              prev >= teeboxes.length - 1 ? Math.max(0, prev - 1) : prev,
            );
          },
        },
      ],
    );
  };

  const changeHoleCount = (count: 9 | 18) => {
    if (count === holeCount) return;
    setHoleCount(count);
    setTeeboxes((prev) =>
      prev.map((t) => {
        const newHoles: Record<string, HoleData> = {};
        for (let h = 1; h <= count; h++) {
          const key = `hole-${h}`;
          newHoles[key] = t.holes[key] ?? { par: "4", length: "" };
        }
        return { ...t, holes: newHoles };
      }),
    );
  };

  // Save
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Course name is required.");
      return;
    }
    if (!cityId || !stateId) {
      Alert.alert("Validation", "Please select a city.");
      return;
    }

    setIsSaving(true);

    const layoutData = JSON.stringify({
      teeboxes: teeboxes.map((t, i) => ({ ...t, order: i })),
      hole_count: holeCount,
    });

    const form = {
      name: name.trim(),
      street: street.trim() || null,
      postal_code: postalCode.trim() || null,
      city_id: cityId,
      state_id: stateId,
      phone: phone.trim() || null,
      website: website.trim() || null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      layout_data: layoutData,
    };

    if (isEdit) {
      const { error } = await updateCourse(Number(courseId), form);
      setIsSaving(false);
      if (error) {
        Alert.alert("Error", error);
        return;
      }
      Alert.alert("Saved", "Course updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      const { data, error } = await createCourse(form);
      setIsSaving(false);
      if (error) {
        Alert.alert("Error", error);
        return;
      }
      Alert.alert("Created", `Course "${data.name}" created.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!courseId) return;
    const { count } = await checkCourseInUse(Number(courseId));
    const msg =
      count > 0
        ? `This course has ${count} round${count > 1 ? "s" : ""} associated with it. Deleting it may affect existing data. Continue?`
        : "Are you sure you want to delete this course?";

    Alert.alert("Delete Course", msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await deleteCourse(Number(courseId));
          if (error) {
            Alert.alert("Error", error);
            return;
          }
          router.back();
        },
      },
    ]);
  };

  if (isLoadingCourse) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Space.lg, paddingBottom: 60 }}
      >
        {/* Section 1: Course Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Course Details
          </Text>

          <TextInput
            label="Name *"
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={{ marginBottom: Space.md }}
          />
          <TextInput
            label="Street"
            mode="outlined"
            value={street}
            onChangeText={setStreet}
            multiline
            style={{ marginBottom: Space.md }}
          />

          {/* City search */}
          <Searchbar
            placeholder="Search city..."
            value={cityQuery}
            onChangeText={handleCitySearch}
            mode="bar"
            style={[
              styles.citySearchbar,
              {
                marginBottom: showCityResults && cityResults.length > 0 ? 0 : Space.md,
              },
            ]}
            inputStyle={{ color: Color.neutral900, fontSize: 14 }}
          />
          {showCityResults && cityResults.length > 0 && (
            <ScrollView
              nestedScrollEnabled
              style={styles.cityDropdown}
            >
              {cityResults.map((city) => (
                <View
                  key={city.id}
                  style={{
                    paddingVertical: Space.sm,
                    paddingHorizontal: Space.md,
                    borderBottomWidth: 1,
                    borderBottomColor: Color.neutral100,
                  }}
                >
                  <Text
                    onPress={() => selectCity(city)}
                    style={{ color: Color.neutral900 }}
                  >
                    {city.name}, {city.state_abbr}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <TextInput
            label="State"
            mode="outlined"
            value={stateAbbr}
            editable={false}
            style={{ marginBottom: Space.md, backgroundColor: Color.neutral50 }}
          />

          <TextInput
            label="Postal Code"
            mode="outlined"
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="number-pad"
            style={{ marginBottom: Space.md }}
          />

          <View style={{ flexDirection: "row", gap: Space.md, marginBottom: Space.md }}>
            <TextInput
              label="Phone"
              mode="outlined"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={{ flex: 1 }}
            />
            <TextInput
              label="Website"
              mode="outlined"
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
              style={{ flex: 1 }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: Space.md }}>
            <TextInput
              label="Latitude"
              mode="outlined"
              value={lat}
              onChangeText={setLat}
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
            <TextInput
              label="Longitude"
              mode="outlined"
              value={lng}
              onChangeText={setLng}
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Section 2: Layout Data - Teeboxes + Holes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Teeboxes & Holes
          </Text>

          {/* Teebox tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: Space.lg }}
          >
            <View style={{ flexDirection: "row", gap: Space.sm }}>
              {teeboxes.map((t, i) => (
                <Chip
                  key={i}
                  mode="outlined"
                  selected={i === selectedTeeboxIndex}
                  onPress={() => setSelectedTeeboxIndex(i)}
                  style={
                    t.color
                      ? {
                          borderColor:
                            i === selectedTeeboxIndex ? t.color : Color.neutral300,
                        }
                      : undefined
                  }
                >
                  {t.name || `Tee ${i + 1}`}
                </Chip>
              ))}
              <Chip mode="outlined" onPress={addTeebox} icon="plus">
                Add
              </Chip>
            </View>
          </ScrollView>

          {/* Active teebox properties */}
          {selectedTeebox && (
            <>
              <View
                style={{ flexDirection: "row", gap: Space.md, marginBottom: Space.md }}
              >
                <TextInput
                  label="Tee Name"
                  mode="outlined"
                  value={selectedTeebox.name}
                  onChangeText={(v) =>
                    updateTeebox(selectedTeeboxIndex, { name: v })
                  }
                  style={{ flex: 1 }}
                  dense
                />
                <View style={{ flex: 1 }}>
                  <TextInput
                    label="Color (hex)"
                    mode="outlined"
                    value={selectedTeebox.color ?? ""}
                    onChangeText={(v) =>
                      updateTeebox(selectedTeeboxIndex, { color: v })
                    }
                    dense
                  />
                  {selectedTeebox.color && (
                    <View
                      style={{
                        position: "absolute",
                        right: Space.md,
                        top: 14,
                        width: 20,
                        height: 20,
                        borderRadius: Radius.sm,
                        backgroundColor: selectedTeebox.color,
                        borderWidth: 1,
                        borderColor: Color.neutral300,
                      }}
                    />
                  )}
                </View>
              </View>

              {/* Color swatches */}
              <View
                style={{
                  flexDirection: "row",
                  gap: Space.sm,
                  flexWrap: "wrap",
                  marginBottom: Space.md,
                }}
              >
                {TEEBOX_COLORS.map((color) => {
                  const isSelected =
                    selectedTeebox.color?.toLowerCase() === color.toLowerCase();
                  return (
                    <Pressable
                      key={color}
                      onPress={() =>
                        updateTeebox(selectedTeeboxIndex, { color })
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: color,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? Color.neutral900 : Color.neutral300,
                      }}
                    />
                  );
                })}
              </View>

              {/* Secondary color (optional) */}
              {selectedTeebox.color && (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: Space.sm,
                      marginBottom: Space.sm,
                    }}
                  >
                    <Text variant="labelMedium" style={{ color: Color.neutral500 }}>
                      Secondary Color
                    </Text>
                    {selectedTeebox.secondaryColor && (
                      <Pressable
                        onPress={() =>
                          updateTeebox(selectedTeeboxIndex, {
                            secondaryColor: undefined,
                          })
                        }
                      >
                        <Text
                          variant="labelSmall"
                          style={{ color: Color.danger }}
                        >
                          Clear
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: Space.sm,
                      flexWrap: "wrap",
                      marginBottom: Space.md,
                    }}
                  >
                    {TEEBOX_COLORS.map((color) => {
                      const isSelected =
                        selectedTeebox.secondaryColor?.toLowerCase() ===
                        color.toLowerCase();
                      return (
                        <Pressable
                          key={`sec-${color}`}
                          onPress={() =>
                            updateTeebox(selectedTeeboxIndex, {
                              secondaryColor: color,
                            })
                          }
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: color,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? Color.neutral900 : Color.neutral300,
                          }}
                        />
                      );
                    })}
                  </View>
                </>
              )}

              <View
                style={{ flexDirection: "row", gap: Space.md, marginBottom: Space.md }}
              >
                <TextInput
                  label="Slope"
                  mode="outlined"
                  value={
                    selectedTeebox.slope != null
                      ? String(selectedTeebox.slope)
                      : ""
                  }
                  onChangeText={(v) =>
                    updateTeebox(selectedTeeboxIndex, {
                      slope: v ? parseFloat(v) : undefined,
                    })
                  }
                  keyboardType="decimal-pad"
                  style={{ flex: 1 }}
                  dense
                />
                <TextInput
                  label="Course Rating"
                  mode="outlined"
                  value={
                    selectedTeebox.courseRating != null
                      ? String(selectedTeebox.courseRating)
                      : ""
                  }
                  onChangeText={(v) =>
                    updateTeebox(selectedTeeboxIndex, {
                      courseRating: v ? parseFloat(v) : undefined,
                    })
                  }
                  keyboardType="decimal-pad"
                  style={{ flex: 1 }}
                  dense
                />
              </View>

              {/* Hole count toggle */}
              <View
                style={{
                  flexDirection: "row",
                  gap: Space.sm,
                  marginBottom: Space.lg,
                  alignItems: "center",
                }}
              >
                <Text variant="bodyMedium" style={{ color: Color.neutral500 }}>
                  Holes:
                </Text>
                <Chip
                  mode="outlined"
                  selected={holeCount === 9}
                  onPress={() => changeHoleCount(9)}
                >
                  9 Holes
                </Chip>
                <Chip
                  mode="outlined"
                  selected={holeCount === 18}
                  onPress={() => changeHoleCount(18)}
                >
                  18 Holes
                </Chip>
              </View>

              {/* Holes grid header */}
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: Space.xs,
                  marginBottom: Space.sm,
                }}
              >
                <Text
                  variant="labelSmall"
                  style={{ width: 40, color: Color.neutral500, fontWeight: "600" }}
                >
                  Hole
                </Text>
                <Text
                  variant="labelSmall"
                  style={{ flex: 1, color: Color.neutral500, fontWeight: "600" }}
                >
                  Par
                </Text>
                <Text
                  variant="labelSmall"
                  style={{ flex: 1, color: Color.neutral500, fontWeight: "600" }}
                >
                  Yardage
                </Text>
                <Text
                  variant="labelSmall"
                  style={{ flex: 1, color: Color.neutral500, fontWeight: "600" }}
                >
                  Hdcp
                </Text>
              </View>

              {/* Holes grid rows */}
              {Array.from({ length: holeCount }, (_, i) => {
                const holeKey = `hole-${i + 1}`;
                const hole = selectedTeebox.holes[holeKey] ?? {
                  par: "4",
                  length: "",
                };
                return (
                  <View
                    key={holeKey}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: Space.xs,
                      marginBottom: Space.md,
                    }}
                  >
                    <Text
                      variant="bodyMedium"
                      style={{
                        width: 40,
                        color: Color.neutral900,
                        fontWeight: "600",
                      }}
                    >
                      {i + 1}
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={hole.par}
                      onChangeText={(v) =>
                        updateHole(selectedTeeboxIndex, holeKey, "par", v)
                      }
                      keyboardType="number-pad"
                      style={{ flex: 1, marginRight: Space.md }}
                      dense
                    />
                    <TextInput
                      mode="outlined"
                      value={hole.length}
                      onChangeText={(v) =>
                        updateHole(selectedTeeboxIndex, holeKey, "length", v)
                      }
                      keyboardType="number-pad"
                      style={{ flex: 1, marginRight: Space.md }}
                      dense
                    />
                    <TextInput
                      mode="outlined"
                      value={hole.handicap != null ? String(hole.handicap) : ""}
                      onChangeText={(v) =>
                        updateHole(selectedTeeboxIndex, holeKey, "handicap", v)
                      }
                      keyboardType="number-pad"
                      style={{ flex: 1 }}
                      dense
                    />
                  </View>
                );
              })}

              {/* Remove teebox button */}
              {teeboxes.length > 1 && (
                <Button
                  mode="text"
                  textColor={Color.danger}
                  onPress={() => removeTeebox(selectedTeeboxIndex)}
                  style={{ marginTop: Space.md, alignSelf: "flex-start" }}
                >
                  Remove Teebox
                </Button>
              )}
            </>
          )}
        </View>

        {/* Section 3: Actions */}
        <Button
          mode="contained"
          buttonColor={Color.primary}
          textColor={Color.white}
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          style={{ marginBottom: Space.md, borderRadius: Radius.lg }}
        >
          {isEdit ? "Save Course" : "Create Course"}
        </Button>

        {isEdit && (
          <Button
            mode="text"
            textColor={Color.danger}
            onPress={handleDelete}
            style={{ marginBottom: Space.xl }}
          >
            Delete Course
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.lg,
    textTransform: "uppercase",
  },
  section: {
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.md,
    padding: Space.lg,
    marginBottom: Space.lg,
    backgroundColor: Color.white,
    ...Shadow.sm,
  },
  citySearchbar: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.full,
    height: 48,
  },
  cityDropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Color.neutral300,
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
    marginBottom: Space.md,
    maxHeight: 160,
  },
});

function makeEmptyTeebox(order: number, holeCount: number): Teebox {
  const holes: Record<string, HoleData> = {};
  for (let h = 1; h <= holeCount; h++) {
    holes[`hole-${h}`] = { par: "4", length: "" };
  }
  return { order, name: "", holes };
}
