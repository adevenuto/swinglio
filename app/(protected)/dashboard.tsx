import ActiveRoundCard from "@/components/ActiveRoundCard";
import ScreenHeader from "@/components/ScreenHeader";
import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { useRecentRounds } from "@/hooks/use-recent-rounds";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const { activeRounds, refresh: refreshRounds } = useActiveRounds(
    user?.id ?? "",
  );
  const { recentRounds, refresh: refreshRecent } = useRecentRounds(
    user?.id ?? "",
  );

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("first_name, display_name")
      .eq("id", user.id)
      .single();
    if (data) {
      setFirstName(data.first_name || data.display_name || null);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      refreshRounds();
      refreshRecent();
    }, [fetchProfile, refreshRounds, refreshRecent]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), fetchProfile(), refreshRounds(), refreshRecent()]);
    setRefreshing(false);
  }, [refreshUser, fetchProfile, refreshRounds, refreshRecent]);

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
        <ScreenHeader title="Dashboard" />
        <View className="items-center px-8">
          <View className="w-full max-w-md" style={{ marginBottom: Space.lg }}>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: "700", color: Color.neutral900 }}
            >
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </Text>
          </View>
          <View className="w-full max-w-md">

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

            {/* Recent Rounds */}
            <View style={{ marginTop: Space.xl }}>
              <Text style={styles.sectionLabel}>
                Recent Activity
              </Text>

              {recentRounds.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: Space.xl }}>
                  <Text
                    style={styles.emptyText}
                  >
                    No rounds played yet {"\u2014"} time to hit the links!
                  </Text>
                </View>
              ) : (
                recentRounds.map((round) => (
                  <TouchableOpacity
                    key={round.id}
                    onPress={() =>
                      router.push({
                        pathname: "/gameplay",
                        params: { roundId: round.id },
                      })
                    }
                    style={styles.card}
                  >
                    <View style={styles.cardRow}>
                      <Text
                        variant="titleMedium"
                        style={styles.courseName}
                      >
                        {round.courses?.name || "Unknown Course"}
                      </Text>
                      <Text variant="bodySmall" style={{ color: Color.neutral400 }}>
                        {formatDate(round.created_at)}
                      </Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={styles.cardSubtitle}
                    >
                      {(round.teebox_data as any)?.name
                        ? `${(round.teebox_data as any).name} tees`
                        : ""}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    marginTop: Space.xs,
    textTransform: "capitalize",
  },
  emptyText: {
    color: Color.neutral400,
    marginTop: Space.md,
    fontSize: 15,
    textAlign: "center",
  },
});
