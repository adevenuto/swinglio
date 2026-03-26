import { Color, Font, Radius, Space } from "@/constants/design-tokens";
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
        name="map-marker-outline"
        size={16}
        color={Color.primary}
      />
      {loading ? (
        <ActivityIndicator size={12} color={Color.primary} />
      ) : (
        <Text style={styles.text}>
          {displayValue} {label} to pin
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Space.xs,
    marginTop: Space.sm,
    backgroundColor: Color.primaryLight,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs + 2,
    borderRadius: Radius.lg,
  },
  text: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.primary,
  },
});
