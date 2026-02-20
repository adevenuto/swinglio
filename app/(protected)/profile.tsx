import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { ActivityIndicator, Button, Text as PaperText, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

export default function Profile() {
  const { user, signOut, refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Track original values for dirty check
  const [originalFirstName, setOriginalFirstName] = useState("");
  const [originalLastName, setOriginalLastName] = useState("");

  const isDirty = firstName !== originalFirstName || lastName !== originalLastName;

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) {
      setFirstName(data.first_name ?? "");
      setLastName(data.last_name ?? "");
      setAvatarUrl(data.avatar_url);
      setOriginalFirstName(data.first_name ?? "");
      setOriginalLastName(data.last_name ?? "");
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), fetchProfile()]);
    setRefreshing(false);
  }, [refreshUser, fetchProfile]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      })
      .eq("id", user.id);

    setIsSaving(false);

    if (error) {
      Alert.alert("Error", "Failed to save profile.");
      return;
    }

    setOriginalFirstName(firstName);
    setOriginalLastName(lastName);
    Alert.alert("Saved", "Profile updated successfully.");
  };

  const pickImage = async (source: "camera" | "gallery") => {
    // Request permissions
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to take photos.");
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Photo library permission is needed.");
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

    // Build FormData for reliable RN upload
    const formData = new FormData();
    formData.append("", {
      uri,
      name: fileName,
      type: "image/jpeg",
    } as any);

    // Upload to Supabase Storage (upsert to replace existing)
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update profile record
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      Alert.alert("Error", "Photo uploaded but failed to save URL.");
      return;
    }

    setAvatarUrl(publicUrl);
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

  const handleSignOut = async () => {
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

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        <View className="items-center px-8 pt-12">
          <View className="w-full max-w-md pb-4">
            <Text className="mb-4 text-3xl font-bold text-center">
              Profile
            </Text>
            <Text className="mb-8 text-lg text-center text-gray-600">
              Manage your account
            </Text>
          {/* Avatar */}
          <Pressable
            onPress={handleAvatarPress}
            style={{ alignItems: "center", marginBottom: 24 }}
          >
            <UserAvatar avatarUrl={avatarUrl} firstName={firstName} size={120} />
            <PaperText
              variant="bodySmall"
              style={{ color: "#555", marginTop: 8 }}
            >
              Tap to change photo
            </PaperText>
          </Pressable>

          {/* Info Card */}
          <View
            style={{
              borderWidth: 1,
              borderColor: "#d4d4d4",
              borderRadius: 8,
              backgroundColor: "#fff",
              padding: 16,
              marginBottom: 16,
            }}
          >
            <TextInput
              mode="outlined"
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              mode="outlined"
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              style={{ marginBottom: 12 }}
            />
            <View>
              <PaperText variant="bodySmall" style={{ color: "#999", marginBottom: 4 }}>
                Email
              </PaperText>
              <PaperText variant="bodyMedium" style={{ color: "#1a1a1a" }}>
                {user?.email}
              </PaperText>
            </View>
          </View>

          {/* Save Button */}
          <Button
            mode="outlined"
            onPress={handleSave}
            loading={isSaving}
            disabled={!isDirty || isSaving}
            style={{ marginBottom: 24 }}
          >
            Save Changes
          </Button>

          {/* Sign Out */}
          <Button
            mode="text"
            onPress={handleSignOut}
            textColor="#dc2626"
          >
            Sign Out
          </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
