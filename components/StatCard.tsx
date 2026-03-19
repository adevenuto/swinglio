import { Color, Font, Radius, Shadow, Space, Type } from "@/constants/design-tokens";
import { Feather, MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type IconFamily = "Feather" | "MaterialIcons" | "MaterialCommunityIcons" | "FontAwesome5";

type StatCardProps = {
  label: string;
  value: string;
  valueColor?: string;
  icon?: { family: IconFamily; name: string };
  barPercent?: number;
  barColor?: string;
  subtitle?: string;
  /** Compact tile mode for 2×2 grid — centers value + label, no icon/header row */
  compact?: boolean;
};

function StatIcon({ family, name }: { family: IconFamily; name: string }) {
  const props = { name: name as any, size: 20, color: Color.primary };
  switch (family) {
    case "Feather":
      return <Feather {...props} />;
    case "MaterialIcons":
      return <MaterialIcons {...props} />;
    case "MaterialCommunityIcons":
      return <MaterialCommunityIcons {...props} />;
    case "FontAwesome5":
      return <FontAwesome5 {...props} />;
  }
}

export default function StatCard({
  label,
  value,
  valueColor,
  icon,
  barPercent,
  barColor = Color.primary,
  subtitle,
  compact,
}: StatCardProps) {
  if (compact) {
    return (
      <View style={styles.tileCard}>
        <Text style={[styles.tileValue, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </Text>
        <Text style={styles.tileLabel}>{label}</Text>
        {barPercent != null && (
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(barPercent, 100)}%`, backgroundColor: barColor },
              ]}
            />
          </View>
        )}
        {subtitle ? <Text style={styles.tileSub}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {icon && <StatIcon family={icon.family} name={icon.name} />}
      </View>

      <Text style={[styles.value, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>

      {barPercent != null && (
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(barPercent, 100)}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      )}

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Full-width card ──
  card: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.xl,
    marginBottom: Space.md,
    ...Shadow.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Space.sm,
  },
  label: {
    ...Type.caption,
  },
  value: {
    fontFamily: Font.bold,
    fontSize: 36,
    lineHeight: 42,
    color: Color.neutral900,
    marginBottom: Space.sm,
  },
  subtitle: {
    ...Type.bodySm,
    color: Color.neutral500,
  },

  // ── Compact tile (2×2 grid) ──
  tileCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
    ...Shadow.sm,
  },
  tileValue: {
    fontFamily: Font.bold,
    fontSize: 32,
    lineHeight: 38,
    color: Color.neutral900,
  },
  tileLabel: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: Space.xs,
  },
  tileSub: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Color.neutral400,
    marginTop: 2,
  },

  // ── Shared bar ──
  barTrack: {
    height: 6,
    backgroundColor: Color.neutral200,
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
    marginTop: Space.sm,
    marginBottom: Space.xs,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
