import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import { ActiveRound } from "@/hooks/use-active-rounds";
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
      <Text style={styles.sectionLabel}>Active Rounds</Text>
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
            <Text
              variant="titleMedium"
              style={styles.courseName}
            >
              {round.courses?.name || "Unknown Course"}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Active
              </Text>
            </View>
          </View>
          <Text
            variant="bodyMedium"
            style={styles.subtitle}
          >
            {round.courses?.name}
            {(round.teebox_data as any)?.name
              ? ` · ${(round.teebox_data as any).name} tees`
              : ""}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.sm,
    textTransform: "uppercase",
  },
  card: {
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Color.neutral300,
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
  courseName: {
    fontWeight: "700",
    color: Color.neutral900,
    flex: 1,
    textTransform: "capitalize",
  },
  badge: {
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Color.primaryBorder,
    backgroundColor: Color.primaryLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Color.primary,
  },
  subtitle: {
    color: Color.neutral500,
    marginTop: Space.xs,
    textTransform: "capitalize",
  },
});
