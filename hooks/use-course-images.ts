import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { Alert } from "react-native";

export type CourseImage = {
  id: number;
  course_id: number;
  image_url: string;
  is_featured: boolean;
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
};

const MAX_IMAGES = 3;

export function useCourseImages() {
  const { user } = useAuth();

  const fetchImages = useCallback(async (courseId: number): Promise<CourseImage[]> => {
    const { data, error } = await supabase
      .from("course_images")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("Failed to fetch course images:", error.message);
      return [];
    }
    return (data ?? []) as CourseImage[];
  }, []);

  const uploadImage = useCallback(
    async (courseId: number, uri: string): Promise<CourseImage | null> => {
      if (!user?.id) return null;

      // Check current count
      const existing = await fetchImages(courseId);
      if (existing.length >= MAX_IMAGES) {
        Alert.alert("Limit Reached", `Maximum ${MAX_IMAGES} photos per course.`);
        return null;
      }

      const uuid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const fileName = `${courseId}/${uuid}.jpg`;

      const formData = new FormData();
      formData.append("", {
        uri,
        name: fileName,
        type: "image/jpeg",
      } as any);

      const { error: uploadError } = await supabase.storage
        .from("course-images")
        .upload(fileName, formData, {
          upsert: false,
          contentType: "multipart/form-data",
        });

      if (uploadError) {
        console.error("Course image upload error:", uploadError);
        Alert.alert("Error", `Failed to upload photo: ${uploadError.message}`);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("course-images")
        .getPublicUrl(fileName);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Auto-set featured if it's the first image
      const isFeatured = existing.length === 0;

      const { data: inserted, error: insertError } = await supabase
        .from("course_images")
        .insert({
          course_id: courseId,
          image_url: publicUrl,
          is_featured: isFeatured,
          sort_order: existing.length,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to save course image record:", insertError);
        Alert.alert("Error", "Photo uploaded but failed to save record.");
        return null;
      }

      return inserted as CourseImage;
    },
    [user?.id, fetchImages],
  );

  const deleteImage = useCallback(
    async (imageId: number, imageUrl: string) => {
      // Extract file path from URL (e.g., "{courseId}/{uuid}.jpg")
      const match = imageUrl.match(/course-images\/(.+?)(\?|$)/);
      const filePath = match?.[1];

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("course-images")
          .remove([filePath]);

        if (storageError) {
          console.error("Failed to delete file from storage:", storageError);
        }
      }

      const { error } = await supabase
        .from("course_images")
        .delete()
        .eq("id", imageId);

      if (error) {
        Alert.alert("Error", "Failed to delete image record.");
      }
    },
    [],
  );

  const setFeatured = useCallback(
    async (courseId: number, imageId: number) => {
      // Clear featured on all images for this course
      await supabase
        .from("course_images")
        .update({ is_featured: false })
        .eq("course_id", courseId);

      // Set the chosen one
      await supabase
        .from("course_images")
        .update({ is_featured: true })
        .eq("id", imageId);
    },
    [],
  );

  const getFeaturedUrl = useCallback(
    async (courseId: number): Promise<string | null> => {
      const { data } = await supabase
        .from("course_images")
        .select("image_url")
        .eq("course_id", courseId)
        .eq("is_featured", true)
        .maybeSingle();

      return data?.image_url ?? null;
    },
    [],
  );

  const pickImage = useCallback(
    async (
      source: "camera" | "gallery",
    ): Promise<string | null> => {
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera permission is needed to take photos.");
          return null;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Photo library permission is needed.");
          return null;
        }
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.7,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.7,
            });

      if (result.canceled || !result.assets?.[0]) return null;
      return result.assets[0].uri;
    },
    [],
  );

  return { fetchImages, uploadImage, deleteImage, setFeatured, getFeaturedUrl, pickImage };
}
