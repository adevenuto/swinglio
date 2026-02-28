import ScreenHeader from "@/components/ScreenHeader";
import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

export default function StatsScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [monthlyRounds, setMonthlyRounds] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const {
    attestedRounds,
    totalCompletedRounds,
    percentage,
    isLoading: attLoading,
    refresh: refreshAttestation,
  } = useAttestationStats(user?.id ?? "");

  const fetchRoundStats = useCallback(async () => {
    if (!user?.id) return;
    setStatsLoading(true);

    // Total completed rounds
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("round_id, score")
      .eq("golfer_id", user.id);

    if (!scoreRows || scoreRows.length === 0) {
      setRoundCount(0);
      setAvgScore(null);
      setMonthlyRounds(0);
      setStatsLoading(false);
      return;
    }

    const roundIds = [
      ...new Set(scoreRows.map((s) => s.round_id).filter(Boolean)),
    ];

    const { data: completedRounds } = await supabase
      .from("rounds")
      .select("id, created_at")
      .in("id", roundIds)
      .eq("status", "completed");

    const completed = completedRounds || [];
    setRoundCount(completed.length);

    // Average score from scores with a total
    const scoresWithTotal = scoreRows.filter(
      (s) =>
        s.score != null &&
        completed.some((r) => r.id === s.round_id),
    );
    if (scoresWithTotal.length > 0) {
      const sum = scoresWithTotal.reduce((acc, s) => acc + (s.score || 0), 0);
      setAvgScore(Math.round(sum / scoresWithTotal.length));
    } else {
      setAvgScore(null);
    }

    // Rounds this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = completed.filter(
      (r) => new Date(r.created_at) >= monthStart,
    ).length;
    setMonthlyRounds(thisMonth);

    setStatsLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchRoundStats();
      refreshAttestation();
    }, [fetchRoundStats, refreshAttestation]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRoundStats(), refreshAttestation()]);
    setRefreshing(false);
  }, [fetchRoundStats, refreshAttestation]);

  const isLoading = statsLoading || attLoading;

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
        <ScreenHeader title="Stats" />

        {isLoading ? (
          <View style={{ paddingVertical: Space.xxxl }}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <View className="items-center px-8">
            <View className="w-full max-w-md">
              {/* Attestation Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Attestation</Text>

                <View style={styles.attestRow}>
                  <View style={styles.percentCircle}>
                    <Text style={styles.percentText}>{percentage}%</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: Space.lg }}>
                    <Text style={styles.attestLabel}>
                      {attestedRounds} of {totalCompletedRounds} rounds attested
                    </Text>

                    {/* Progress bar */}
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(percentage, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Round Stats Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rounds</Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{roundCount}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {avgScore ?? "\u2014"}
                    </Text>
                    <Text style={styles.statLabel}>Avg Score</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{monthlyRounds}</Text>
                    <Text style={styles.statLabel}>This Month</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    marginBottom: Space.lg,
    ...Shadow.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: Space.md,
  },
  attestRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: Color.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  percentText: {
    fontSize: 18,
    fontWeight: "700",
    color: Color.primary,
  },
  attestLabel: {
    fontSize: 14,
    color: Color.neutral700,
    marginBottom: Space.sm,
  },
  progressBg: {
    height: 8,
    backgroundColor: Color.neutral200,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: Color.primary,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Color.neutral900,
  },
  statLabel: {
    fontSize: 12,
    color: Color.neutral500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Color.neutral200,
  },
});
