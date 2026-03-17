import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { formatHandicapIndex } from "@/lib/handicap";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

type HandicapHeroProps = {
  handicapIndex: number | null;
  subtitle?: string;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function HandicapHero({
  handicapIndex,
  subtitle,
  onClose,
  style,
}: HandicapHeroProps) {
  return (
    <View style={[styles.container, style]}>
      {onClose && (
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed ? { opacity: 0.7 } : undefined,
          ]}
          hitSlop={12}
        >
          <Feather name="x" size={22} color={Color.white} />
        </Pressable>
      )}

      <View style={styles.row}>
        <MaterialCommunityIcons
          name="golf-tee"
          size={22}
          color={Color.white}
          style={styles.icon}
        />
        <Text style={styles.label}>HANDICAP INDEX</Text>
      </View>

      <Text style={styles.value}>{formatHandicapIndex(handicapIndex)}</Text>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.primary,
    borderRadius: Radius.md,
    padding: Space.xl,
    ...Shadow.sm,
  },
  closeBtn: {
    position: "absolute",
    top: Space.lg,
    right: Space.lg,
    zIndex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.sm,
  },
  icon: {
    marginRight: Space.sm,
  },
  label: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
  },
  value: {
    fontFamily: Font.bold,
    fontSize: 44,
    lineHeight: 52,
    color: Color.white,
    marginBottom: Space.xs,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
});
