import HandicapHero from "@/components/HandicapHero";
import HandicapInfoModal from "@/components/HandicapInfoModal";
import ProGate from "@/components/ProGate";
import StatCard from "@/components/StatCard";
import FairwayMissChart from "@/components/stats/FairwayMissChart";
import FrontBackNine from "@/components/stats/FrontBackNine";
import ParPerformance from "@/components/stats/ParPerformance";
import PenaltyBreakdownView from "@/components/stats/PenaltyBreakdown";
import PuttingBreakdown from "@/components/stats/PuttingBreakdown";
import ScoreDistributionChart from "@/components/stats/ScoreDistributionChart";
import ScoringTrendChart from "@/components/stats/ScoringTrendChart";
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
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { useDetailedStats } from "@/hooks/use-detailed-stats";
import { useHandicap } from "@/hooks/use-handicap";
import { useRoundStats } from "@/hooks/use-round-stats";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

// ── Helpers ──────────────────────────────────────────────

function formatBestToPar(value: number | null): string {
  if (value == null) return "\u2014";
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : `${value}`;
}

function bestToParColor(value: number | null): string {
  if (value == null) return Color.neutral700;
  if (value < 0) return Color.primary;
  if (value > 0) return Color.danger;
  return Color.neutral700;
}

// ── Progress Bar (for attestation card) ─────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]}
      />
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────

export default function StatsScreen() {
  const { user } = useAuth();
  const { isPro, presentPaywall } = useSubscription();
  const userId = user?.id ?? "";
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [handicapModalVisible, setHandicapModalVisible] = useState(false);

  const {
    totalRounds,
    bestToPar,
    avg18,
    avg9,
    avgPutts,
    fairwayPct,
    girPct,
    penaltyRate,
    isLoading: statsLoading,
    refresh: refreshStats,
  } = useRoundStats(userId);

  const {
    result: handicapResult,
    isLoading: handicapLoading,
    refresh: refreshHandicap,
  } = useHandicap(userId);

  const {
    attestedRounds,
    totalCompletedRounds,
    percentage: attestPct,
    isLoading: attLoading,
    refresh: refreshAttestation,
  } = useAttestationStats(userId);

  const {
    stats: detailedStats,
    isLoading: detailedLoading,
    refresh: refreshDetailed,
  } = useDetailedStats(userId);

  useFocusEffect(
    useCallback(() => {
      refreshStats();
      refreshHandicap();
      refreshAttestation();
      if (isPro) refreshDetailed();
    }, [refreshStats, refreshHandicap, refreshAttestation, refreshDetailed, isPro]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshStats(),
      refreshHandicap(),
      refreshAttestation(),
      isPro ? refreshDetailed() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [refreshStats, refreshHandicap, refreshAttestation, refreshDetailed, isPro]);

  const isLoading = statsLoading || handicapLoading || attLoading;

  // Handicap display values
  const hIndex = handicapResult?.handicapIndex ?? null;
  const hMethod = handicapResult?.methodDescription ?? "";
  const hEligible = handicapResult?.eligibleCount ?? 0;
  const needMore = hIndex == null && hEligible < 3 ? 3 - hEligible : 0;

  // Differentials for bar chart (full objects with course name, score, etc.)
  const differentials = handicapResult?.differentials ?? [];

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Color.primary}
            colors={[Color.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Color.primary} />
          </View>
        ) : (
          <>
            {/* ── Handicap Hero ── */}
            {isPro ? (
              <HandicapHero
                handicapIndex={hIndex}
                differentials={differentials}
                trend={handicapResult?.trend}
                subtitle={
                  needMore > 0
                    ? `Play ${needMore} more round${needMore > 1 ? "s" : ""} to calculate`
                    : hMethod
                }
                onPress={() => setHandicapModalVisible(true)}
                style={{ marginBottom: Space.sm }}
              />
            ) : (
              <Pressable
                onPress={presentPaywall}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <LinearGradient
                  colors={Color.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.handicapUpsell}
                >
                  <Feather
                    name="trending-up"
                    size={24}
                    color={Color.accent}
                    style={{ marginBottom: Space.sm }}
                  />
                  <Text style={styles.upsellTitle}>Handicap Index</Text>
                  <Text style={styles.upsellSubtitle}>
                    Track your WHS-compliant handicap with trend analysis and
                    differential breakdowns
                  </Text>
                  <View style={styles.upsellCta}>
                    <Text style={styles.upsellCtaText}>Unlock with Pro</Text>
                    <Feather name="chevron-right" size={16} color={Color.accent} />
                  </View>
                </LinearGradient>
              </Pressable>
            )}

            {/* Add Past Round link */}
            <Pressable
              onPress={() => router.push("/add-past-round")}
              style={({ pressed }) => [
                styles.addPastRoundRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="plus" size={16} color={Color.primary} />
              <Text style={styles.addPastRoundText}>Add Past Round</Text>
            </Pressable>

            {/* ── Scoring ── */}
            <Text style={styles.sectionLabel}>SCORING</Text>
            <View style={styles.tileRow}>
              <StatCard
                compact
                label="Best"
                value={formatBestToPar(bestToPar)}
                valueColor={bestToParColor(bestToPar)}
              />
              <StatCard
                compact
                label="Rounds"
                value={totalRounds > 0 ? String(totalRounds) : "\u2014"}
              />
            </View>
            {isPro ? (
              <>
                <View style={styles.tileRow}>
                  <StatCard
                    compact
                    label="Avg 18"
                    value={avg18 != null ? String(avg18) : "\u2014"}
                  />
                  <StatCard
                    compact
                    label="Avg 9"
                    value={avg9 != null ? String(avg9) : "\u2014"}
                  />
                </View>

                {/* ── Short Game ── */}
                <Text style={styles.sectionLabel}>SHORT GAME</Text>
                <View style={styles.tileRow}>
                  <StatCard
                    compact
                    label="Avg Putts"
                    value={avgPutts != null ? String(avgPutts) : "\u2014"}
                    subtitle="per hole"
                  />
                  <StatCard
                    compact
                    label="FWY Hit"
                    value={fairwayPct != null ? `${fairwayPct}%` : "\u2014"}
                    barPercent={fairwayPct ?? undefined}
                    barColor={Color.primary}
                  />
                </View>
                <View style={styles.tileRow}>
                  <StatCard
                    compact
                    label="GIR"
                    value={girPct != null ? `${girPct}%` : "\u2014"}
                    barPercent={girPct ?? undefined}
                    barColor={Color.primary}
                  />
                  <StatCard
                    compact
                    label="Penalties"
                    value={penaltyRate != null ? String(penaltyRate) : "\u2014"}
                    subtitle="per round"
                  />
                </View>

                {/* ── Scoring Breakdown ── */}
                <Text style={styles.sectionLabel}>SCORING BREAKDOWN</Text>
                {detailedStats.scoreDistribution && (
                  <View style={{ marginBottom: Space.md }}>
                    <ScoreDistributionChart
                      distribution={detailedStats.scoreDistribution}
                    />
                  </View>
                )}
                <ParPerformance
                  avgPar3={detailedStats.avgPar3}
                  avgPar4={detailedStats.avgPar4}
                  avgPar5={detailedStats.avgPar5}
                />

                {/* ── Putting ── */}
                <Text style={[styles.sectionLabel, { marginTop: Space.sm }]}>
                  PUTTING
                </Text>
                <PuttingBreakdown
                  onePuttPct={detailedStats.onePuttPct}
                  twoPuttPct={detailedStats.twoPuttPct}
                  threePuttPlusPct={detailedStats.threePuttPlusPct}
                />

                {/* ── Trends ── */}
                {detailedStats.scoringTrend.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: Space.sm }]}>
                      SCORING TREND
                    </Text>
                    <ScoringTrendChart data={detailedStats.scoringTrend} />
                  </>
                )}

                {/* ── Shot Patterns ── */}
                <Text style={[styles.sectionLabel, { marginTop: Space.sm }]}>
                  SHOT PATTERNS
                </Text>
                {detailedStats.fairwayMiss && (
                  <View style={{ marginBottom: Space.md }}>
                    <FairwayMissChart {...detailedStats.fairwayMiss} />
                  </View>
                )}
                <FrontBackNine
                  avgFront9={detailedStats.avgFront9}
                  avgBack9={detailedStats.avgBack9}
                />

                {/* ── Trouble Shots ── */}
                {(detailedStats.penaltyBreakdown || detailedStats.bunkerBreakdown) && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: Space.sm }]}>
                      TROUBLE SHOTS
                    </Text>
                    <PenaltyBreakdownView
                      penalties={detailedStats.penaltyBreakdown}
                      bunkers={detailedStats.bunkerBreakdown}
                      roundsCount={detailedStats.penaltyRoundsCount}
                    />
                  </>
                )}
              </>
            ) : (
              <Pressable
                onPress={presentPaywall}
                style={({ pressed }) => [
                  styles.analyticsUpsell,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather
                  name="bar-chart-2"
                  size={22}
                  color={Color.primary}
                  style={{ marginBottom: Space.md }}
                />
                <Text style={styles.analyticsUpsellTitle}>
                  Unlock Advanced Analytics
                </Text>
                <Text style={styles.analyticsUpsellDesc}>
                  Get deeper insights into your game with Pro
                </Text>
                <View style={styles.analyticsFeatureList}>
                  {[
                    { icon: "target" as const, text: "Short Game & GIR" },
                    { icon: "pie-chart" as const, text: "Score Breakdown" },
                    { icon: "crosshair" as const, text: "Putting Analysis" },
                    { icon: "trending-up" as const, text: "Scoring Trends" },
                    { icon: "navigation" as const, text: "Shot Patterns" },
                  ].map((item) => (
                    <View key={item.text} style={styles.analyticsFeatureRow}>
                      <Feather
                        name={item.icon}
                        size={14}
                        color={Color.primary}
                      />
                      <Text style={styles.analyticsFeatureText}>
                        {item.text}
                      </Text>
                    </View>
                  ))}
                </View>
                <LinearGradient
                  colors={Color.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.analyticsCtaRow}
                >
                  <Text style={styles.analyticsCtaText}>Upgrade to Pro</Text>
                  <Feather
                    name="arrow-right"
                    size={16}
                    color={Color.white}
                  />
                </LinearGradient>
              </Pressable>
            )}

            {/* ── Trust ── */}
            <Text style={styles.sectionLabel}>TRUST</Text>
            <View style={styles.attestCard}>
              <View style={styles.attestTopRow}>
                <Text style={styles.attestTitle}>Attestation</Text>
                <Text style={styles.attestPct}>{attestPct}%</Text>
                <View style={styles.attestBar}>
                  <ProgressBar pct={attestPct} />
                </View>
              </View>
              <Text style={styles.attestSub}>
                {attestedRounds} of {totalCompletedRounds} rounds attested
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <HandicapInfoModal
        visible={handicapModalVisible}
        onClose={() => setHandicapModalVisible(false)}
        handicapResult={handicapResult}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────

const TILE_GAP = Space.md;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    paddingBottom: Space.xxxl,
  },
  loader: {
    paddingVertical: Space.xxxl,
    alignItems: "center",
  },

  // ── Section Labels ──
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
    marginTop: Space.sm,
  },
  addPastRoundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    marginBottom: Space.lg,
    marginTop: Space.lg,
  },
  addPastRoundText: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.primary,
  },

  // ── 2-Column Tiles ──
  tileRow: {
    flexDirection: "row",
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
  },

  // ── Progress Bar (attestation) ──
  progressTrack: {
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

  // ── Attestation Card ──
  attestCard: {
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.xl,
    marginBottom: Space.lg,
    ...Shadow.sm,
  },
  attestTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.sm,
  },
  attestTitle: {
    fontFamily: Font.medium,
    fontSize: 15,
    color: Color.neutral700,
    marginRight: Space.md,
  },
  attestPct: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Color.neutral900,
    marginRight: Space.md,
  },
  attestBar: {
    flex: 1,
  },
  attestSub: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
  },

  // ── Handicap Upsell ──
  handicapUpsell: {
    borderRadius: Radius.md,
    padding: Space.xl,
    marginBottom: Space.sm,
    overflow: "hidden",
    ...Shadow.sm,
  },
  upsellTitle: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Color.white,
    marginBottom: Space.xs,
  },
  upsellSubtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
    marginBottom: Space.lg,
  },
  upsellCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  upsellCtaText: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.accent,
  },

  // ── Analytics Upsell ──
  analyticsUpsell: {
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Color.neutral200,
    padding: Space.xl,
    marginTop: Space.sm,
    ...Shadow.sm,
  },
  analyticsUpsellTitle: {
    fontFamily: Font.displayBold,
    fontSize: 18,
    color: Color.neutral900,
    marginBottom: Space.xs,
  },
  analyticsUpsellDesc: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginBottom: Space.lg,
  },
  analyticsFeatureList: {
    gap: Space.md,
    marginBottom: Space.xl,
  },
  analyticsFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  analyticsFeatureText: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.neutral700,
  },
  analyticsCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
    borderRadius: Radius.lg,
    height: 44,
    overflow: "hidden",
  },
  analyticsCtaText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Color.white,
  },
});
