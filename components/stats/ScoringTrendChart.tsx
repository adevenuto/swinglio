import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { formatDisplayDate } from "@/lib/date-utils";
import React, { useState } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type TrendPoint = { roundId: number; datePlayed: string; scoreToPar: number };

type Props = {
  data: TrendPoint[];
};

const CHART_HEIGHT = 140;

export default function ScoringTrendChart({ data }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  const scores = data.map((d) => d.scoreToPar);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const screenWidth = Dimensions.get("window").width - Space.lg * 2;
  const barWidth = Math.max(
    Math.min((screenWidth - Space.lg * 2) / data.length - 4, 24),
    8,
  );

  const selected = selectedIdx != null ? data[selectedIdx] : null;

  return (
    <View style={styles.container}>
      <View style={styles.chartArea}>
        {/* Zero line */}
        {minScore < 0 && maxScore > 0 && (
          <View
            style={[
              styles.zeroLine,
              { bottom: ((0 - minScore) / range) * CHART_HEIGHT },
            ]}
          />
        )}

        <View style={styles.barsRow}>
          {data.map((point, i) => {
            const normalizedHeight =
              ((point.scoreToPar - minScore) / range) * (CHART_HEIGHT - 20) + 10;
            const isSelected = selectedIdx === i;
            const isUnderPar = point.scoreToPar < 0;
            const color = isUnderPar ? Color.primary : point.scoreToPar === 0 ? Color.neutral400 : Color.danger;

            return (
              <Pressable
                key={i}
                onPress={() => setSelectedIdx(isSelected ? null : i)}
                style={styles.barCol}
              >
                <Text
                  style={[
                    styles.barLabel,
                    isSelected && { fontFamily: Font.bold, color },
                  ]}
                >
                  {point.scoreToPar > 0
                    ? `+${point.scoreToPar}`
                    : point.scoreToPar === 0
                      ? "E"
                      : point.scoreToPar}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: normalizedHeight,
                      width: barWidth,
                      backgroundColor: isSelected ? color : `${color}60`,
                      borderRadius: barWidth / 4,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {selected && (
        <View style={styles.detail}>
          <Text style={styles.detailText}>
            {formatDisplayDate(selected.datePlayed, true)}
            {"  ·  "}
            {selected.scoreToPar > 0
              ? `+${selected.scoreToPar}`
              : selected.scoreToPar === 0
                ? "Even"
                : selected.scoreToPar}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Color.neutral200,
    ...Shadow.sm,
  },
  chartArea: {
    height: CHART_HEIGHT + 24,
    position: "relative",
  },
  zeroLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Color.neutral200,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: CHART_HEIGHT,
    paddingTop: 20,
  },
  barCol: {
    alignItems: "center",
    flex: 1,
  },
  barLabel: {
    fontFamily: Font.medium,
    fontSize: 10,
    color: Color.neutral500,
    marginBottom: 4,
  },
  bar: {
    minHeight: 6,
  },
  detail: {
    marginTop: Space.md,
    backgroundColor: Color.neutral50,
    borderRadius: Radius.sm,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    alignItems: "center",
  },
  detailText: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral700,
  },
});
