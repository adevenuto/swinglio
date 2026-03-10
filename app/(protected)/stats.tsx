import { Color, Font, Radius, Shadow, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useAttestationStats } from "@/hooks/use-attestation-stats";
import { useHandicap } from "@/hooks/use-handicap";
import { useRoundStats } from "@/hooks/use-round-stats";
import { formatHandicapIndex } from "@/lib/handicap";
import { useFocusEffect } from "expo-router";
import HandicapInfoModal from "@/components/HandicapInfoModal";
import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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

// ── Progress Bar ─────────────────────────────────────────

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
            <Pressable
              onPress={() => setHandicapModalVisible(true)}
              style={({ pressed }) => pressed ? { opacity: 0.7 } : undefined}
            >
              <View style={styles.heroCard}>
                <View style={styles.heroRow}>
                  <MaterialCommunityIcons
                    name="golf-tee"
                    size={22}
                    color={Color.white}
                    style={styles.heroIcon}
                  />
                  <Text style={styles.heroLabel}>HANDICAP INDEX</Text>
                </View>
                <Text style={styles.heroValue}>
                  {formatHandicapIndex(hIndex)}
                </Text>
                <Text style={styles.heroSub}>
                  {needMore > 0
                    ? `Play ${needMore} more round${needMore > 1 ? "s" : ""} to calculate`
                    : hMethod}
                </Text>
              </View>
            </Pressable>

            {/* ── Scoring ── */}
            <Text style={styles.sectionLabel}>SCORING</Text>
            <View style={styles.tileRow}>
              <View style={styles.tile}>
                <Text
                  style={[
                    styles.tileValue,
                    { color: bestToParColor(bestToPar) },
                  ]}
                >
                  {formatBestToPar(bestToPar)}
                </Text>
                <Text style={styles.tileLabel}>Best</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>
                  {totalRounds > 0 ? totalRounds : "\u2014"}
                </Text>
                <Text style={styles.tileLabel}>Rounds</Text>
              </View>
            </View>
            <View style={styles.tileRow}>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>
                  {avg18 != null ? avg18 : "\u2014"}
                </Text>
                <Text style={styles.tileLabel}>Avg 18</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>
                  {avg9 != null ? avg9 : "\u2014"}
                </Text>
                <Text style={styles.tileLabel}>Avg 9</Text>
              </View>
            </View>

            {/* ── Short Game ── */}
            <Text style={styles.sectionLabel}>SHORT GAME</Text>
            <View style={styles.tileRow}>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>
                  {avgPutts != null ? avgPutts : "\u2014"}
                </Text>
                <Text style={styles.tileLabel}>Avg Putts</Text>
              </View>
              <View style={styles.tile}>
                <View style={styles.barTileContent}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>FWY Hit</Text>
                    <Text style={styles.barValue}>
                      {fairwayPct != null ? `${fairwayPct}%` : "\u2014"}
                    </Text>
                  </View>
                  {fairwayPct != null && <ProgressBar pct={fairwayPct} />}
                </View>
              </View>
            </View>
            <View style={styles.tileRow}>
              <View style={styles.tile}>
                <View style={styles.barTileContent}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>GIR</Text>
                    <Text style={styles.barValue}>
                      {girPct != null ? `${girPct}%` : "\u2014"}
                    </Text>
                  </View>
                  {girPct != null && <ProgressBar pct={girPct} />}
                </View>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>
                  {penaltyRate != null ? penaltyRate : "\u2014"}
                </Text>
                <Text style={styles.tileLabel}>Penalties</Text>
                {penaltyRate != null && (
                  <Text style={styles.tileSub}>per round</Text>
                )}
              </View>
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

  // ── Handicap Hero ──
  heroCard: {
    backgroundColor: Color.primary,
    borderRadius: Radius.md,
    padding: Space.xl,
    marginBottom: Space.lg,
    ...Shadow.sm,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.sm,
  },
  heroIcon: {
    marginRight: Space.sm,
  },
  heroLabel: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
  },
  heroValue: {
    fontFamily: Font.bold,
    fontSize: 44,
    lineHeight: 52,
    color: Color.white,
    marginBottom: Space.xs,
  },
  heroSub: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
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
  tile: {
    flex: 1,
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
    ...Shadow.sm,
  },
  tileValue: {
    fontFamily: Font.bold,
    fontSize: 32,
    lineHeight: 38,
    color: Color.neutral900,
  },
  tileLabel: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: Space.xs,
  },
  tileSub: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Color.neutral400,
    marginTop: 2,
  },

  // ── Bar Tiles (FWY, GIR) ──
  barTileContent: {
    width: "100%",
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.sm,
  },
  barLabel: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral500,
  },
  barValue: {
    fontFamily: Font.bold,
    fontSize: 20,
    color: Color.neutral900,
  },

  // ── Progress Bar ──
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
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
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
