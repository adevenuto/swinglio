import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

type RoundCardProps = {
  courseName: string;
  playerStatus: string;
  teeboxName?: string;
  date: string;
  playerScore?: number | null;
  scoreToPar?: number | null;
  holesCompleted?: number | null;
  holeCount?: number | null;
  onPress: () => void;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatToPar(toPar: number): string {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

export default function RoundCard({
  courseName,
  playerStatus,
  teeboxName,
  date,
  playerScore,
  scoreToPar,
  holesCompleted,
  holeCount,
  onPress,
}: RoundCardProps) {
  const teeLabel = teeboxName ? `${teeboxName} tees` : "";
  const dateLabel = formatDate(date);
  const subtitle = [teeLabel, dateLabel].filter(Boolean).join(" \u00B7 ");
  const showHoles =
    holesCompleted != null &&
    holeCount != null &&
    holesCompleted < holeCount;

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      {/* Row 1: course name | badge */}
      <View style={styles.cardRow}>
        <Text variant="titleMedium" style={styles.courseName}>
          {courseName}
        </Text>
        {playerStatus === "withdrew" && (
          <View style={styles.wdBadge}>
            <MaterialIcons name="block" size={15} color={Color.danger} />
            <Text style={styles.wdBadgeText}>WD</Text>
          </View>
        )}
        {playerStatus === "incomplete" && (
          <View style={styles.incompleteBadge}>
            <MaterialIcons name="warning" size={15} color={Color.warning} />
            <Text style={styles.incompleteBadgeText}>Incomplete</Text>
          </View>
        )}
        {playerStatus === "completed" && (
          <View style={styles.completedBadge}>
            <SimpleLineIcons name="badge" size={15} color={Color.primary} />
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        )}
      </View>

      {/* Row 2: tees · date | score + holes */}
      <View style={styles.cardBottomRow}>
        <Text variant="bodyMedium" style={styles.cardSubtitle}>
          {subtitle}
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          {playerScore != null && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreTotal}>{playerScore}</Text>
              {scoreToPar != null && (
                <Text
                  style={[
                    styles.scoreToPar,
                    {
                      color:
                        scoreToPar > 0
                          ? Color.danger
                          : scoreToPar < 0
                            ? Color.primary
                            : Color.neutral500,
                    },
                  ]}
                >
                  ({formatToPar(scoreToPar)})
                </Text>
              )}
            </View>
          )}
          {showHoles && (
            <Text style={styles.holesText}>
              {holesCompleted} of {holeCount} holes
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Space.xs,
  },
  cardSubtitle: {
    color: Color.neutral500,
    textTransform: "capitalize",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  scoreTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: Color.neutral900,
  },
  scoreToPar: {
    fontSize: 14,
    fontWeight: "600",
  },
  holesText: {
    fontSize: 12,
    color: Color.neutral400,
    marginTop: 2,
  },
  wdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Color.dangerLight,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  wdBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Color.danger,
  },
  incompleteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Color.warningLight,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  incompleteBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Color.warning,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Color.primaryLight,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Color.primary,
  },
});
