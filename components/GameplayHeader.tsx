import DistanceBadge from "@/components/DistanceBadge";
import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { usePreferences } from "@/contexts/preferences-context";
import { unitLabel, yardsToUnit } from "@/lib/geo";
import { getCourseImageSource } from "@/utils/golf-image";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type GameplayHeaderProps = {
  courseId: number;
  courseName: string;
  courseNameSub?: string | null;
  featuredImageUrl?: string | null;
  holeCount?: number;
  activeHole?: number;
  par?: string;
  yardage?: string;
  teeboxName?: string;
  subtitle?: string;
  distanceToPin?: number | null;
  distanceLoading?: boolean;
  onDistancePress?: () => void;
  distanceLocked?: boolean;
  onDistanceLockedPress?: () => void;
  connectedBottom?: boolean;
};

export default function GameplayHeader({
  courseId,
  courseName,
  courseNameSub,
  featuredImageUrl,
  holeCount,
  activeHole,
  par,
  yardage,
  teeboxName,
  subtitle,
  distanceToPin,
  distanceLoading,
  onDistancePress,
  distanceLocked,
  onDistanceLockedPress,
  connectedBottom = false,
}: GameplayHeaderProps) {
  const { distanceUnit } = usePreferences();
  const yardageDisplay =
    yardage != null
      ? `${yardsToUnit(Number(yardage), distanceUnit)} ${unitLabel(distanceUnit)}`
      : null;
  const showDistance =
    distanceLoading || (distanceToPin != null && distanceToPin > 0);
  return (
    <View
      style={[
        styles.container,
        connectedBottom && {
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          shadowOpacity: 0,
          elevation: 0,
        },
      ]}
    >
      <Image
        source={getCourseImageSource(courseId, featuredImageUrl)}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.courseName} numberOfLines={1}>
          {courseName}
        </Text>
        {courseNameSub ? (
          <Text style={styles.courseNameSub} numberOfLines={1}>
            - {courseNameSub}
          </Text>
        ) : null}
        {subtitle != null ? (
          <Text style={styles.statsLabel}>{subtitle}</Text>
        ) : activeHole != null ? (
          <Text style={styles.statsLine}>
            <Text style={styles.statsValue}>H{activeHole}</Text>
            {par != null && (
              <>
                <Text style={styles.statsSep}> · </Text>
                <Text style={styles.statsValue}>Par {par}</Text>
              </>
            )}
            {yardageDisplay != null && (
              <>
                <Text style={styles.statsSep}> · </Text>
                <Text style={styles.statsValue}>{yardageDisplay}</Text>
              </>
            )}
            {teeboxName != null && (
              <>
                <Text style={styles.statsSep}> · </Text>
                <Text style={styles.statsValue}>{teeboxName}</Text>
              </>
            )}
          </Text>
        ) : null}
        {distanceLocked ? (
          <Pressable
            onPress={onDistanceLockedPress}
            style={({ pressed }) => [
              styles.distanceRow,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={styles.lockedBadge}>
              <Feather name="lock" size={13} color={Color.primary} />
              <Text style={styles.lockedBadgeText}>Distance to pin</Text>
            </View>
          </Pressable>
        ) : showDistance ? (
          <Pressable
            onPress={onDistancePress}
            disabled={!onDistancePress || distanceToPin == null}
            style={({ pressed }) => [
              styles.distanceRow,
              pressed && onDistancePress && { opacity: 0.7 },
            ]}
          >
            <DistanceBadge
              distanceYards={distanceToPin ?? null}
              loading={!!distanceLoading}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    gap: Space.lg,
    ...Shadow.sm,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  courseName: {
    fontFamily: Font.bold,
    fontSize: 20,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  courseNameSub: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginTop: 2,
  },
  statsLine: {
    fontSize: 15,
    color: Color.neutral500,
    marginTop: 4,
  },
  statsLabel: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
  },
  statsSep: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral400,
  },
  statsValue: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.neutral500,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    marginTop: 2,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Space.xs,
    marginTop: Space.sm,
    backgroundColor: Color.primaryLight,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs + 2,
    borderRadius: Radius.lg,
  },
  lockedBadgeText: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.primary,
  },
});
