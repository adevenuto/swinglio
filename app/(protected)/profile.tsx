import UserAvatar from "@/components/UserAvatar";
import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { supabase } from "@/lib/supabase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
  const { user, refreshUser, refreshProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const savedValues = useRef({ displayName: "", firstName: "", lastName: "" });

  const {
    attestedRounds: attRounds,
    totalCompletedRounds: attTotal,
    percentage: attPct,
    refresh: refreshAttestation,
  } = useAttestationStats(user?.id ?? "");

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
  }, [fetchProfile, refreshAttestation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), fetchProfile(), refreshAttestation()]);
    setRefreshing(false);
  }, [refreshUser, fetchProfile, refreshAttestation]);

  const handleFieldBlur = useCallback(async () => {
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
  }, [user?.id, displayName, firstName, lastName]);

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
      console.error("Avatar upload error:", uploadError);
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
            tintColor={Color.info}
            colors={[Color.info]}
          />
        }
      >
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
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
            <Text style={styles.subtitle}>Manage your account</Text>

            {/* Avatar */}
            <View style={styles.avatarSection}>
              <Pressable onPress={handleAvatarPress}>
                <UserAvatar
                  avatarUrl={avatarUrl}
                  firstName={firstName}
                  size={120}
                />
              </Pressable>
              <Text style={styles.avatarHint}>Tap to change photo</Text>
            </View>

            {/* Info Card */}
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Display Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  onBlur={handleFieldBlur}
                  placeholder="Display Name"
                  placeholderTextColor={Color.neutral400}
                />
                <Text style={styles.fieldHint}>Shown on scorecards</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>First Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  onBlur={handleFieldBlur}
                  placeholder="First Name"
                  placeholderTextColor={Color.neutral400}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Last Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={lastName}
                  onChangeText={setLastName}
                  onBlur={handleFieldBlur}
                  placeholder="Last Name"
                  placeholderTextColor={Color.neutral400}
                />
              </View>

              <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.emailText}>{user?.email}</Text>
              </View>
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
    paddingBottom: Space.lg,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 28,
    lineHeight: 34,
    color: Color.neutral900,
    textAlign: "center",
    marginBottom: Space.xs,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral500,
    textAlign: "center",
    marginBottom: Space.md,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Space.xl,
  },
  avatarHint: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: Space.sm,
  },
  card: {
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    marginBottom: Space.lg,
  },
  fieldGroup: {
    marginBottom: Space.lg,
  },
  fieldLabel: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.neutral700,
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
    paddingHorizontal: Space.lg,
    backgroundColor: Color.white,
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
    paddingVertical: Space.md,
  },
  attestTitle: {
    fontFamily: Font.bold,
    fontSize: 17,
    color: Color.neutral900,
  },
  attestSub: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: 2,
  },
  attestCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Color.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  attestCircleText: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Color.accentDark,
  },
});
