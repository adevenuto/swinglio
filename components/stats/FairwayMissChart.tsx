import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  hitPct: number;
  leftPct: number;
  rightPct: number;
  totalTracked: number;
};

export default function FairwayMissChart({
  hitPct,
  leftPct,
  rightPct,
  totalTracked,
}: Props) {
  const otherPct = Math.max(0, Math.round((100 - hitPct - leftPct - rightPct) * 10) / 10);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.pct, { color: Color.danger }]}>{leftPct}%</Text>
          <Text style={styles.label}>Left</Text>
        </View>
        <View style={styles.centerStat}>
          <Text style={[styles.pct, styles.hitPct]}>{hitPct}%</Text>
          <Text style={styles.label}>Fairway</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.pct, { color: Color.warning }]}>{rightPct}%</Text>
          <Text style={styles.label}>Right</Text>
        </View>
      </View>
      {otherPct > 0 && (
        <Text style={styles.otherText}>
          {otherPct}% short/long · {totalTracked} holes tracked
        </Text>
      )}
      {otherPct === 0 && (
        <Text style={styles.otherText}>{totalTracked} holes tracked</Text>
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
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: Space.md,
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  centerStat: {
    alignItems: "center",
    flex: 1,
    paddingVertical: Space.md,
    backgroundColor: Color.primaryLight,
    borderRadius: Radius.md,
    marginHorizontal: Space.sm,
  },
  pct: {
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Color.neutral900,
  },
  hitPct: {
    color: Color.primary,
  },
  label: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: Space.xs,
  },
  otherText: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Color.neutral400,
    textAlign: "center",
  },
});
