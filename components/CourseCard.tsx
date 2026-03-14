import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { getCourseImageSource } from "@/utils/golf-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  courseId: number;
  name: string;
  description?: string;
  featuredImageUrl?: string | null;
  missingRatings?: boolean;
  onPress: () => void;
};

export default function CourseCard({
  courseId,
  name,
  description,
  featuredImageUrl,
  missingRatings,
  onPress,
}: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={onPress}
      disabled={missingRatings}
      style={({ pressed }) => [
        styles.card,
        pressed ? { opacity: 0.7 } : undefined,
      ]}
    >
      <View style={[styles.content, missingRatings && styles.contentDimmed]}>
        <Image
          source={getCourseImageSource(courseId, featuredImageUrl)}
          style={styles.image}
        />
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
      </View>
      {missingRatings && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            router.push({
              pathname: "/course-editor",
              params: { courseId },
            });
          }}
          style={({ pressed }) => [
            styles.badge,
            pressed ? { opacity: 0.7 } : undefined,
          ]}
        >
          <MaterialIcons name="edit" size={12} color={Color.white} />
          <Text style={styles.badgeText}>No Rating</Text>
        </Pressable>
      )}
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
    ...Shadow.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Space.md,
  },
  contentDimmed: {
    opacity: 0.55,
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Color.warning,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    marginLeft: Space.sm,
  },
  badgeText: {
    fontFamily: Font.bold,
    fontSize: 11,
    color: Color.white,
  },
});
