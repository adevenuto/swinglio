import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";

type Props = {
  onPress: () => void;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function GradientButton({
  onPress,
  label,
  disabled,
  loading,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        (pressed || disabled || loading) && { opacity: 0.7 },
      ]}
    >
      <LinearGradient
        colors={Color.primaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, style]}
      >
        {loading ? (
          <ActivityIndicator color={Color.white} />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Space.xl,
  },
  label: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.white,
  },
});
