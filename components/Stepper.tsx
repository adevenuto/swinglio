import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

// === Types ===

type StepperProps = {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: "lg" | "sm";
  direction?: "vertical" | "horizontal";
  disabled?: boolean;
  valueColor?: string;
  style?: ViewStyle;
};

// === Size config ===

const SIZE_CONFIG = {
  lg: {
    buttonSize: 38,
    iconSize: 20,
    valueFontFamily: Font.bold,
    valueFontSize: 26,
    dimOnZero: false,
  },
  sm: {
    buttonSize: 32,
    iconSize: 16,
    valueFontFamily: Font.semiBold,
    valueFontSize: 16,
    dimOnZero: true,
  },
} as const;

// === Stepper ===

export default function Stepper({
  value,
  onIncrement,
  onDecrement,
  size = "lg",
  direction = "vertical",
  disabled = false,
  valueColor,
  style,
}: StepperProps) {
  const config = SIZE_CONFIG[size];

  const btnStyle = {
    width: config.buttonSize,
    height: config.buttonSize,
    borderRadius: config.buttonSize / 2,
    borderWidth: 1,
    borderColor: Color.primary,
    backgroundColor: Color.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  };

  const resolvedValueColor =
    valueColor ??
    (config.dimOnZero && value === 0 ? Color.neutral400 : Color.neutral900);

  const valueElement = (
    <Text
      style={{
        fontFamily: config.valueFontFamily,
        fontSize: config.valueFontSize,
        color: resolvedValueColor,
        minWidth: size === "lg" ? 40 : 20,
        textAlign: "center",
      }}
    >
      {value}
    </Text>
  );

  if (direction === "horizontal") {
    return (
      <View style={[horizontalStyles.container, style]}>
        <Pressable
          onPress={onDecrement}
          disabled={disabled}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        >
          <View style={btnStyle}>
            <Feather name="minus" size={config.iconSize} color={Color.white} />
          </View>
        </Pressable>
        {valueElement}
        <Pressable
          onPress={onIncrement}
          disabled={disabled}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        >
          <View style={btnStyle}>
            <Feather name="plus" size={config.iconSize} color={Color.white} />
          </View>
        </Pressable>
      </View>
    );
  }

  // vertical (primary pill)
  return (
    <View style={[verticalStyles.pill, style]}>
      <Pressable
        onPress={onIncrement}
        disabled={disabled}
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
      >
        <View style={btnStyle}>
          <Feather name="plus" size={config.iconSize} color={Color.white} />
        </View>
      </Pressable>
      {valueElement}
      <Pressable
        onPress={onDecrement}
        disabled={disabled}
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
      >
        <View style={btnStyle}>
          <Feather name="minus" size={config.iconSize} color={Color.white} />
        </View>
      </Pressable>
    </View>
  );
}

// === CountStepperRow ===

type CountStepperRowProps = {
  label: string;
  count: number;
  disabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function CountStepperRow({
  label,
  count,
  disabled,
  onIncrement,
  onDecrement,
}: CountStepperRowProps) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Stepper
        value={count}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        size="sm"
        direction="horizontal"
        disabled={disabled}
      />
    </View>
  );
}

// === Styles ===

const verticalStyles = StyleSheet.create({
  pill: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
    width: 70,
    alignSelf: "stretch",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
    paddingVertical: Space.md,
  },
});

const horizontalStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.lg,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Space.sm,
  },
  label: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral900,
  },
});
