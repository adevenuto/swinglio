import DistanceBadge from "@/components/DistanceBadge";
import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { usePreferences } from "@/contexts/preferences-context";
import { unitLabel, yardsToUnit } from "@/lib/geo";
import { getCourseImageSource } from "@/utils/golf-image";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type GameplayHeaderProps = {
  courseId: number;
  courseName: string;
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
};

export default function GameplayHeader({
  courseId,
  courseName,
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
}: GameplayHeaderProps) {
  const { distanceUnit } = usePreferences();
  const yardageDisplay =
    yardage != null
      ? `${yardsToUnit(Number(yardage), distanceUnit)} ${unitLabel(distanceUnit)}`
      : null;
  const showDistance =
    distanceLoading || (distanceToPin != null && distanceToPin > 0);
  return (
    <View style={styles.container}>
      <Image
        source={getCourseImageSource(courseId, featuredImageUrl)}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.courseName} numberOfLines={1}>
          {courseName}
        </Text>
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
        {showDistance && (
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.md,
    gap: Space.md,
    ...Shadow.sm,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  courseName: {
    fontFamily: Font.semiBold,
    fontSize: 17,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  statsLine: {
    fontSize: 14,
    color: Color.neutral500,
    marginTop: 2,
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
});
