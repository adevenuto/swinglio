import AdaptiveText from "@/components/AdaptiveText";
import UserAvatar from "@/components/UserAvatar";
import { Color, Font, Space } from "@/constants/design-tokens";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Svg, { Circle } from "react-native-svg";

export type StatItem = {
  key: string;
  value: string;
  label: string;
  subtitle?: string; // small text rendered below value inside badge
  progress?: number; // 0–100; if present, renders SVG progress ring
};

type Props = {
  items: StatItem[];
  avatarUrl?: string | null;
  displayName?: string | null;
  onAvatarPress?: () => void;
  onItemPress?: (key: string) => void;
};

const CIRCLE_SIZE = 68;
const AVATAR_SIZE = 78;
const STROKE_WIDTH = 3;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2; // 26.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressRing({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, progress));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.progressSvg}>
      {/* Track */}
      <Circle
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={RADIUS}
        stroke={Color.neutral200}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      {/* Filled arc */}
      <Circle
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={RADIUS}
        stroke={Color.primary}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeDasharray={`${CIRCUMFERENCE}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
      />
    </Svg>
  );
}

export default function StatsStrip({
  items,
  avatarUrl,
  displayName,
  onAvatarPress,
  onItemPress,
}: Props) {
  // Split displayName into firstName/lastName for initials
  const nameParts = displayName?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0] ?? null;
  const lastName =
    nameParts.length > 1
      ? nameParts[nameParts.length - 1].replace(".", "")
      : null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {/* Avatar — first item */}
      <Pressable
        onPress={onAvatarPress}
        style={({ pressed }) => [
          styles.item,
          pressed ? { opacity: 0.7 } : undefined,
        ]}
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          firstName={firstName}
          lastName={lastName}
          size={AVATAR_SIZE}
        />
      </Pressable>

      {/* Stat badges */}
      {items.map((item) => {
        const content = (
          <>
            <View style={styles.badgeWrapper}>
              {item.progress != null ? (
                <>
                  <ProgressRing progress={item.progress} />
                  <View style={styles.valueOverlay}>
                    <Text style={styles.progressValue}>{item.value}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.plainBadge}>
                  <Text style={styles.plainValue}>{item.value}</Text>
                  {item.subtitle ? (
                    <Text style={styles.badgeSubtitle}>{item.subtitle}</Text>
                  ) : null}
                </View>
              )}
            </View>
            <AdaptiveText style={styles.label}>{item.label}</AdaptiveText>
          </>
        );

        return onItemPress ? (
          <Pressable
            key={item.key}
            onPress={() => onItemPress(item.key)}
            style={({ pressed }) => [
              styles.item,
              pressed ? { opacity: 0.7 } : undefined,
            ]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={item.key} style={styles.item}>
            {content}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingLeft: Space.lg,
    paddingRight: Space.lg,
    paddingVertical: Space.lg,
    gap: Space.md,
    alignItems: "flex-start",
  },
  item: {
    alignItems: "center",
  },
  badgeWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  plainBadge: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderWidth: 3,
    borderColor: Color.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  plainValue: {
    fontFamily: Font.bold,
    fontSize: 20,
    color: Color.neutral900,
  },
  badgeSubtitle: {
    fontFamily: Font.medium,
    fontSize: 11,
    color: Color.neutral500,
    marginTop: -1,
  },
  progressSvg: {
    position: "absolute",
  },
  valueOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressValue: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Color.neutral900,
  },
  label: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.neutral300,
    marginTop: Space.xs,
    textAlign: "center",
  },
});
