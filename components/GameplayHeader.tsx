import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { getCourseImageSource } from "@/utils/golf-image";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type GameplayHeaderProps = {
  courseId: number;
  courseName: string;
  featuredImageUrl?: string | null;
  holeCount: number;
  activeHole: number;
  par?: string;
  yardage?: string;
  teeboxName?: string;
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
}: GameplayHeaderProps) {
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
        <Text style={styles.holeCount}>{holeCount} Holes</Text>
        <Text style={styles.statsLine}>
          {par != null && (
            <>
              <Text style={styles.statsLabel}>Par: </Text>
              <Text style={styles.statsValue}>{par}</Text>
              <Text style={styles.statsLabel}>{"   "}</Text>
            </>
          )}
          <Text style={styles.statsLabel}>Hole: </Text>
          <Text style={styles.statsValue}>{activeHole}</Text>
          {yardage != null && (
            <>
              <Text style={styles.statsLabel}>{"   "}</Text>
              <Text style={styles.statsValue}>{yardage}</Text>
              <Text style={styles.statsLabel}> yd</Text>
            </>
          )}
          {teeboxName != null && (
            <>
              <Text style={styles.statsLabel}> · </Text>
              <Text style={styles.statsValue}>{teeboxName}</Text>
              <Text style={styles.statsLabel}> Tees</Text>
            </>
          )}
        </Text>
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
    padding: Space.lg,
    gap: Space.lg,
    ...Shadow.sm,
  },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: Radius.sm,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  courseName: {
    fontFamily: Font.semiBold,
    fontSize: 20,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  holeCount: {
    fontFamily: Font.regular,
    fontSize: 17,
    color: Color.neutral500,
    marginTop: 4,
  },
  statsLine: {
    fontSize: 17,
    color: Color.neutral500,
    marginTop: 4,
  },
  statsLabel: {
    fontFamily: Font.regular,
    fontSize: 17,
    color: Color.neutral500,
  },
  statsValue: {
    fontFamily: Font.bold,
    fontSize: 17,
    color: Color.neutral500,
  },
});
