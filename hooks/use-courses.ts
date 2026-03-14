import { supabase } from "@/lib/supabase";
import { useCallback } from "react";

export type CourseRow = {
  id: number;
  club_name: string;
  course_name: string;
  street: string | null;
  state: string | null;
  postal_code: string | null;
  city_id: number | null;
  state_id: number | null;
  layout_data: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  city_name?: string;
  state_abbr?: string;
};

export type CourseFormData = {
  club_name: string;
  course_name: string;
  street: string | null;
  postal_code: string | null;
  city_id: number | null;
  state_id: number | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  layout_data: string | null;
};

export type CityResult = {
  id: number;
  name: string;
  state_id: number;
  state_name: string;
  state_abbr: string;
};

export function useCourses() {
  const fetchCourse = useCallback(async (id: number) => {
    const { data, error } = await supabase
      .from("courses")
      .select(
        "*, cities(name), states(name, abbr)",
      )
      .eq("id", id)
      .single();

    if (error) return { data: null, error: error.message };

    const row: CourseRow = {
      ...data,
      city_name: (data.cities as any)?.name ?? undefined,
      state_abbr: (data.states as any)?.abbr ?? undefined,
    };
    return { data: row, error: null };
  }, []);

  const createCourse = useCallback(async (form: CourseFormData) => {
    // Derive the state text from state_id for the legacy `state` column
    let stateText: string | null = null;
    if (form.state_id) {
      const { data: stateRow } = await supabase
        .from("states")
        .select("abbr")
        .eq("id", form.state_id)
        .single();
      stateText = stateRow?.abbr ?? null;
    }

    const { data, error } = await supabase
      .from("courses")
      .insert({
        club_name: form.club_name,
        course_name: form.course_name,
        street: form.street,
        state: stateText,
        postal_code: form.postal_code,
        city_id: form.city_id,
        state_id: form.state_id,
        phone: form.phone,
        website: form.website,
        lat: form.lat,
        lng: form.lng,
        layout_data: form.layout_data,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }, []);

  const updateCourse = useCallback(
    async (id: number, form: CourseFormData) => {
      let stateText: string | null = null;
      if (form.state_id) {
        const { data: stateRow } = await supabase
          .from("states")
          .select("abbr")
          .eq("id", form.state_id)
          .single();
        stateText = stateRow?.abbr ?? null;
      }

      const { error } = await supabase
        .from("courses")
        .update({
          club_name: form.club_name,
          course_name: form.course_name,
          street: form.street,
          state: stateText,
          postal_code: form.postal_code,
          city_id: form.city_id,
          state_id: form.state_id,
          phone: form.phone,
          website: form.website,
          lat: form.lat,
          lng: form.lng,
          layout_data: form.layout_data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) return { error: error.message };
      return { error: null };
    },
    [],
  );

  const deleteCourse = useCallback(async (id: number) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const checkCourseInUse = useCallback(async (id: number) => {
    const { count, error } = await supabase
      .from("rounds")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id);
    if (error) return { count: 0, error: error.message };
    return { count: count ?? 0, error: null };
  }, []);

  const searchCities = useCallback(async (query: string) => {
    if (query.trim().length < 2) return [];
    const { data, error } = await supabase
      .from("cities")
      .select("id, name, state_id, states(name, abbr)")
      .ilike("name", `%${query.trim()}%`)
      .limit(20);

    if (error || !data) return [];
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      state_id: c.state_id,
      state_name: c.states?.name ?? "",
      state_abbr: c.states?.abbr ?? "",
    })) as CityResult[];
  }, []);

  return {
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    checkCourseInUse,
    searchCities,
  };
}
