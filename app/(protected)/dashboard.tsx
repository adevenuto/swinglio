import ActiveRoundCard from "@/components/ActiveRoundCard";
import RoundCard from "@/components/RoundCard";
import UserAvatar from "@/components/UserAvatar";
import {
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
} from "@/constants/design-tokens";
import { useAppDrawer } from "@/contexts/app-drawer-context";
import { useAuth } from "@/contexts/auth-context";
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { usePendingAttestations } from "@/hooks/use-pending-attestations";
import { useRecentRounds } from "@/hooks/use-recent-rounds";
import { supabase } from "@/lib/supabase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import { Button, Snackbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { openDrawer } = useAppDrawer();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
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
      .eq("golfer_id", user.id)
      .neq("player_status", "withdrew");
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

  // --- Derived ---

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const incompleteRounds = useMemo(
    () => recentRounds.filter((r) => r.player_status === "incomplete"),
    [recentRounds],
  );
  const completedRounds = useMemo(
    () => recentRounds.filter((r) => r.player_status === "completed"),
    [recentRounds],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Hero Section (fixed) */}
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

          {/* Drawer button */}
          <View style={styles.menuAnchor}>
            <Pressable
              onPress={openDrawer}
              style={({ pressed }) => [
                styles.menuButton,
                pressed ? { opacity: 0.7 } : undefined,
              ]}
            >
              <MaterialCommunityIcons name="dots-grid" size={30} color={Color.white} />
            </Pressable>
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
              <Text style={styles.nameText}>{fullName}</Text>
            ) : null}
            <Text style={styles.greetingText}>Welcome back</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalRounds}</Text>
            <Text style={styles.statLabel}>Rounds</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{"\u2014"}</Text>
            <Text style={styles.statLabel}>Handicap</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {totalRounds > 0 ? `${attPct}%` : "\u2014"}
            </Text>
            <Text style={styles.statLabel}>Attested</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Dashboard Content */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Color.info}
            colors={[Color.info]}
          />
        }
      >
        <View style={styles.contentContainer}>
          <View style={styles.contentInner}>
            {activeRounds.length === 0 && (
              <Button
                mode="contained"
                buttonColor={Color.primary}
                textColor={Color.white}
                onPress={() => router.push("/start-round")}
                style={styles.ctaButton}
                labelStyle={{ fontFamily: Font.bold }}
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
                      <Text style={styles.courseName}>{pr.course_name}</Text>
                      <Button
                        mode="contained"
                        buttonColor={Color.primary}
                        textColor={Color.white}
                        compact
                        style={{ borderRadius: Radius.lg }}
                        labelStyle={{ fontFamily: Font.semiBold, fontSize: 12 }}
                      >
                        Review
                      </Button>
                    </View>
                    <Text style={styles.cardSubtitle}>
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

              {completedRounds.length === 0 ? (
                <View
                  style={{ alignItems: "center", paddingVertical: Space.xl }}
                >
                  <Text style={styles.emptyText}>
                    No rounds played yet {"\u2014"} time to hit the links!
                  </Text>
                </View>
              ) : (
                completedRounds.map((round) => (
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

            {/* Incomplete Rounds */}
            {incompleteRounds.length > 0 && (
              <View style={{ marginTop: Space.xl }}>
                <Text style={styles.sectionLabel}>Incomplete Rounds</Text>
                {incompleteRounds.map((round) => (
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
                ))}
              </View>
            )}
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
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  // --- Hero ---
  banner: {
    height: 170,
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
    padding: Space.sm,
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
    backgroundColor: Color.white,
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
    fontFamily: Font.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Color.neutral900,
  },
  greetingText: {
    fontFamily: Font.regular,
    fontSize: 14,
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
    fontFamily: Font.bold,
    fontSize: 20,
    color: Color.accentDark,
  },
  statLabel: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Color.neutral200,
    marginVertical: 4,
  },
  // --- Dashboard content ---
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: Space.xxl,
    paddingBottom: Space.xxl,
  },
  contentInner: {
    width: "100%",
    maxWidth: 448,
    marginTop: Space.lg,
  },
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },
  ctaButton: {
    marginBottom: Space.lg,
    padding: 5,
    borderRadius: Radius.lg,
  },
  card: {
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Color.neutral200,
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
    fontFamily: Font.bold,
    fontSize: 17,
    color: Color.neutral900,
    flex: 1,
    textTransform: "capitalize",
  },
  cardSubtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    textTransform: "capitalize",
  },
  emptyText: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral400,
    marginTop: Space.md,
    textAlign: "center",
  },
});
