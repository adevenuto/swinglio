import WeatherBadge from "@/components/WeatherBadge";
import { Color, Font, Space } from "@/constants/design-tokens";
import { useAppDrawer } from "@/contexts/app-drawer-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

// const BRAND_NAME = "Swinglio";

export default function BrandHeader() {
  const { openDrawer } = useAppDrawer();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require("@/assets/images/brand.png")} style={styles.logo} resizeMode="contain" />
      </View>

      <WeatherBadge adaptive={false} />

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
    marginBottom: Space.sm,
  },
  brandName: {
    fontFamily: Font.bold,
    fontSize: 22,
    color: Color.neutral900,
  },
  logo: {
    height: 44,
    width: 108,
  },
  logoContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  menuButton: {
    padding: Space.sm,
  },
});
