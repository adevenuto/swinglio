import ActiveRoundCard from "@/components/ActiveRoundCard";
import HandicapInfoModal from "@/components/HandicapInfoModal";
import RoundListSection from "@/components/RoundListSection";
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
import { useSubscription } from "@/contexts/subscription-context";

const PRO_STAT_KEYS = new Set(["handicap", "fwy-pct", "avg-18", "avg-9", "avg-putts"]);
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { useHandicap } from "@/hooks/use-handicap";
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
import { Button, Text } from "react-native-paper";
import GradientButton from "@/components/GradientButton";
import { formatDisplayDate } from "@/lib/date-utils";
import { LinearGradient } from "expo-linear-gradient";

export default function Dashboard() {
  const { user, avatarUrl, refreshUser } = useAuth();
  const { isPro, presentPaywall } = useSubscription();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [handicapModalVisible, setHandicapModalVisible] = useState(false);
  const { activeRounds, refresh: refreshRounds } = useActiveRounds(
    user?.id ?? "",
  );
  const { recentRounds, refresh: refreshRecent } = useRecentRounds(
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
      refreshAttStats();
      refreshHandicap();
    }, [
      refreshRoundStats,
      refreshRounds,
      refreshRecent,
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
      refreshAttStats(),
      refreshHandicap(),
    ]);
    setRefreshing(false);
  }, [
    refreshUser,
    refreshRoundStats,
    refreshRounds,
    refreshRecent,
    refreshAttStats,
    refreshHandicap,
  ]);

  const attestNeededRounds = useMemo(
    () => recentRounds.filter((r) => r.needsAttestation),
    [recentRounds],
  );
  const incompleteRounds = useMemo(
    () => recentRounds.filter((r) => r.player_status === "incomplete"),
    [recentRounds],
  );
  const completedRounds = useMemo(
    () =>
      recentRounds.filter(
        (r) => r.player_status === "completed" && !r.needsAttestation,
      ),
    [recentRounds],
  );

  const statsItems = useMemo<StatItem[]>(() => {
    const locked = (key: string, label: string): StatItem => ({
      key,
      value: "\uD83D\uDD12",
      label,
      subtitle: "Pro",
    });

    return [
      {
        key: "attested",
        value: totalRounds > 0 ? `${attPct}%` : "\u2014",
        label: "Attested",
        progress: attPct,
      },
      isPro
        ? {
            key: "fwy-pct",
            value: fairwayPct != null ? `${fairwayPct}%` : "\u2014",
            label: "FWY Hit",
            progress: fairwayPct ?? 0,
          }
        : locked("fwy-pct", "FWY Hit"),
      { key: "rounds", value: String(totalRounds), label: "Rounds" },
      isPro
        ? {
            key: "handicap",
            value:
              handicapResult?.handicapIndex != null
                ? formatHandicapIndex(handicapResult.handicapIndex)
                : "\u2014",
            label: "Handicap",
            subtitle: "(est)",
          }
        : locked("handicap", "Handicap"),
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
      isPro
        ? {
            key: "avg-18",
            value: avg18 != null ? String(avg18) : "\u2014",
            label: "Avg 18",
          }
        : locked("avg-18", "Avg 18"),
      isPro
        ? {
            key: "avg-9",
            value: avg9 != null ? String(avg9) : "\u2014",
            label: "Avg 9",
          }
        : locked("avg-9", "Avg 9"),
      isPro
        ? {
            key: "avg-putts",
            value: avgPutts != null ? avgPutts.toFixed(1) : "\u2014",
            label: "Avg Putts",
          }
        : locked("avg-putts", "Avg Putts"),
    ];
  }, [
      totalRounds,
      handicapResult,
      bestToPar,
      avg18,
      avg9,
      avgPutts,
      attPct,
      fairwayPct,
      isPro,
    ],
  );

  return (
    <View style={styles.screen}>
      <StatsStrip
        items={statsItems}
        avatarUrl={avatarUrl}
        onAvatarPress={() => router.push("/profile")}
        onItemPress={(key) => {
          if (!isPro && PRO_STAT_KEYS.has(key)) {
            presentPaywall();
            return;
          }
          if (key === "handicap") setHandicapModalVisible(true);
        }}
      />

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
        <View style={styles.contentContainer}>
          <View style={styles.contentInner}>
            {activeRounds.length === 0 && (
              <GradientButton
                onPress={() => router.push("/start-round")}
                label="Start A Round"
                style={{ marginBottom: Space.lg }}
              />
            )}

            <ActiveRoundCard rounds={activeRounds} />

            {/* Attestation Requests */}
            {attestNeededRounds.length > 0 && (
              <View style={{ marginTop: Space.xl }}>
                <Text style={styles.sectionLabel}>Review & Attest</Text>
                {attestNeededRounds.map((round) => (
                  <TouchableOpacity
                    key={round.id}
                    onPress={() =>
                      router.push({
                        pathname: "/round-summary",
                        params: { roundId: round.id },
                      })
                    }
                    style={styles.card}
                  >
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.courseName}>
                          {round.courses?.club_name || "Unknown Course"}
                        </Text>
                        {round.courses?.course_name &&
                          round.courses.course_name !== round.courses.club_name && (
                            <Text style={styles.cardSubtitle}>
                              - {round.courses.course_name}
                            </Text>
                          )}
                      </View>
                      <LinearGradient
                        colors={Color.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          borderRadius: Radius.lg,
                          paddingHorizontal: Space.lg,
                          paddingVertical: Space.sm,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: Font.semiBold,
                            fontSize: 12,
                            color: Color.white,
                          }}
                        >
                          Review
                        </Text>
                      </LinearGradient>
                    </View>
                    <Text style={styles.cardSubtitle}>
                      {(round.teebox_data as any)?.name
                        ? `${(round.teebox_data as any).name} Tees \u00B7 `
                        : ""}
                      {formatDisplayDate(round.display_date)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Rounds */}
            <RoundListSection
              title="Recent Activity"
              rounds={completedRounds}
              limit={3}
              showLegend
              emptyText="No scores on the board yet. Start a round and let's see what you've got."
              onSeeAll={() =>
                router.push({
                  pathname: "/round-history",
                  params: { filter: "completed" },
                })
              }
              onRoundPress={(roundId) =>
                router.push({
                  pathname: "/round-summary",
                  params: { roundId },
                })
              }
            />

            {/* Incomplete Rounds */}
            {incompleteRounds.length > 0 && (
              <RoundListSection
                title="Incomplete Rounds"
                rounds={incompleteRounds}
                limit={3}
                onSeeAll={() =>
                  router.push({
                    pathname: "/round-history",
                    params: { filter: "incomplete" },
                  })
                }
                onRoundPress={(roundId) =>
                  router.push({
                    pathname: "/round-summary",
                    params: { roundId },
                  })
                }
              />
            )}
          </View>
        </View>
      </ScrollView>
      <HandicapInfoModal
        visible={handicapModalVisible}
        onClose={() => setHandicapModalVisible(false)}
        handicapResult={handicapResult}
      />
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
});
