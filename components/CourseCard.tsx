import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { getCourseImageSource } from "@/utils/golf-image";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  courseId: number;
  name: string;
  description?: string;
  featuredImageUrl?: string | null;
  onPress: () => void;
};

export default function CourseCard({
  courseId,
  name,
  description,
  featuredImageUrl,
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={getCourseImageSource(courseId, featuredImageUrl)} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {name}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Space.md,
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    marginBottom: Space.sm,
    gap: Space.md,
    ...Shadow.sm,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
    resizeMode: "cover",
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: Font.semiBold,
    fontSize: 16,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  description: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: 2,
  },
});
