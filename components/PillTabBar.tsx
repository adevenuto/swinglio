import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const PILL_TAB_BAR_OFFSET = 120;

export default function PillTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.outer, { bottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          // Skip hidden tabs (e.g. editor for non-editors)
          const itemStyle = options.tabBarItemStyle as { display?: string } | undefined;
          if (itemStyle?.display === "none") return null;

          const isFocused = state.index === index;

          const onPress = () => {
            if (Platform.OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const color = isFocused ? "#fff" : "#999";
          const badge = options.tabBarBadge;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : undefined}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              style={[styles.tab, isFocused && styles.tabActive]}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color,
                size: 24,
              })}
              {badge != null && (
                <View style={[styles.badge, route.name === "dashboard" && styles.badgeGreen]}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 36,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    width: 62,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#404040",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeGreen: {
    backgroundColor: "#22c55e",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 13,
  },
});
