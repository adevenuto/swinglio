import UserAvatar from "@/components/UserAvatar";
import {
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
} from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription, SubscriptionTier } from "@/contexts/subscription-context";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { useHandicap } from "@/hooks/use-handicap";
import { useRoundStats } from "@/hooks/use-round-stats";
import { formatHandicapIndex } from "@/lib/handicap";
import { supabase } from "@/lib/supabase";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import Toast from "react-native-toast-message";

export default function Profile() {
  const { user, signOut, refreshUser, refreshProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const { tier, isPro, presentPaywall, devOverrideTier, setDevOverrideTier } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Focus tracking for input styling
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const savedValues = useRef({ displayName: "", firstName: "", lastName: "" });

  const {
    percentage: attPct,
    refresh: refreshAttestation,
  } = useAttestationStats(user?.id ?? "");

  const { totalRounds, refresh: refreshRoundStats } = useRoundStats(
    user?.id ?? "",
  );

  const { result: handicapResult, refresh: refreshHandicap } = useHandicap(
    user?.id ?? "",
  );

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from("profiles")
      .select("display_name, first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name ?? "");
      setFirstName(data.first_name ?? "");
      setLastName(data.last_name ?? "");
      setAvatarUrl(data.avatar_url);
      savedValues.current = {
        displayName: data.display_name ?? "",
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
      };
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
    refreshAttestation();
    refreshRoundStats();
    refreshHandicap();
  }, [fetchProfile, refreshAttestation, refreshRoundStats, refreshHandicap]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshUser(),
      fetchProfile(),
      refreshAttestation(),
      refreshRoundStats(),
      refreshHandicap(),
    ]);
    setRefreshing(false);
  }, [refreshUser, fetchProfile, refreshAttestation, refreshRoundStats, refreshHandicap]);

  const handleFieldBlur = useCallback(
    async (field: string) => {
      setFocusedField(null);
      if (!user?.id) return;

      const current = {
        displayName: displayName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      if (
        current.displayName === savedValues.current.displayName &&
        current.firstName === savedValues.current.firstName &&
        current.lastName === savedValues.current.lastName
      )
        return;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: current.displayName || null,
          first_name: current.firstName || null,
          last_name: current.lastName || null,
        })
        .eq("id", user.id);

      if (error) {
        Toast.show({ type: "error", text1: "Failed to save" });
        return;
      }

      savedValues.current = current;
      Toast.show({ type: "success", text1: "Profile updated" });
    },
    [user?.id, displayName, firstName, lastName],
  );

  const pickImage = async (source: "camera" | "gallery") => {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to take photos.",
        );
        return;
      }
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is needed.",
        );
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadAvatar(result.assets[0].uri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;

    const fileName = `${user.id}.jpg`;

    const formData = new FormData();
    formData.append("", {
      uri,
      name: fileName,
      type: "image/jpeg",
    } as any);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, formData, {
        upsert: true,
        contentType: "multipart/form-data",
      });

    if (uploadError) {
      Alert.alert("Error", `Failed to upload photo: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      Alert.alert("Error", "Photo uploaded but failed to save URL.");
      return;
    }

    setAvatarUrl(publicUrl);
    await refreshProfile();
    Toast.show({ type: "success", text1: "Photo updated" });
  };

  const removeAvatar = async () => {
    if (!user?.id) return;

    const fileName = `${user.id}.jpg`;
    await supabase.storage.from("avatars").remove([fileName]);
    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    setAvatarUrl(null);
    await refreshProfile();
    Toast.show({ type: "success", text1: "Photo removed" });
  };

  const handleAvatarPress = () => {
    const options: any[] = [
      { text: "Take Photo", onPress: () => pickImage("camera") },
      { text: "Choose from Gallery", onPress: () => pickImage("gallery") },
    ];

    if (avatarUrl) {
      options.push({
        text: "Remove Photo",
        style: "destructive",
        onPress: removeAvatar,
      });
    }

    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Profile Photo", undefined, options);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const profileName = displayName || firstName || "Golfer";
  const handicapDisplay =
    handicapResult?.handicapIndex != null
      ? formatHandicapIndex(handicapResult.handicapIndex)
      : "\u2014";

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Color.white}
            colors={[Color.white]}
          />
        }
      >
        {/* Hero header */}
        <LinearGradient
          colors={Color.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
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
                color={Color.white}
              />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.avatarSection}>
            <Pressable
              onPress={handleAvatarPress}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              <View style={styles.avatarRing}>
                <UserAvatar
                  avatarUrl={avatarUrl}
                  firstName={firstName}
                  lastName={lastName}
                  size={110}
                />
              </View>
              <View style={styles.cameraIcon}>
                <Feather name="camera" size={14} color={Color.neutral700} />
              </View>
            </Pressable>
          </View>

          <Text style={styles.heroName}>{profileName}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
        </LinearGradient>

        <View style={styles.container}>
          <View style={styles.inner}>
            {/* Stats row */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalRounds}</Text>
                <Text style={styles.statLabel}>Rounds</Text>
              </View>
              <View style={styles.statDivider} />
              <Pressable
                style={styles.statItem}
                onPress={!isPro ? presentPaywall : undefined}
                disabled={isPro}
              >
                <Text style={styles.statValue}>
                  {isPro ? handicapDisplay : "\uD83D\uDD12"}
                </Text>
                <Text style={styles.statLabel}>
                  {isPro ? "Handicap" : "Pro"}
                </Text>
              </Pressable>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {totalRounds > 0 ? `${attPct}%` : "\u2014"}
                </Text>
                <Text style={styles.statLabel}>Attested</Text>
              </View>
            </View>

            {/* Personal Info Card */}
            <Text style={styles.sectionLabel}>Personal Info</Text>
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Display Name</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    focusedField === "displayName" && styles.fieldInputFocused,
                  ]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  onFocus={() => setFocusedField("displayName")}
                  onBlur={() => handleFieldBlur("displayName")}
                  placeholder="Display Name"
                  placeholderTextColor={Color.neutral400}
                />
                <Text style={styles.fieldHint}>Shown on scorecards</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>First Name</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    focusedField === "firstName" && styles.fieldInputFocused,
                  ]}
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => setFocusedField("firstName")}
                  onBlur={() => handleFieldBlur("firstName")}
                  placeholder="First Name"
                  placeholderTextColor={Color.neutral400}
                />
              </View>

              <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
                <Text style={styles.fieldLabel}>Last Name</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    focusedField === "lastName" && styles.fieldInputFocused,
                  ]}
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setFocusedField("lastName")}
                  onBlur={() => handleFieldBlur("lastName")}
                  placeholder="Last Name"
                  placeholderTextColor={Color.neutral400}
                />
              </View>
            </View>

            {/* Account Card */}
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.card}>
              <View style={[styles.fieldGroup, { marginBottom: Space.lg }]}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.emailText}>{user?.email}</Text>
              </View>

              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.signOutButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>

              {__DEV__ && (
                <Pressable
                  onPress={() => {
                    const next: (SubscriptionTier | null)[] = [null, "free", "pro"];
                    const currentIdx = next.indexOf(devOverrideTier);
                    setDevOverrideTier(next[(currentIdx + 1) % next.length]);
                  }}
                  style={({ pressed }) => [
                    styles.devToggle,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.devToggleLabel}>DEV Tier Override</Text>
                  <Text style={styles.devToggleValue}>
                    {devOverrideTier ?? `auto (${tier})`}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Color.screenBg,
  },

  // Hero
  hero: {
    paddingBottom: Space.xl,
    alignItems: "center",
  },
  navRow: {
    width: "100%",
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
    color: Color.white,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Space.md,
  },
  avatarRing: {
    borderWidth: 3,
    borderColor: Color.white,
    borderRadius: 58,
    overflow: "hidden",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Color.white,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.sm,
  },
  heroName: {
    fontFamily: Font.bold,
    fontSize: 22,
    color: Color.white,
    marginBottom: 2,
  },
  heroEmail: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },

  // Content
  container: {
    alignItems: "center",
    paddingHorizontal: Space.lg,
  },
  inner: {
    width: "100%",
    maxWidth: 448,
    paddingBottom: Space.xxxl,
  },

  // Stats card
  statsCard: {
    flexDirection: "row",
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.lg,
    marginTop: -Space.md,
    marginBottom: Space.xl,
    alignItems: "center",
    ...Shadow.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontFamily: Font.bold,
    fontSize: 20,
    color: Color.neutral900,
  },
  statLabel: {
    fontFamily: Font.medium,
    fontSize: 12,
    color: Color.neutral500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Color.neutral200,
  },

  // Section labels
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },

  // Cards
  card: {
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    marginBottom: Space.xl,
    ...Shadow.sm,
  },

  // Fields
  fieldGroup: {
    marginBottom: Space.lg,
  },
  fieldLabel: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral500,
    marginBottom: Space.sm,
  },
  fieldInput: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral900,
    height: 48,
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.xl,
    backgroundColor: Color.white,
  },
  fieldInputFocused: {
    borderColor: Color.primary,
    borderWidth: 2,
  },
  fieldHint: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Color.neutral400,
    marginTop: Space.xs,
  },
  emailText: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral900,
  },

  // Sign out
  signOutButton: {
    borderWidth: 1,
    borderColor: Color.danger,
    borderRadius: Radius.lg,
    paddingVertical: Space.md,
    alignItems: "center",
  },
  signOutText: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.danger,
  },
  devToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Space.lg,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    backgroundColor: Color.warningLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Color.warning,
  },
  devToggleLabel: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.warning,
  },
  devToggleValue: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Color.warning,
    textTransform: "uppercase",
  },
});
