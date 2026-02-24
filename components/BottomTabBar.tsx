import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CENTER_BUTTON_SIZE = 64;
const GREEN_ACCENT = "#16a34a";

export default function BottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // Skip hidden tabs (e.g. editor for non-editors)
        const itemStyle = options.tabBarItemStyle as
          | { display?: string }
          | undefined;
        if (itemStyle?.display === "none") return null;

        const isFocused = state.index === index;
        const isCenter = route.name === "dashboard";

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

        const badge = options.tabBarBadge;
        const label = options.title ?? route.name;

        if (isCenter) {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : undefined}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              style={styles.centerWrapper}
            >
              <View style={styles.centerButton}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: "#fff",
                  size: 30,
                })}
                {badge != null && (
                  <View style={[styles.badge, styles.badgeGreen]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.label, isFocused && styles.labelActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        }

        const color = isFocused ? "#1a1a1a" : "#999";

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : undefined}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            style={styles.tab}
          >
            <View>
              {options.tabBarIcon?.({
                focused: isFocused,
                color,
                size: 24,
              })}
              {badge != null && (
                <View style={[styles.badge, styles.badgeRed]}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    overflow: "visible",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
  },
  centerButton: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: GREEN_ACCENT,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  labelActive: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeRed: {
    backgroundColor: "#dc2626",
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
