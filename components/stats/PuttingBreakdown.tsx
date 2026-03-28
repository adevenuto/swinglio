import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  onePuttPct: number | null;
  twoPuttPct: number | null;
  threePuttPlusPct: number | null;
};

const ITEMS: { key: keyof Props; label: string; color: string }[] = [
  { key: "onePuttPct", label: "1-Putt", color: Color.primary },
  { key: "twoPuttPct", label: "2-Putt", color: Color.info },
  { key: "threePuttPlusPct", label: "3-Putt+", color: Color.danger },
];

export default function PuttingBreakdown(props: Props) {
  return (
    <View style={styles.container}>
      {ITEMS.map(({ key, label, color }) => {
        const pct = props[key] ?? 0;
        return (
          <View key={key} style={styles.item}>
            <Text style={[styles.value, { color }]}>{pct}%</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: pct > 0 ? `${pct}%` : 0, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.label}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.lg,
    gap: Space.xl,
    justifyContent: "center",
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: Color.neutral200,
    ...Shadow.sm,
  },
  item: {
    alignItems: "center",
    flex: 1,
  },
  value: {
    fontFamily: Font.bold,
    fontSize: 18,
    marginBottom: Space.sm,
  },
  barTrack: {
    width: "100%",
    height: 80,
    backgroundColor: Color.neutral100,
    borderRadius: Radius.sm,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: Radius.sm,
  },
  label: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: Space.sm,
  },
});
