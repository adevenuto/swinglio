import { Color, Font, Space } from "@/constants/design-tokens";
import { usePreferences } from "@/contexts/preferences-context";
import { unitLabel, yardsToUnit } from "@/lib/geo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  distanceYards: number | null;
  loading: boolean;
};

export default function DistanceBadge({ distanceYards, loading }: Props) {
  const { distanceUnit } = usePreferences();

  if (!loading && distanceYards == null) return null;

  const displayValue =
    distanceYards != null ? yardsToUnit(distanceYards, distanceUnit) : null;
  const label = unitLabel(distanceUnit);

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="crosshairs-gps"
        size={14}
        color={Color.accentDark}
      />
      {loading ? (
        <ActivityIndicator size={12} color={Color.accentDark} />
      ) : (
        <Text style={styles.text}>
          {displayValue} {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    marginTop: Space.xs,
  },
  text: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.accentDark,
  },
});
