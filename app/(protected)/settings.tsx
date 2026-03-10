import { Color, Font, Radius, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import {
  DistanceUnit,
  usePreferences,
} from "@/contexts/preferences-context";
import { supabase } from "@/lib/supabase";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Snackbar, Text } from "react-native-paper";

const UNIT_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: "yards", label: "Yards" },
  { value: "meters", label: "Meters" },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { distanceUnit, setDistanceUnit } = usePreferences();

  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });

  // Change password state
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Detect Google OAuth user (no password to change)
  const isOAuthUser =
    user?.app_metadata?.provider === "google" ||
    user?.app_metadata?.providers?.includes("google");

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  // --- Handlers ---

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      setSnackbar({ visible: true, message: "Please enter a new password" });
      return;
    }
    if (newPassword.length < 6) {
      setSnackbar({
        visible: true,
        message: "Password must be at least 6 characters",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSnackbar({ visible: true, message: "Passwords do not match" });
      return;
    }

    setPasswordLoading(true);

    // Verify current password as safety check
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });

    if (signInError) {
      setPasswordLoading(false);
      setSnackbar({ visible: true, message: "Current password is incorrect" });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      setSnackbar({
        visible: true,
        message: error.message || "Failed to update password",
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordExpanded(false);
    setSnackbar({ visible: true, message: "Password updated" });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account, rounds, and scores. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "All your data will be permanently removed.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    const { error } = await supabase.rpc(
                      "delete_user_account",
                    );
                    if (error) {
                      Alert.alert(
                        "Error",
                        error.message || "Failed to delete account",
                      );
                      return;
                    }
                    await signOut();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Nav */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={Color.neutral900}
            />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.container}>
          <View style={styles.inner}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your preferences</Text>

            {/* ── PREFERENCES ── */}
            <Text style={styles.sectionLabel}>PREFERENCES</Text>
            <View style={styles.card}>
              {/* Distance Unit */}
              <Text style={styles.fieldLabel}>Distance Unit</Text>
              <View style={styles.segmentedRow}>
                {UNIT_OPTIONS.map((opt) => {
                  const selected = distanceUnit === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setDistanceUnit(opt.value)}
                      style={[
                        styles.segmentBtn,
                        selected && styles.segmentBtnSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          selected && styles.segmentTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── ACCOUNT ── */}
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.card}>
              {/* Change Password */}
              {!isOAuthUser && (
                <>
                  <Pressable
                    onPress={() => setPasswordExpanded((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.rowText}>Change Password</Text>
                    <Feather
                      name={passwordExpanded ? "chevron-up" : "chevron-right"}
                      size={20}
                      color={Color.neutral400}
                    />
                  </Pressable>

                  {passwordExpanded && (
                    <View style={styles.passwordSection}>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="Current password"
                        placeholderTextColor={Color.neutral400}
                        secureTextEntry
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="New password"
                        placeholderTextColor={Color.neutral400}
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="Confirm new password"
                        placeholderTextColor={Color.neutral400}
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        autoCapitalize="none"
                      />
                      <Pressable
                        onPress={handleChangePassword}
                        disabled={passwordLoading}
                        style={({ pressed }) => [
                          styles.saveBtn,
                          pressed && { opacity: 0.7 },
                          passwordLoading && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={styles.saveBtnText}>
                          {passwordLoading ? "Saving..." : "Save"}
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  <View style={styles.rowDivider} />
                </>
              )}

              {/* Delete Account */}
              <Pressable
                onPress={handleDeleteAccount}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.rowText, { color: Color.danger }]}>
                  Delete Account
                </Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={Color.neutral400}
                />
              </Pressable>
            </View>

            {/* ── ABOUT ── */}
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <View style={styles.card}>
              {/* App Version */}
              <View style={styles.row}>
                <Text style={styles.rowText}>App Version</Text>
                <Text style={styles.rowValue}>{appVersion}</Text>
              </View>

              <View style={styles.rowDivider} />

              {/* Privacy Policy */}
              <Pressable
                onPress={() =>
                  Linking.openURL("https://swinglio.com/privacy")
                }
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.rowText}>Privacy Policy</Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={Color.neutral400}
                />
              </Pressable>

              <View style={styles.rowDivider} />

              {/* Terms of Service */}
              <Pressable
                onPress={() => Linking.openURL("https://swinglio.com/terms")}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.rowText}>Terms of Service</Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={Color.neutral400}
                />
              </Pressable>

              <View style={styles.rowDivider} />

              {/* Support */}
              <Pressable
                onPress={() =>
                  Linking.openURL("mailto:support@swinglio.com")
                }
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.rowText}>Support</Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={Color.neutral400}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
        duration={2000}
      >
        {snackbar.message}
      </Snackbar>
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
  container: {
    alignItems: "center",
    paddingHorizontal: Space.lg,
  },
  inner: {
    width: "100%",
    maxWidth: 448,
    paddingBottom: Space.xxxl,
  },
  title: {
    ...Type.h1,
    textAlign: "center",
    marginBottom: Space.xs,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral500,
    textAlign: "center",
    marginBottom: Space.xxl,
  },

  // Section label
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },

  // Card
  card: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    marginBottom: Space.xl,
  },

  // Fields
  fieldLabel: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.neutral700,
    marginBottom: Space.sm,
  },
  fieldHint: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Color.neutral400,
    marginBottom: Space.md,
  },

  // Segmented control
  segmentedRow: {
    flexDirection: "row",
    gap: Space.sm,
    marginBottom: Space.md,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Color.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnSelected: {
    backgroundColor: Color.primary,
  },
  segmentText: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.neutral700,
  },
  segmentTextSelected: {
    color: Color.white,
  },

  // List rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Space.md,
  },
  rowText: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral900,
  },
  rowValue: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral500,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Color.neutral200,
  },

  // Password section
  passwordSection: {
    paddingBottom: Space.md,
    gap: Space.md,
  },
  fieldInput: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral900,
    height: 48,
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg,
    backgroundColor: Color.white,
  },
  saveBtn: {
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Color.white,
  },
});
