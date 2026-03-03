import { Color, Font, Radius, Shadow, Space, Type } from "@/constants/design-tokens";
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
              <Text style={styles.courseName}>
                {round.courses?.name || "Unknown Course"}
              </Text>
              <Text style={styles.subtitle}>
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
                  color={Color.primary}
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
    ...Type.caption,
    marginBottom: Space.sm,
  },
  card: {
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Color.neutral200,
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
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.white,
    borderWidth: 2,
    borderColor: Color.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeLabel: {
    fontFamily: Font.semiBold,
    fontSize: 10,
    color: Color.neutral500,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    textTransform: "capitalize",
  },
});
