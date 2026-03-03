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
  variant?: "primary" | "outline";
  direction?: "vertical" | "horizontal";
  disabled?: boolean;
  valueColor?: string;
  style?: ViewStyle;
};

// === Variant config ===

const VARIANT_CONFIG = {
  primary: {
    buttonSize: 40,
    buttonBg: Color.primary,
    buttonBorder: Color.primary,
    pressedBg: "#0E4528",
    iconColor: Color.white,
    iconSize: 20,
    valueFontFamily: Font.bold,
    valueFontSize: 32,
    defaultValueColor: Color.neutral900,
    dimOnZero: false,
  },
  outline: {
    buttonSize: 32,
    buttonBg: Color.white,
    buttonBorder: Color.neutral300,
    pressedBg: Color.neutral100,
    iconColor: Color.neutral900,
    iconSize: 16,
    valueFontFamily: Font.semiBold,
    valueFontSize: 16,
    defaultValueColor: Color.neutral900,
    dimOnZero: true,
  },
} as const;

// === Stepper ===

export default function Stepper({
  value,
  onIncrement,
  onDecrement,
  variant = "primary",
  direction = "vertical",
  disabled = false,
  valueColor,
  style,
}: StepperProps) {
  const config = VARIANT_CONFIG[variant];
  const btnStyles = BUTTON_STYLES[variant];

  const resolvedValueColor =
    valueColor ??
    (config.dimOnZero && value === 0
      ? Color.neutral400
      : config.defaultValueColor);

  const valueElement = (
    <Text
      style={{
        fontFamily: config.valueFontFamily,
        fontSize: config.valueFontSize,
        color: resolvedValueColor,
        minWidth: variant === "primary" ? 40 : 20,
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
          <View style={btnStyles.base}>
            <Feather
              name="minus"
              size={config.iconSize}
              color={config.iconColor}
            />
          </View>
        </Pressable>
        {valueElement}
        <Pressable
          onPress={onIncrement}
          disabled={disabled}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        >
          <View style={btnStyles.base}>
            <Feather
              name="plus"
              size={config.iconSize}
              color={config.iconColor}
            />
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
        <View style={btnStyles.base}>
          <Feather
            name="plus"
            size={config.iconSize}
            color={config.iconColor}
          />
        </View>
      </Pressable>
      {valueElement}
      <Pressable
        onPress={onDecrement}
        disabled={disabled}
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
      >
        <View style={btnStyles.base}>
          <Feather
            name="minus"
            size={config.iconSize}
            color={config.iconColor}
          />
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
        variant="outline"
        direction="horizontal"
        disabled={disabled}
      />
    </View>
  );
}

// === Styles ===

const primaryButtonStyles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Color.primary,
    backgroundColor: Color.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});

const outlineButtonStyles = StyleSheet.create({
  base: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
    justifyContent: "center",
    alignItems: "center",
  },
});

const BUTTON_STYLES = {
  primary: primaryButtonStyles,
  outline: outlineButtonStyles,
};

const verticalStyles = StyleSheet.create({
  pill: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-around",
    width: 58,
    minHeight: 120,
    // margin: "auto",
    alignSelf: "stretch",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
    paddingVertical: Space.sm,
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
