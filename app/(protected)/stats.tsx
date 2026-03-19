import { Color, Font, Radius, Shadow, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { useHandicap } from "@/hooks/use-handicap";
import { useRoundStats } from "@/hooks/use-round-stats";
import { useFocusEffect } from "expo-router";
import HandicapHero from "@/components/HandicapHero";
import HandicapInfoModal from "@/components/HandicapInfoModal";
import StatCard from "@/components/StatCard";
import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
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
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────

export default function StatsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
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

  useFocusEffect(
    useCallback(() => {
      refreshStats();
      refreshHandicap();
      refreshAttestation();
    }, [refreshStats, refreshHandicap, refreshAttestation]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshHandicap(), refreshAttestation()]);
    setRefreshing(false);
  }, [refreshStats, refreshHandicap, refreshAttestation]);

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
              <HandicapHero
                handicapIndex={hIndex}
                differentials={differentials}
                trend={handicapResult?.trend}
                subtitle={needMore > 0 ? `Play ${needMore} more round${needMore > 1 ? "s" : ""} to calculate` : hMethod}
                onPress={() => setHandicapModalVisible(true)}
                style={{ marginBottom: Space.lg }}
              />

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
    backgroundColor: Color.secondary,
    borderRadius: 4,
  },

  // ── Attestation Card ──
  attestCard: {
    borderWidth: 1,
    borderColor: Color.neutral200,
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
});
