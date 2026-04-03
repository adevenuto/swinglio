import PlayerAvatarRow, {
  PlayerAvatarInfo,
} from "@/components/PlayerAvatarRow";
import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { formatDisplayDate } from "@/lib/date-utils";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import StyledTooltip from "./StyledTooltip";

type RoundCardProps = {
  courseName: string;
  courseNameSub?: string | null;
  playerStatus: string;
  teeboxName?: string;
  date: string;
  playerScore?: number | null;
  scoreToPar?: number | null;
  holesCompleted?: number | null;
  holeCount?: number | null;
  players?: PlayerAvatarInfo[];
  onPress: () => void;
};

function formatToPar(toPar: number): string {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

export default function RoundCard({
  courseName,
  courseNameSub,
  playerStatus,
  teeboxName,
  date,
  playerScore,
  scoreToPar,
  holesCompleted,
  holeCount,
  players,
  onPress,
}: RoundCardProps) {
  const teeLabel = teeboxName ? `${teeboxName} tees` : "";
  const dateLabel = formatDisplayDate(date);
  const subtitle = [teeLabel, dateLabel].filter(Boolean).join(" \u00B7 ");
  const showHoles =
    holesCompleted != null && holeCount != null && holesCompleted < holeCount;

  const hasBadge =
    playerStatus === "withdrew" ||
    playerStatus === "incomplete" ||
    playerStatus === "completed";

  return (
    <View style={styles.cardOuter}>
      {/* Navigation tap target */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      >
        {/* Row 1: course name (+ spacer when badge present) */}
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.courseName}>{courseName}</Text>
            {courseNameSub ? (
              <Text style={styles.courseNameSub}>{courseNameSub}</Text>
            ) : null}
          </View>
          {hasBadge && <View style={styles.badgeSpacer} />}
        </View>

        {/* Row 2: player avatars */}
        {players && players.length > 0 && (
          <View style={styles.avatarRow}>
            <PlayerAvatarRow players={players} size={30} overlap={6} />
          </View>
        )}

        {/* Row 3: tees · date | score + holes */}
        <View style={styles.cardBottomRow}>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
          <View style={styles.scoreContainer}>
            {showHoles && (
              <Text style={styles.holesText}>
                {holesCompleted} of {holeCount} holes
              </Text>
            )}
            {playerScore != null && (
              <Text style={styles.scoreTotal}>{playerScore}</Text>
            )}
            {playerScore != null && scoreToPar != null && (
              <Text
                style={[
                  styles.scoreToPar,
                  {
                    color:
                      scoreToPar > 0
                        ? Color.warning
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
        </View>
      </Pressable>

      {/* Badge overlay — outside the Pressable so Tooltip long-press works */}
      {playerStatus === "withdrew" && (
        <View style={styles.badgeOverlay}>
          <StyledTooltip title="Withdrew">
            <View>
              <MaterialIcons name="block" size={30} color={Color.danger} />
            </View>
          </StyledTooltip>
        </View>
      )}
      {playerStatus === "incomplete" && (
        <View style={styles.badgeOverlay}>
          <StyledTooltip title="Incomplete">
            <View>
              <MaterialIcons name="warning" size={30} color={Color.warning} />
            </View>
          </StyledTooltip>
        </View>
      )}
      {playerStatus === "completed" && (
        <View style={styles.badgeOverlay}>
          <StyledTooltip title="Completed">
            <View style={styles.completedBadge}>
              <Feather name="check" size={16} color={Color.white} />
            </View>
          </StyledTooltip>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    marginBottom: Space.sm,
  },
  card: {
    padding: Space.lg,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseName: {
    fontFamily: Font.bold,
    fontSize: 20,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  courseNameSub: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginTop: 2,
  },
  avatarRow: {
    marginTop: Space.sm,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Space.xs,
  },
  cardSubtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    textTransform: "capitalize",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  scoreTotal: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.neutral900,
  },
  scoreToPar: {
    fontFamily: Font.semiBold,
    fontSize: 14,
  },
  holesText: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Color.neutral400,
  },
  badgeSpacer: {
    width: 30,
    height: 30,
  },
  badgeOverlay: {
    position: "absolute",
    top: Space.lg,
    right: Space.lg,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
