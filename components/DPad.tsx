import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import { FairwayResult } from "@/types/scoring";
import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

export type DPadValue = "left" | "right" | "long" | "short" | "hit";

type Props = {
  value?: DPadValue | null;
  onControl?: (value: DPadValue) => void;
  disabled?: boolean;
  style?: ViewStyle;
};

function DPadButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        selected ? styles.buttonSelected : styles.buttonDefault,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          selected ? styles.buttonTextSelected : styles.buttonTextDefault,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function DPad({ value, onControl, disabled, style }: Props) {
  const toggle = (v: DPadValue) => {
    onControl?.(v);
  };

  return (
    <View
      style={[styles.container, style]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {/* Row 1: Long */}
      <View style={styles.centerRow}>
        <DPadButton
          label="Long"
          selected={value === "long"}
          onPress={() => toggle("long")}
        />
      </View>

      {/* Row 2: Left | Hit | Right */}
      <View style={styles.middleRow}>
        <DPadButton
          label="Left"
          selected={value === "left"}
          onPress={() => toggle("left")}
        />
        <DPadButton
          label="Hit"
          selected={value === "hit"}
          onPress={() => toggle("hit")}
        />
        <DPadButton
          label="Right"
          selected={value === "right"}
          onPress={() => toggle("right")}
        />
      </View>

      {/* Row 3: Short */}
      <View style={styles.centerRow}>
        <DPadButton
          label="Short"
          selected={value === "short"}
          onPress={() => toggle("short")}
        />
      </View>
    </View>
  );
}

const BUTTON_SIZE = 46;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Space.xs,
  },
  centerRow: {
    alignItems: "center",
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDefault: {
    backgroundColor: Color.neutral100,
  },
  buttonSelected: {
    backgroundColor: Color.primary,
  },
  buttonText: {
    fontFamily: Font.semiBold,
    fontSize: 13,
  },
  buttonTextDefault: {
    color: Color.neutral700,
  },
  buttonTextSelected: {
    color: Color.white,
  },
});
