import { Color, Font, Space } from "@/constants/design-tokens";
import { useAppDrawer } from "@/contexts/app-drawer-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const BRAND_NAME = "Swinglio";

export default function BrandHeader() {
  const { openDrawer } = useAppDrawer();

  return (
    <View style={styles.container}>
      <View style={styles.leftSpacer} />

      <Text style={styles.brandName}>{BRAND_NAME}</Text>

      <Pressable
        onPress={openDrawer}
        style={({ pressed }) => [
          styles.menuButton,
          pressed ? { opacity: 0.7 } : undefined,
        ]}
      >
        <MaterialCommunityIcons
          name="dots-grid"
          size={28}
          color={Color.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.lg,
    height: 48,
    backgroundColor: Color.screenBg,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral200,
  },
  brandName: {
    fontFamily: Font.bold,
    fontSize: 22,
    color: Color.neutral900,
  },
  leftSpacer: {
    width: 40,
  },
  menuButton: {
    padding: Space.sm,
  },
});
