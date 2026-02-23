// === Per-hole stat types ===

export type FairwayResult = "hit" | "left" | "right" | null;

export type BunkerEntry = {
  type: "greenside" | "fairway";
};

export type PenaltyEntry = {
  type: "water" | "ob" | "unplayable";
};

export type HoleStats = {
  fairway: FairwayResult;
  putts: number | null;
  gir: boolean | null;
  bunkers: BunkerEntry[];
  penalties: PenaltyEntry[];
};

// === Hole and score_details types ===

export type HoleData = {
  par: string;
  length: string;
  score: string;
  handicap?: number;
  stats?: HoleStats;
};

export type ScoreDetails = {
  name: string;
  holes: Record<string, HoleData>;
  inProxs?: boolean;
  inSkins?: boolean;
};

// === Helpers ===

export function createDefaultHoleStats(): HoleStats {
  return {
    fairway: null,
    putts: null,
    gir: null,
    bunkers: [],
    penalties: [],
  };
}

/**
 * GIR = true when the player reached the green in regulation.
 * Formula: (score - putts) <= (par - 2)
 * Returns null if score or putts is missing.
 */
export function calculateGIR(
  score: string | number,
  putts: number | null,
  par: string | number,
): boolean | null {
  const s = typeof score === "string" ? parseInt(score, 10) : score;
  const p = typeof par === "string" ? parseInt(par, 10) : par;
  if (isNaN(s) || isNaN(p) || putts === null) return null;
  return s - putts <= p - 2;
}
