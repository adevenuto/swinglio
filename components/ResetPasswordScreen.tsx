import GradientButton from "@/components/GradientButton";
import { Color, Font, Radius, Space, Type } from "@/constants/design-tokens";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const canSubmit =
    password.length >= 6 && confirmPassword.length > 0;

  const handleReset = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      // Fire-and-forget: onAuthStateChange USER_UPDATED clears recovery mode
      supabase.auth.updateUser({ password }).then(({ error }) => {
        if (error) {
          Alert.alert("Error", error.message);
          setSaving(false);
        }
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to reset password");
      setSaving(false);
    }
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
            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.subtitle}>
              Enter a new password for your account.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "password" && styles.inputFocused,
              ]}
              placeholder="Enter new password"
              placeholderTextColor={Color.neutral400}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "confirm" && styles.inputFocused,
              ]}
              placeholder="Confirm new password"
              placeholderTextColor={Color.neutral400}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedField("confirm")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <GradientButton
            onPress={handleReset}
            label="Reset Password"
            loading={saving}
            disabled={!canSubmit || saving}
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
  resetBtn: {
    height: 52,
    backgroundColor: Color.primary,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
  },
  resetBtnDisabled: {
    opacity: 0.7,
  },
  resetText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.white,
  },
});
