import golfImages from "@/assets/images/golf";
import { ImageSourcePropType } from "react-native";

export function getGolfImage(courseId: number) {
  const hash = ((courseId * 2654435761) >>> 0) % golfImages.length;
  return golfImages[hash];
}

export function getCourseImageSource(
  courseId: number,
  featuredUrl?: string | null,
): ImageSourcePropType {
  if (featuredUrl) return { uri: featuredUrl };
  return getGolfImage(courseId);
}
