import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import { ActiveRound } from "@/hooks/use-active-rounds";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
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
              <Text variant="titleMedium" style={styles.courseName}>
                {round.courses?.name || "Unknown Course"}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {round.courses?.name}
                {(round.teebox_data as any)?.name
                  ? ` · ${(round.teebox_data as any).name} tees`
                  : ""}
              </Text>
            </View>
            <View style={styles.badgeColumn}>
              <View style={styles.badge}>
                <MaterialCommunityIcons
                  name="golf-cart"
                  size={22}
                  color="#22c55e"
                />
              </View>
              <Text style={styles.badgeLabel}>Play now</Text>
            </View>
          </View>
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
  leftColumn: {
    flex: 1,
  },
  courseName: {
    fontWeight: "700",
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  badgeColumn: {
    alignItems: "center",
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.white,
    borderWidth: 2,
    borderColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Color.neutral500,
    marginTop: 2,
  },
  subtitle: {
    color: Color.neutral500,
    textTransform: "capitalize",
  },
});
