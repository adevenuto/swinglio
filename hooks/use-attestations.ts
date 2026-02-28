import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

export type Attestation = {
  id: number;
  round_id: number;
  attester_id: string;
  created_at: string;
};

export function useAttestations(roundId: string | undefined) {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!roundId) {
      setAttestations([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const { data } = await supabase
      .from("attestations")
      .select("id, round_id, attester_id, created_at")
      .eq("round_id", roundId);

    if (data) setAttestations(data as Attestation[]);
    setIsLoading(false);
  }, [roundId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const attest = useCallback(
    async (attesterId: string): Promise<{ error: string | null }> => {
      if (!roundId) return { error: "No round ID" };

      // Check for existing attestation
      const existing = attestations.find(
        (a) => a.attester_id === attesterId,
      );
      if (existing) return { error: null }; // Already attested

      // Optimistic update
      const optimistic: Attestation = {
        id: Date.now(),
        round_id: parseInt(roundId, 10),
        attester_id: attesterId,
        created_at: new Date().toISOString(),
      };
      const prevAttestations = attestations;
      setAttestations((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("attestations")
        .insert({ round_id: parseInt(roundId, 10), attester_id: attesterId })
        .select()
        .single();

      if (error) {
        setAttestations(prevAttestations);
        return { error: error.message };
      }

      // Replace optimistic with real row
      setAttestations((prev) =>
        prev.map((a) => (a.id === optimistic.id ? (data as Attestation) : a)),
      );

      return { error: null };
    },
    [roundId, attestations],
  );

  return { attestations, isLoading, refresh, attest };
}
