import { supabase } from "@/lib/supabase";
import { Teebox } from "@/hooks/use-course-search";
import { GameConfig } from "@/lib/game-config";
import { useCallback, useState } from "react";

export type League = {
  id: number;
  course_id: number;
  teebox_data: Teebox;
  game_config: GameConfig | null;
  created_at: string;
  courses: { name: string };
};

export function useLeagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("leagues")
      .select("*, courses(name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLeagues(data as League[]);
    }
    setIsLoading(false);
  }, []);

  return { leagues, isLoading, refresh };
}
