import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { formatHandicapIndex } from "@/lib/handicap";
import { HandicapDifferential } from "@/types/handicap";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

type HandicapHeroProps = {
  handicapIndex: number | null;
  differentials?: HandicapDifferential[];
  trend?: number | null;
  subtitle?: string;
  onPress?: () => void;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function HandicapHero({
  handicapIndex,
  differentials,
  trend,
  subtitle,
  onPress,
  onClose,
  style,
}: HandicapHeroProps) {
  // Show last 5 differentials for the bar chart
  // Differentials arrive date-descending; take 5 most recent, reverse for chronological L→R
  const chartData = differentials?.slice(0, 5).reverse() ?? [];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Default to most recent when data arrives
  useEffect(() => {
    if (chartData.length > 0) setSelectedIdx(chartData.length - 1);
  }, [chartData.length]);

  const maxVal = chartData.length > 0 ? Math.max(...chartData.map((d) => d.differential)) : 0;
  const selected = selectedIdx != null ? chartData[selectedIdx] : null;

  return (
    <View style={[styles.container, style]}>
      {onClose && (
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed ? { opacity: 0.7 } : undefined,
          ]}
          hitSlop={12}
        >
          <Feather name="x" size={22} color={Color.white} />
        </Pressable>
      )}

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => pressed && onPress ? { opacity: 0.7 } : undefined}
      >
        <Text style={styles.label}>CURRENT INDEX</Text>

        <View style={styles.valueRow}>
          <Text style={styles.value}>{formatHandicapIndex(handicapIndex)}</Text>
          {trend != null && trend !== 0 && (
            <View style={styles.trendWrap}>
              <Feather
                name={trend < 0 ? "arrow-down" : "arrow-up"}
                size={14}
                color={Color.accent}
              />
              <Text style={styles.trendText}>{Math.abs(trend).toFixed(1)}</Text>
            </View>
          )}
        </View>

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Pressable>

      {chartData.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>RECENT DIFFERENTIALS</Text>
          <View style={styles.chartWrapper}>
            {chartData.map((d, i) => {
              const heightPct = maxVal > 0 ? (d.differential / maxVal) * 80 : 0;
              const isLast = i === chartData.length - 1;
              const isSelected = selectedIdx === i;
              return (
                <Pressable
                  key={i}
                  style={styles.barCol}
                  onPress={() => setSelectedIdx(isSelected ? null : i)}
                >
                  <Text
                    style={[
                      styles.barLabel,
                      (isLast || isSelected) && styles.barLabelAccent,
                    ]}
                  >
                    {d.differential.toFixed(1)}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(heightPct, 6),
                        backgroundColor:
                          isSelected || isLast
                            ? Color.accent
                            : "rgba(255,255,255,0.3)",
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          {selected && (
            <View style={styles.detailCard}>
              {selected.courseName ? (
                <Text style={styles.detailCourse} numberOfLines={1}>
                  {selected.courseName}
                </Text>
              ) : null}
              <View style={styles.detailRow}>
                {selected.grossScore != null && (
                  <Text style={styles.detailItem}>
                    Score: {selected.grossScore}
                  </Text>
                )}
                <Text style={styles.detailItem}>
                  Diff: {selected.differential.toFixed(1)}
                </Text>
                <Text style={styles.detailItem}>
                  {formatDate(selected.datePlayed)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.primary,
    borderRadius: Radius.md,
    padding: Space.xl,
    ...Shadow.sm,
  },
  closeBtn: {
    position: "absolute",
    top: Space.lg,
    right: Space.lg,
    zIndex: 1,
  },
  label: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    marginBottom: Space.sm,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Space.sm,
    marginBottom: Space.xs,
  },
  value: {
    fontFamily: Font.displayBold,
    fontSize: 44,
    lineHeight: 52,
    color: Color.white,
  },
  trendWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingBottom: 4,
  },
  trendText: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.accent,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  chartSection: {
    marginTop: Space.xl,
  },
  chartTitle: {
    fontFamily: Font.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    marginBottom: Space.sm,
  },
  chartWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Space.sm,
    height: 100,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  barLabel: {
    fontFamily: Font.medium,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginBottom: Space.xs,
  },
  barLabelAccent: {
    color: Color.accent,
    fontFamily: Font.bold,
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  detailCard: {
    marginTop: Space.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: Radius.sm,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
  },
  detailCourse: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.white,
    marginBottom: Space.xs,
  },
  detailRow: {
    flexDirection: "row",
    gap: Space.md,
  },
  detailItem: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
});
