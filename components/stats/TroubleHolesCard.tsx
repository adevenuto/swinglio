import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { TroubleHole } from "@/hooks/use-course-history";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  troubleHoles: TroubleHole[];
};

function formatToPar(val: number): string {
  if (val === 0) return "E";
  return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
}

export default function TroubleHolesCard({ troubleHoles }: Props) {
  if (troubleHoles.length === 0) return null;

  return (
    <View style={styles.container}>
      {troubleHoles.map((hole, i) => (
        <View
          key={hole.holeKey}
          style={[styles.holeRow, i < troubleHoles.length - 1 && styles.rowBorder]}
        >
          <View style={styles.holeHeader}>
            <View style={styles.holeBadge}>
              <MaterialCommunityIcons name="flag-triangle" size={14} color={Color.danger} />
              <Text style={styles.holeNumber}>Hole {hole.holeNumber}</Text>
            </View>
            <Text style={styles.avgToPar}>{formatToPar(hole.avgToPar)}</Text>
          </View>

          <View style={styles.pillRow}>
            {hole.avgPutts != null && (
              <View style={styles.pill}>
                <Text style={styles.pillValue}>{hole.avgPutts}</Text>
                <Text style={styles.pillLabel}>Putts</Text>
              </View>
            )}
            {hole.girPct != null && (
              <View style={styles.pill}>
                <Text style={styles.pillValue}>{hole.girPct}%</Text>
                <Text style={styles.pillLabel}>GIR</Text>
              </View>
            )}
            {hole.fairwayMissPct != null && (
              <View style={styles.pill}>
                <Text style={styles.pillValue}>{hole.fairwayMissPct}%</Text>
                <Text style={styles.pillLabel}>FWY Miss</Text>
              </View>
            )}
            {hole.penaltyCount > 0 && (
              <View style={styles.pill}>
                <Text style={styles.pillValue}>{hole.penaltyCount}</Text>
                <Text style={styles.pillLabel}>Penalties</Text>
              </View>
            )}
          </View>
        </View>
      ))}
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
  holeRow: {
    paddingVertical: Space.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral100,
  },
  holeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.sm,
  },
  holeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  holeNumber: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral900,
  },
  avgToPar: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Color.danger,
  },
  pillRow: {
    flexDirection: "row",
    gap: Space.sm,
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: Color.neutral50,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    alignItems: "center",
  },
  pillValue: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.neutral900,
  },
  pillLabel: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Color.neutral500,
  },
});
