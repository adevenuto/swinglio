import {
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
} from "@/constants/design-tokens";
import { ActiveRound } from "@/hooks/use-active-rounds";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = { rounds: ActiveRound[] };

function formatToPar(toPar: number): string {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

export default function ActiveRoundCard({ rounds }: Props) {
  const router = useRouter();

  if (rounds.length === 0) return null;

  return (
    <View style={{ marginTop: Space.lg }}>
      <Text style={styles.sectionLabel}>In Progress</Text>
      {rounds.map((round) => {
        const teeName = (round.teebox_data as any)?.name;
        const teeLabel = teeName ? `${teeName} tees` : "";
        const scoreLabel =
          round.holesCompleted > 0
            ? `${formatToPar(round.runningToPar)} thru ${round.lastHolePlayed}`
            : "";
        const subtitle = [teeLabel, scoreLabel].filter(Boolean).join(" \u00B7 ");

        // Next hole is lastHolePlayed + 1 (or 1 if nothing played yet)
        const currentHole =
          round.holesCompleted > 0 ? round.lastHolePlayed + 1 : 1;
        const displayHole = Math.min(
          currentHole,
          round.holeCount || 18,
        );

        return (
          <Pressable
            key={round.id}
            onPress={() =>
              router.push({
                pathname: "/gameplay",
                params: { roundId: round.id },
              })
            }
            style={({ pressed }) => [
              styles.card,
              pressed && { opacity: 0.7 },
            ]}
          >
            {/* Live badge */}
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>
                live {"\u00B7"} hole {displayHole} of{" "}
                {round.holeCount || 18}
              </Text>
            </View>

            {/* Course name */}
            <Text style={styles.courseName}>
              {round.courses?.club_name || "Unknown Course"}
            </Text>
            {round.courses?.course_name &&
              round.courses.course_name !== round.courses.club_name && (
                <Text style={styles.courseNameSub}>
                  {round.courses.course_name}
                </Text>
              )}

            {/* Subtitle: tee · score thru hole */}
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : null}

            {/* Continue button */}
            <View style={styles.continueBtn}>
              <Feather name="play" size={14} color={Color.white} />
              <Text style={styles.continueBtnText}>continue round</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },
  card: {
    padding: Space.lg,
    borderWidth: 2,
    borderColor: Color.primary,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    marginBottom: Space.sm,
    ...Shadow.sm,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Color.neutral50,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    marginBottom: Space.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Color.primary,
    marginRight: Space.sm,
  },
  liveBadgeText: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral700,
  },
  courseName: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  courseNameSub: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginTop: Space.xs,
    textTransform: "capitalize",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Color.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
    marginTop: Space.md,
    gap: Space.sm,
  },
  continueBtnText: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.white,
  },
});
