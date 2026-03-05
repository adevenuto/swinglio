import { Color, Font, Space } from "@/constants/design-tokens";
import { useAppDrawer } from "@/contexts/app-drawer-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type ScreenHeaderProps = {
  title: string;
};

export default function ScreenHeader({ title }: ScreenHeaderProps) {
  const { openDrawer } = useAppDrawer();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <Pressable
        onPress={openDrawer}
        style={({ pressed }) => [
          styles.menuButton,
          pressed ? { opacity: 0.7 } : undefined,
        ]}
      >
        <MaterialCommunityIcons
          name="dots-grid"
          size={30}
          color={Color.neutral100}
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
    paddingVertical: Space.md,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Color.neutral900,
  },
  menuButton: {
    padding: Space.sm,
  },
});
