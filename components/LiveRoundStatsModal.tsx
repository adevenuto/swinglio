import { Color, Font, Radius, Shadow, Space, Type } from "@/constants/design-tokens";
import { HoleData, ScoreDetails } from "@/types/scoring";
import Feather from "@expo/vector-icons/Feather";
import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  scoreDetails: ScoreDetails | null;
  teeboxHoles: Record<string, { par: string; length: string }> | undefined;
};

type LiveStats = {
  holesPlayed: number;
  totalHoles: number;
  scoreToPar: number;
  // Putting
  onePutt: number;
  twoPutt: number;
  threePuttPlus: number;
  totalPuttHoles: number;
  // Par performance
  par3Avg: number | null;
  par4Avg: number | null;
  par5Avg: number | null;
  // Fairway
  fairwayHit: number;
  fairwayTotal: number;
  // GIR
  girHit: number;
  girTotal: number;
  // Other
  penaltyCount: number;
  bunkerCount: number;
  // Per-hole breakdown
  holeBreakdown: {
    holeNumber: number;
    par: number;
    score: number;
    toPar: number;
    putts: number | null;
    fairway: string | null;
    gir: boolean | null;
  }[];
};

function computeLiveStats(
  scoreDetails: ScoreDetails | null,
  teeboxHoles: Record<string, { par: string; length: string }> | undefined,
): LiveStats {
  const empty: LiveStats = {
    holesPlayed: 0,
    totalHoles: 0,
    scoreToPar: 0,
    onePutt: 0,
    twoPutt: 0,
    threePuttPlus: 0,
    totalPuttHoles: 0,
    par3Avg: null,
    par4Avg: null,
    par5Avg: null,
    fairwayHit: 0,
    fairwayTotal: 0,
    girHit: 0,
    girTotal: 0,
    penaltyCount: 0,
    bunkerCount: 0,
    holeBreakdown: [],
  };

  if (!scoreDetails?.holes) return empty;

  const totalHoles = Object.keys(scoreDetails.holes).length;
  let holesPlayed = 0;
  let scoreToPar = 0;
  let onePutt = 0, twoPutt = 0, threePuttPlus = 0, totalPuttHoles = 0;
  let fairwayHit = 0, fairwayTotal = 0;
  let girHit = 0, girTotal = 0;
  let penaltyCount = 0, bunkerCount = 0;

  const par3Diffs: number[] = [];
  const par4Diffs: number[] = [];
  const par5Diffs: number[] = [];
  const holeBreakdown: LiveStats["holeBreakdown"] = [];

  for (const [key, hole] of Object.entries(scoreDetails.holes)) {
    const score = parseInt(hole.score, 10);
    const par = parseInt(hole.par, 10);
    if (isNaN(score) || score <= 0 || isNaN(par)) continue;

    const holeNumber = parseInt(key.replace("hole-", ""), 10);
    const diff = score - par;

    holesPlayed++;
    scoreToPar += diff;

    if (par === 3) par3Diffs.push(diff);
    else if (par === 4) par4Diffs.push(diff);
    else if (par >= 5) par5Diffs.push(diff);

    const entry: LiveStats["holeBreakdown"][0] = {
      holeNumber,
      par,
      score,
      toPar: diff,
      putts: null,
      fairway: null,
      gir: null,
    };

    if (hole.stats) {
      if (hole.stats.putts != null) {
        totalPuttHoles++;
        entry.putts = hole.stats.putts;
        if (hole.stats.putts === 1) onePutt++;
        else if (hole.stats.putts === 2) twoPutt++;
        else if (hole.stats.putts >= 3) threePuttPlus++;
      }

      if ((par === 4 || par >= 5) && hole.stats.fairway != null) {
        fairwayTotal++;
        entry.fairway = hole.stats.fairway;
        if (hole.stats.fairway === "hit") fairwayHit++;
      }

      if (hole.stats.gir != null) {
        girTotal++;
        entry.gir = hole.stats.gir;
        if (hole.stats.gir) girHit++;
      }

      if (hole.stats.penalties?.length) {
        penaltyCount += hole.stats.penalties.length;
      }
      if (hole.stats.bunkers?.length) {
        bunkerCount += hole.stats.bunkers.length;
      }
    }

    holeBreakdown.push(entry);
  }

  holeBreakdown.sort((a, b) => a.holeNumber - b.holeNumber);

  const avg = (arr: number[]) =>
    arr.length > 0
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      : null;

  return {
    holesPlayed,
    totalHoles,
    scoreToPar,
    onePutt,
    twoPutt,
    threePuttPlus,
    totalPuttHoles,
    par3Avg: avg(par3Diffs),
    par4Avg: avg(par4Diffs),
    par5Avg: avg(par5Diffs),
    fairwayHit,
    fairwayTotal,
    girHit,
    girTotal,
    penaltyCount,
    bunkerCount,
    holeBreakdown,
  };
}

function formatToPar(val: number): string {
  if (val === 0) return "E";
  return val > 0 ? `+${val}` : `${val}`;
}

function formatPct(n: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

function formatAvg(val: number | null): string {
  if (val == null) return "—";
  if (val === 0) return "E";
  return val > 0 ? `+${val}` : `${val}`;
}

function avgColor(val: number | null): string {
  if (val == null) return Color.neutral700;
  if (val < 0) return Color.primary;
  if (val > 0.5) return Color.danger;
  return Color.neutral700;
}

function toParColor(val: number): string {
  if (val < 0) return Color.primary;
  if (val > 0) return Color.danger;
  return Color.neutral500;
}

export default function LiveRoundStatsModal({
  visible,
  onClose,
  scoreDetails,
  teeboxHoles,
}: Props) {
  const stats = useMemo(
    () => computeLiveStats(scoreDetails, teeboxHoles),
    [scoreDetails, teeboxHoles],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Round Stats</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="x" size={22} color={Color.neutral700} />
          </Pressable>
        </View>

        {stats.holesPlayed === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="bar-chart-2" size={48} color={Color.neutral300} />
            <Text style={styles.emptyTitle}>No Holes Scored Yet</Text>
            <Text style={styles.emptyBody}>
              Stats will appear as you play.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Overview */}
            <View style={styles.overviewRow}>
              <View style={styles.overviewPill}>
                <Text style={styles.overviewValue}>
                  {stats.holesPlayed}/{stats.totalHoles}
                </Text>
                <Text style={styles.overviewLabel}>Holes</Text>
              </View>
              <View
                style={[
                  styles.overviewPill,
                  { borderColor: stats.scoreToPar <= 0 ? Color.primaryBorder : Color.neutral200 },
                ]}
              >
                <Text
                  style={[
                    styles.overviewValue,
                    { color: toParColor(stats.scoreToPar) },
                  ]}
                >
                  {formatToPar(stats.scoreToPar)}
                </Text>
                <Text style={styles.overviewLabel}>To Par</Text>
              </View>
            </View>

            {/* Putting Breakdown */}
            {stats.totalPuttHoles > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PUTTING</Text>
                <View style={styles.card}>
                  <View style={styles.puttRow}>
                    <PuttBar
                      label="1-Putt"
                      count={stats.onePutt}
                      total={stats.totalPuttHoles}
                      color={Color.primary}
                    />
                    <PuttBar
                      label="2-Putt"
                      count={stats.twoPutt}
                      total={stats.totalPuttHoles}
                      color="#6BB87B"
                    />
                    <PuttBar
                      label="3-Putt+"
                      count={stats.threePuttPlus}
                      total={stats.totalPuttHoles}
                      color={Color.danger}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Par Performance */}
            {(stats.par3Avg != null || stats.par4Avg != null || stats.par5Avg != null) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PAR PERFORMANCE</Text>
                <View style={styles.parRow}>
                  <View style={styles.parTile}>
                    <Text style={[styles.parValue, { color: avgColor(stats.par3Avg) }]}>
                      {formatAvg(stats.par3Avg)}
                    </Text>
                    <Text style={styles.parLabel}>Par 3s</Text>
                  </View>
                  <View style={styles.parTile}>
                    <Text style={[styles.parValue, { color: avgColor(stats.par4Avg) }]}>
                      {formatAvg(stats.par4Avg)}
                    </Text>
                    <Text style={styles.parLabel}>Par 4s</Text>
                  </View>
                  <View style={styles.parTile}>
                    <Text style={[styles.parValue, { color: avgColor(stats.par5Avg) }]}>
                      {formatAvg(stats.par5Avg)}
                    </Text>
                    <Text style={styles.parLabel}>Par 5s</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>QUICK STATS</Text>
              <View style={styles.card}>
                {stats.fairwayTotal > 0 && (
                  <QuickStatRow
                    label="Fairways Hit"
                    value={`${stats.fairwayHit}/${stats.fairwayTotal}`}
                    pct={formatPct(stats.fairwayHit, stats.fairwayTotal)}
                  />
                )}
                {stats.girTotal > 0 && (
                  <QuickStatRow
                    label="Greens in Reg"
                    value={`${stats.girHit}/${stats.girTotal}`}
                    pct={formatPct(stats.girHit, stats.girTotal)}
                  />
                )}
                {stats.totalPuttHoles > 0 && (
                  <QuickStatRow
                    label="Avg Putts"
                    value={`${((stats.onePutt + stats.twoPutt * 2 + stats.threePuttPlus * 3) / stats.totalPuttHoles).toFixed(1)}`}
                  />
                )}
                {stats.penaltyCount > 0 && (
                  <QuickStatRow
                    label="Penalties"
                    value={`${stats.penaltyCount}`}
                    valueColor={Color.danger}
                  />
                )}
                {stats.bunkerCount > 0 && (
                  <QuickStatRow
                    label="Bunker Shots"
                    value={`${stats.bunkerCount}`}
                  />
                )}
              </View>
            </View>

            {/* Hole-by-Hole */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>HOLE BY HOLE</Text>
              <View style={styles.card}>
                <View style={styles.holeHeaderRow}>
                  <Text style={[styles.holeCol, styles.holeColNum]}>#</Text>
                  <Text style={[styles.holeCol, styles.holeColPar]}>Par</Text>
                  <Text style={[styles.holeCol, styles.holeColScore]}>Score</Text>
                  <Text style={[styles.holeCol, styles.holeColToPar]}>+/-</Text>
                  <Text style={[styles.holeCol, styles.holeColPutts]}>Putts</Text>
                  <Text style={[styles.holeCol, styles.holeColFwy]}>FWY</Text>
                  <Text style={[styles.holeCol, styles.holeColGir]}>GIR</Text>
                </View>
                {stats.holeBreakdown.map((h) => (
                  <View key={h.holeNumber} style={styles.holeDataRow}>
                    <Text style={[styles.holeCellNum, styles.holeColNum]}>
                      {h.holeNumber}
                    </Text>
                    <Text style={[styles.holeCell, styles.holeColPar]}>{h.par}</Text>
                    <Text style={[styles.holeCellBold, styles.holeColScore]}>
                      {h.score}
                    </Text>
                    <Text
                      style={[
                        styles.holeCellBold,
                        styles.holeColToPar,
                        { color: toParColor(h.toPar) },
                      ]}
                    >
                      {h.toPar === 0 ? "E" : h.toPar > 0 ? `+${h.toPar}` : h.toPar}
                    </Text>
                    <Text style={[styles.holeCell, styles.holeColPutts]}>
                      {h.putts != null ? h.putts : "—"}
                    </Text>
                    <Text
                      style={[
                        styles.holeCell,
                        styles.holeColFwy,
                        h.fairway === "hit" && { color: Color.primary },
                      ]}
                    >
                      {h.fairway === "hit"
                        ? "✓"
                        : h.fairway
                          ? h.fairway.charAt(0).toUpperCase()
                          : "—"}
                    </Text>
                    <Text
                      style={[
                        styles.holeCell,
                        styles.holeColGir,
                        h.gir === true && { color: Color.primary },
                      ]}
                    >
                      {h.gir === true ? "✓" : h.gir === false ? "✗" : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/* ── Sub-components ── */

function PuttBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barHeight = total > 0 ? Math.max((count / total) * 80, 4) : 0;

  return (
    <View style={styles.puttCol}>
      <Text style={[styles.puttPct, { color }]}>{pct}%</Text>
      <View style={styles.puttBarTrack}>
        <View
          style={[
            styles.puttBarFill,
            { height: barHeight, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.puttLabel}>{label}</Text>
      <Text style={styles.puttCount}>{count}</Text>
    </View>
  );
}

function QuickStatRow({
  label,
  value,
  pct,
  valueColor,
}: {
  label: string;
  value: string;
  pct?: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.quickRow}>
      <Text style={styles.quickLabel}>{label}</Text>
      <View style={styles.quickRight}>
        <Text style={[styles.quickValue, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </Text>
        {pct && <Text style={styles.quickPct}>{pct}</Text>}
      </View>
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Color.neutral50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    backgroundColor: Color.white,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral200,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Color.neutral900,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Space.xxl,
  },
  emptyTitle: {
    fontFamily: Font.semiBold,
    fontSize: 18,
    color: Color.neutral700,
    marginTop: Space.lg,
  },
  emptyBody: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    textAlign: "center",
    marginTop: Space.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space.lg,
    paddingBottom: Space.xxxl,
  },

  // Overview
  overviewRow: {
    flexDirection: "row",
    gap: Space.md,
    marginBottom: Space.xl,
  },
  overviewPill: {
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Color.neutral200,
  },
  overviewValue: {
    fontFamily: Font.bold,
    fontSize: 22,
    color: Color.neutral900,
  },
  overviewLabel: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: Space.xl,
  },
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },
  card: {
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Color.neutral200,
    ...Shadow.sm,
  },

  // Putting
  puttRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  puttCol: {
    alignItems: "center",
    flex: 1,
  },
  puttPct: {
    fontFamily: Font.bold,
    fontSize: 18,
    marginBottom: Space.xs,
  },
  puttBarTrack: {
    width: 32,
    height: 80,
    backgroundColor: Color.neutral100,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  puttBarFill: {
    width: 32,
    borderRadius: 6,
  },
  puttLabel: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral700,
    marginTop: Space.sm,
  },
  puttCount: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Color.neutral500,
    marginTop: 2,
  },

  // Par performance
  parRow: {
    flexDirection: "row",
    gap: Space.md,
  },
  parTile: {
    flex: 1,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
    borderWidth: 1,
    borderColor: Color.neutral200,
    ...Shadow.sm,
  },
  parValue: {
    fontFamily: Font.bold,
    fontSize: 28,
    color: Color.neutral900,
  },
  parLabel: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: Space.xs,
  },

  // Quick stats
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral100,
  },
  quickLabel: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral700,
  },
  quickRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  quickValue: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.neutral900,
  },
  quickPct: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral500,
  },

  // Hole-by-hole table
  holeHeaderRow: {
    flexDirection: "row",
    paddingBottom: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral200,
    marginBottom: Space.xs,
  },
  holeDataRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral50,
  },
  holeCol: {
    fontFamily: Font.semiBold,
    fontSize: 12,
    color: Color.neutral500,
    textTransform: "uppercase",
  },
  holeCell: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral700,
  },
  holeCellBold: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.neutral900,
  },
  holeCellNum: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.neutral500,
  },
  holeColNum: { width: 28 },
  holeColPar: { width: 36 },
  holeColScore: { width: 42 },
  holeColToPar: { width: 36 },
  holeColPutts: { width: 40 },
  holeColFwy: { width: 36 },
  holeColGir: { flex: 1, textAlign: "right" },
});
