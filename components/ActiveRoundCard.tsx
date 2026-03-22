import {
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
} from "@/constants/design-tokens";
import { ActiveRound } from "@/hooks/use-active-rounds";
import Entypo from "@expo/vector-icons/Entypo";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

type Props = { rounds: ActiveRound[] };

export default function ActiveRoundCard({ rounds }: Props) {
  const router = useRouter();

  if (rounds.length === 0) return null;

  return (
    <View style={{ marginTop: Space.lg }}>
      <Text style={styles.sectionLabel}>Activity Feed</Text>
      {rounds.map((round) => (
        <TouchableOpacity
          key={round.id}
          onPress={() =>
            router.push({
              pathname: "/gameplay",
              params: { roundId: round.id },
            })
          }
          style={styles.card}
        >
          <View style={styles.row}>
            <View style={styles.leftColumn}>
              <Text style={styles.courseName}>
                {round.courses?.club_name || "Unknown Course"}
              </Text>
              {round.courses?.course_name &&
                round.courses.course_name !== round.courses.club_name && (
                  <Text style={styles.subtitle}>
                    - {round.courses.course_name}
                  </Text>
                )}
              <Text style={styles.subtitle}>
                {(round.teebox_data as any)?.name
                  ? `${(round.teebox_data as any).name} tees`
                  : ""}
              </Text>
            </View>
            <View style={styles.badgeColumn}>
              <Entypo
                name="chevron-with-circle-right"
                size={32}
                color={Color.primary}
              />
              <Text style={styles.badgeLabel}>Continue</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
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
    borderWidth: 1,
    borderColor: Color.primary,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    marginBottom: Space.sm,
    ...Shadow.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftColumn: {
    flex: 1,
  },
  courseName: {
    fontFamily: Font.bold,
    fontSize: 17,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  badgeColumn: {
    alignItems: "center",
  },
  badgeLabel: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.primary,
    marginTop: 2,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    textTransform: "capitalize",
  },
});
