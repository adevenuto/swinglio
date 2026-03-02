import ActiveRoundCard from "@/components/ActiveRoundCard";
import RoundCard from "@/components/RoundCard";
import UserAvatar from "@/components/UserAvatar";
import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { usePendingAttestations } from "@/hooks/use-pending-attestations";
import { useRecentRounds } from "@/hooks/use-recent-rounds";
import { supabase } from "@/lib/supabase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Divider, Menu, Snackbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user, isEditor, signOut, refreshUser } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [totalRounds, setTotalRounds] = useState(0);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });
  const { activeRounds, refresh: refreshRounds } = useActiveRounds(
    user?.id ?? "",
  );
  const { recentRounds, refresh: refreshRecent } = useRecentRounds(
    user?.id ?? "",
  );
  const { pendingRounds, refresh: refreshPending } = usePendingAttestations(
    user?.id ?? "",
  );
  const { percentage: attPct, refresh: refreshAttStats } = useAttestationStats(
    user?.id ?? "",
  );

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url, cover_url")
      .eq("id", user.id)
      .single();
    if (data) {
      setFirstName(data.first_name || data.display_name || null);
      setLastName(data.last_name || null);
      setAvatarUrl(data.avatar_url || null);
      setCoverUrl(data.cover_url || null);
    }
  }, [user?.id]);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("golfer_id", user.id);
    setTotalRounds(count ?? 0);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchStats();
      refreshRounds();
      refreshRecent();
      refreshPending();
      refreshAttStats();
    }, [
      fetchProfile,
      fetchStats,
      refreshRounds,
      refreshRecent,
      refreshPending,
      refreshAttStats,
    ]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshUser(),
      fetchProfile(),
      fetchStats(),
      refreshRounds(),
      refreshRecent(),
      refreshPending(),
      refreshAttStats(),
    ]);
    setRefreshing(false);
  }, [
    refreshUser,
    fetchProfile,
    fetchStats,
    refreshRounds,
    refreshRecent,
    refreshPending,
    refreshAttStats,
  ]);

  // --- Cover photo ---

  const pickCoverImage = async (source: "camera" | "gallery") => {
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
            aspect: [16, 9],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadCover(result.assets[0].uri);
  };

  const uploadCover = async (uri: string) => {
    if (!user?.id) return;

    const fileName = `${user.id}-cover.jpg`;

    const formData = new FormData();
    formData.append("", {
      uri,
      name: `${user.id}.jpg`,
      type: "image/jpeg",
    } as any);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, formData, {
        upsert: true,
        contentType: "multipart/form-data",
      });

    if (uploadError) {
      console.error("Cover upload error:", uploadError);
      Alert.alert("Error", `Failed to upload cover: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ cover_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      Alert.alert("Error", "Cover uploaded but failed to save URL.");
      return;
    }

    setCoverUrl(publicUrl);
    setSnackbar({ visible: true, message: "Cover photo updated" });
  };

  const removeCover = async () => {
    if (!user?.id) return;

    const fileName = `${user.id}-cover.jpg`;
    await supabase.storage.from("avatars").remove([fileName]);

    await supabase
      .from("profiles")
      .update({ cover_url: null })
      .eq("id", user.id);

    setCoverUrl(null);
    setSnackbar({ visible: true, message: "Cover photo removed" });
  };

  const handleCoverPress = () => {
    const options: any[] = [
      { text: "Take Photo", onPress: () => pickCoverImage("camera") },
      { text: "Choose from Gallery", onPress: () => pickCoverImage("gallery") },
    ];

    if (coverUrl) {
      options.push({
        text: "Remove Cover",
        style: "destructive",
        onPress: removeCover,
      });
    }

    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Cover Photo", undefined, options);
  };

  // --- Menu ---

  const handleSignOut = () => {
    setMenuVisible(false);
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

  // --- Derived ---

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Color.info}
            colors={[Color.info]}
          />
        }
      >
        {/* Hero Section */}
        <View>
          {/* Banner */}
          <Pressable onPress={handleCoverPress} style={styles.banner}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerFallback} />
            )}

            {/* Camera edit icon */}
            <View style={styles.cameraIcon}>
              <MaterialIcons
                name="photo-camera"
                size={18}
                color={Color.white}
              />
            </View>

            {/* Menu button */}
            <View style={styles.menuAnchor}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Pressable
                    onPress={() => setMenuVisible(true)}
                    style={styles.menuButton}
                  >
                    <MaterialIcons name="menu" size={26} color={Color.white} />
                  </Pressable>
                }
                anchorPosition="bottom"
                contentStyle={styles.menuContent}
              >
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    router.push("/(protected)/profile");
                  }}
                  title="Profile"
                  leadingIcon="account"
                />
                {isEditor && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      router.push("/(protected)/editor");
                    }}
                    title="Course Editor"
                    leadingIcon="pencil"
                  />
                )}
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    router.push("/(protected)/settings");
                  }}
                  title="Settings"
                  leadingIcon="cog"
                />
                <Divider />
                <Menu.Item
                  onPress={handleSignOut}
                  title="Sign Out"
                  leadingIcon="logout"
                  titleStyle={{ color: Color.danger }}
                />
              </Menu>
            </View>
          </Pressable>

          {/* Avatar + Name row */}
          <View style={styles.profileRow}>
            <View style={styles.avatarBorder}>
              <UserAvatar
                avatarUrl={avatarUrl}
                firstName={firstName}
                size={80}
              />
            </View>
            <View style={styles.nameContainer}>
              {fullName ? (
                <Text variant="headlineSmall" style={styles.nameText}>
                  {fullName}
                </Text>
              ) : null}
              <Text variant="bodyMedium" style={styles.greetingText}>
                Welcome back
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statValue}>
                {totalRounds}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Rounds
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statValue}>
                {"\u2014"}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Handicap
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statValue}>
                {totalRounds > 0 ? `${attPct}%` : "\u2014"}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Attested
              </Text>
            </View>
          </View>
        </View>

        {/* Dashboard Content */}
        <View className="items-center px-8">
          <View className="w-full max-w-md" style={{ marginTop: Space.lg }}>
            {activeRounds.length === 0 && (
              <Button
                mode="contained"
                buttonColor={Color.primary}
                textColor={Color.white}
                onPress={() => router.push("/start-round")}
                style={styles.ctaButton}
              >
                Start A Round
              </Button>
            )}

            <ActiveRoundCard rounds={activeRounds} />

            {/* Attestation Requests */}
            {pendingRounds.length > 0 && (
              <View style={{ marginTop: Space.xl }}>
                <Text style={styles.sectionLabel}>Review & Attest</Text>
                {pendingRounds.map((pr) => (
                  <TouchableOpacity
                    key={pr.round_id}
                    onPress={() =>
                      router.push({
                        pathname: "/round-summary",
                        params: { roundId: pr.round_id },
                      })
                    }
                    style={styles.card}
                  >
                    <View style={styles.cardRow}>
                      <Text variant="titleMedium" style={styles.courseName}>
                        {pr.course_name}
                      </Text>
                      <Button
                        mode="contained"
                        buttonColor={Color.primary}
                        textColor={Color.white}
                        compact
                        style={{ borderRadius: Radius.lg }}
                        labelStyle={{ fontSize: 12 }}
                      >
                        Review
                      </Button>
                    </View>
                    <Text variant="bodyMedium" style={styles.cardSubtitle}>
                      {pr.player_count} players
                      {" \u00B7 "}
                      {formatDate(pr.completed_at)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Rounds */}
            <View style={{ marginTop: Space.xl }}>
              <Text style={styles.sectionLabel}>Recent Activity</Text>

              {recentRounds.length === 0 ? (
                <View
                  style={{ alignItems: "center", paddingVertical: Space.xl }}
                >
                  <Text style={styles.emptyText}>
                    No rounds played yet {"\u2014"} time to hit the links!
                  </Text>
                </View>
              ) : (
                recentRounds.map((round) => (
                  <RoundCard
                    key={round.id}
                    courseName={round.courses?.name || "Unknown Course"}
                    playerStatus={round.player_status}
                    teeboxName={(round.teebox_data as any)?.name}
                    date={round.created_at}
                    playerScore={round.player_score}
                    scoreToPar={round.score_to_par}
                    holesCompleted={round.holes_completed}
                    holeCount={round.hole_count}
                    onPress={() =>
                      router.push({
                        pathname: "/round-summary",
                        params: { roundId: round.id },
                      })
                    }
                  />
                ))
              )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // --- Hero ---
  banner: {
    height: 225,
    width: "100%",
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bannerFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: Color.neutral900,
  },
  cameraIcon: {
    position: "absolute",
    bottom: Space.sm,
    right: Space.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: Radius.full,
    padding: Space.xs,
  },
  menuAnchor: {
    position: "absolute",
    top: Space.sm,
    right: Space.sm,
  },
  menuButton: {
    padding: Space.xs,
  },
  menuContent: {
    backgroundColor: Color.white,
  },
  profileRow: {
    flexDirection: "row",
    paddingHorizontal: Space.lg,
    marginTop: -40,
    alignItems: "flex-end",
  },
  avatarBorder: {
    borderWidth: 3,
    borderColor: Color.white,
    backgroundColor: "#fff",
    borderRadius: 43,
    overflow: "hidden",
  },
  nameContainer: {
    marginLeft: Space.md,
    marginTop: 44,
    flex: 1,
    paddingBottom: Space.xs,
  },
  nameText: {
    fontWeight: "700",
    color: Color.neutral900,
  },
  greetingText: {
    color: Color.neutral500,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: Space.lg,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral200,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontWeight: "700",
    color: Color.neutral900,
  },
  statLabel: {
    color: Color.neutral500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Color.neutral200,
    marginVertical: 4,
  },
  // --- Dashboard content ---
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.sm,
    textTransform: "uppercase",
  },
  ctaButton: {
    marginBottom: Space.lg,
    borderRadius: Radius.lg,
  },
  card: {
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    marginBottom: Space.sm,
    ...Shadow.sm,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseName: {
    fontWeight: "700",
    color: Color.neutral900,
    flex: 1,
    textTransform: "capitalize",
  },
  cardSubtitle: {
    color: Color.neutral500,
    textTransform: "capitalize",
  },
  emptyText: {
    color: Color.neutral400,
    marginTop: Space.md,
    fontSize: 15,
    textAlign: "center",
  },
});
