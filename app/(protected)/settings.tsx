import { Color, Font, Space } from "@/constants/design-tokens";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={28} color={Color.neutral900} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  navRow: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.md,
  },
  backText: {
    fontFamily: Font.regular,
    fontSize: 16,
    color: Color.neutral900,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Color.neutral900,
    textAlign: "center",
    marginBottom: Space.xs,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 16,
    color: Color.neutral500,
    textAlign: "center",
    marginBottom: Space.xl,
  },
});
