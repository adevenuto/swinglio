import ActiveRoundCard from "@/components/ActiveRoundCard";
import RoundCard from "@/components/RoundCard";
import StatsStrip, { type StatItem } from "@/components/StatsStrip";
import {
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
} from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { useHandicap } from "@/hooks/use-handicap";
import { usePendingAttestations } from "@/hooks/use-pending-attestations";
import { useRecentRounds } from "@/hooks/use-recent-rounds";
import { useRoundStats } from "@/hooks/use-round-stats";
import { formatHandicapIndex } from "@/lib/handicap";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Snackbar, Text } from "react-native-paper";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user, avatarUrl, refreshUser } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
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
  const { result: handicapResult, refresh: refreshHandicap } = useHandicap(
    user?.id ?? "",
  );
  const {
    totalRounds,
    bestToPar,
    avg18,
    avg9,
    avgPutts,
    fairwayPct,
    refresh: refreshRoundStats,
  } = useRoundStats(user?.id ?? "");

  useFocusEffect(
    useCallback(() => {
      refreshRoundStats();
      refreshRounds();
      refreshRecent();
      refreshPending();
      refreshAttStats();
      refreshHandicap();
    }, [
      refreshRoundStats,
      refreshRounds,
      refreshRecent,
      refreshPending,
      refreshAttStats,
      refreshHandicap,
    ]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshUser(),
      refreshRoundStats(),
      refreshRounds(),
      refreshRecent(),
      refreshPending(),
      refreshAttStats(),
      refreshHandicap(),
    ]);
    setRefreshing(false);
  }, [
    refreshUser,
    refreshRoundStats,
    refreshRounds,
    refreshRecent,
    refreshPending,
    refreshAttStats,
    refreshHandicap,
  ]);

  const incompleteRounds = useMemo(
    () => recentRounds.filter((r) => r.player_status === "incomplete"),
    [recentRounds],
  );
  const completedRounds = useMemo(
    () => recentRounds.filter((r) => r.player_status === "completed"),
    [recentRounds],
  );

  const statsItems = useMemo<StatItem[]>(
    () => [
      {
        key: "attested",
        value: totalRounds > 0 ? `${attPct}%` : "\u2014",
        label: "Attested",
        progress: attPct,
      },
      {
        key: "fwy-pct",
        value: fairwayPct != null ? `${fairwayPct}%` : "\u2014",
        label: "FWY Hit",
        progress: fairwayPct ?? 0,
      },
      { key: "rounds", value: String(totalRounds), label: "Rounds" },
      {
        key: "handicap",
        value:
          handicapResult?.handicapIndex != null
            ? formatHandicapIndex(handicapResult.handicapIndex)
            : "\u2014",
        label: "Handicap",
      },
      {
        key: "best",
        value:
          bestToPar != null
            ? bestToPar === 0
              ? "E"
              : bestToPar > 0
                ? `+${bestToPar}`
                : String(bestToPar)
            : "\u2014",
        label: "Best",
      },
      {
        key: "avg-18",
        value: avg18 != null ? String(avg18) : "\u2014",
        label: "Avg 18",
      },
      {
        key: "avg-9",
        value: avg9 != null ? String(avg9) : "\u2014",
        label: "Avg 9",
      },
      {
        key: "avg-putts",
        value: avgPutts != null ? avgPutts.toFixed(1) : "\u2014",
        label: "Avg Putts",
      },
    ],
    [totalRounds, handicapResult, bestToPar, avg18, avg9, avgPutts, attPct, fairwayPct],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Color.info}
            colors={[Color.info]}
          />
        }
      >
        <StatsStrip
          items={statsItems}
          avatarUrl={avatarUrl}
          onAvatarPress={() => router.push("/profile")}
        />

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
  // --- Dashboard content ---
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: Space.lg,
    paddingBottom: Space.xxxl,
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
