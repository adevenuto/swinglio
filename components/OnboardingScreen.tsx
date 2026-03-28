import GradientButton from "@/components/GradientButton";
import { Color, Font, Radius, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

type Props = {
  onComplete: () => Promise<void>;
};

export default function OnboardingScreen({ onComplete }: Props) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);

  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) setBirthday(date);
  };

  const handleContinue = async () => {
    if (!canContinue || !user) return;
    setSaving(true);
    try {
      const updates: Record<string, string> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: `${firstName.trim()} ${lastName.trim().charAt(0)}.`,
      };
      if (birthday) {
        updates.birthday = birthday.toISOString().split("T")[0];
      }
      if (gender) {
        updates.gender = gender;
      }
      await supabase.from("profiles").update(updates).eq("id", user.id);
      await onComplete();
    } finally {
      setSaving(false);
    }
  };

  const formatBirthday = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Swinglio</Text>
            <Text style={styles.subtitle}>
              Tell us a bit about yourself to get started.
            </Text>
          </View>

          <View style={styles.form}>
            {/* First Name */}
            <Text style={styles.label}>FIRST NAME</Text>
            <TextInput
              style={[styles.input, firstNameFocused && styles.inputFocused]}
              placeholder="First name"
              placeholderTextColor={Color.neutral400}
              value={firstName}
              onChangeText={setFirstName}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
              autoCapitalize="words"
              autoCorrect={false}
            />

            {/* Last Name */}
            <Text style={styles.label}>LAST NAME</Text>
            <TextInput
              style={[styles.input, lastNameFocused && styles.inputFocused]}
              placeholder="Last name"
              placeholderTextColor={Color.neutral400}
              value={lastName}
              onChangeText={setLastName}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => setLastNameFocused(false)}
              autoCapitalize="words"
              autoCorrect={false}
            />

            {/* Birthday */}
            <Text style={styles.label}>BIRTHDAY (OPTIONAL)</Text>
            <Pressable
              style={({ pressed }) => [
                styles.input,
                styles.dateField,
                pressed ? { opacity: 0.7 } : undefined,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[
                  styles.dateText,
                  !birthday && styles.placeholder,
                ]}
              >
                {birthday ? formatBirthday(birthday) : "Select birthday"}
              </Text>
            </Pressable>

            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={birthday ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
                {Platform.OS === "ios" && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.doneButton,
                      pressed ? { opacity: 0.7 } : undefined,
                    ]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.doneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Gender */}
            <Text style={styles.label}>GENDER (OPTIONAL)</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((option) => {
                const selected = gender === option;
                return (
                  <Pressable
                    key={option}
                    style={({ pressed }) => [
                      styles.genderPill,
                      selected && styles.genderPillSelected,
                      pressed ? { opacity: 0.7 } : undefined,
                    ]}
                    onPress={() => setGender(selected ? null : option)}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        selected && styles.genderTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Continue Button */}
          <GradientButton
            onPress={handleContinue}
            label="Continue"
            loading={saving}
            disabled={!canContinue || saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Color.neutral50,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Space.xl,
    paddingTop: Space.xxxl,
    paddingBottom: Space.xxl,
  },
  header: {
    marginBottom: Space.xxl,
  },
  title: {
    ...Type.h1,
    marginBottom: Space.sm,
  },
  subtitle: {
    ...Type.body,
    color: Color.neutral500,
  },
  form: {
    marginBottom: Space.xxl,
  },
  label: {
    ...Type.caption,
    color: Color.neutral400,
    marginBottom: Space.sm,
    marginTop: Space.lg,
  },
  input: {
    height: 52,
    backgroundColor: Color.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Color.neutral200,
    paddingHorizontal: Space.lg,
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral900,
  },
  inputFocused: {
    borderColor: Color.primary,
    borderWidth: 2,
  },
  dateField: {
    justifyContent: "center",
  },
  dateText: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral900,
  },
  placeholder: {
    color: Color.neutral400,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingVertical: Space.sm,
    paddingHorizontal: Space.lg,
    marginTop: Space.xs,
  },
  doneText: {
    ...Type.label,
    color: Color.primary,
    fontFamily: Font.semiBold,
  },
  genderRow: {
    flexDirection: "row",
    gap: Space.sm,
  },
  genderPill: {
    flex: 1,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Color.neutral200,
    backgroundColor: Color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  genderPillSelected: {
    backgroundColor: Color.primary,
    borderColor: Color.primary,
  },
  genderText: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.neutral700,
  },
  genderTextSelected: {
    color: Color.white,
  },
  continueBtn: {
    height: 52,
    backgroundColor: Color.primary,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
  },
  continueBtnDisabled: {
    opacity: 0.7,
  },
  continueText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.white,
  },
});
