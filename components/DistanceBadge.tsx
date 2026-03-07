import { Color, Font, Space } from "@/constants/design-tokens";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  distanceYards: number | null;
  loading: boolean;
};

export default function DistanceBadge({ distanceYards, loading }: Props) {
  if (!loading && distanceYards == null) return null;

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
        <Text style={styles.text}>{distanceYards} yd</Text>
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
