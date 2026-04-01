import { ScoreDetails } from "@/types/scoring";
import {
  HandicapDifferential,
  HandicapEligibleRound,
  HandicapResult,
} from "@/types/handicap";

// === WHS-Style Handicap Calculations ===
// Pure functions — no Supabase calls.
//
// Future enhancements (not implemented):
// - PCC (Playing Conditions Calculation)
// - Soft/Hard Cap
// - Exceptional Score Reduction (ESR)
// - Iterative NDB refinement (two-pass)

// --- Differential table ---
// Maps eligible round count (3–20) → { used: number of lowest to pick, adjustment: offset }

type DifferentialEntry = { used: number; adjustment: number };

export const DIFFERENTIAL_TABLE: Record<number, DifferentialEntry> = {
  3: { used: 1, adjustment: -2.0 },
  4: { used: 1, adjustment: -1.0 },
  5: { used: 1, adjustment: 0 },
  6: { used: 2, adjustment: -1.0 },
  7: { used: 2, adjustment: 0 },
  8: { used: 2, adjustment: 0 },
  9: { used: 3, adjustment: 0 },
  10: { used: 3, adjustment: 0 },
  11: { used: 3, adjustment: 0 },
  12: { used: 4, adjustment: 0 },
  13: { used: 4, adjustment: 0 },
  14: { used: 4, adjustment: 0 },
  15: { used: 5, adjustment: 0 },
  16: { used: 5, adjustment: 0 },
  17: { used: 6, adjustment: 0 },
  18: { used: 6, adjustment: 0 },
  19: { used: 7, adjustment: 0 },
  20: { used: 8, adjustment: 0 },
};

/**
 * Calculate Course Handicap from Handicap Index.
 * CH = round(HI × (slope / 113) + (courseRating − par))
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slope: number,
  courseRating: number,
  par: number,
): number {
  return Math.round(handicapIndex * (slope / 113) + (courseRating - par));
}

/**
 * Calculate Net Double Bogey (NDB) cap for a single hole.
 * strokesReceived = floor(CH / 18) + (strokeIndex <= CH % 18 ? 1 : 0)
 * NDB = par + 2 + strokesReceived
 */
export function calculateNDB(
  par: number,
  strokeIndex: number,
  courseHandicap: number,
): number {
  const base = Math.floor(courseHandicap / 18);
  const remainder = courseHandicap % 18;
  const extra = strokeIndex <= remainder ? 1 : 0;
  const strokesReceived = base + extra;
  return par + 2 + strokesReceived;
}

/**
 * Compute per-hole stroke allocation for a given course handicap.
 * Returns an array of 18 entries (indexed 0–17 for SI 1–18).
 * Each entry is the number of strokes that hole receives.
 */
export function computeStrokeAllocation(
  courseHandicap: number,
  holeCount: number = 18,
): number[] {
  const base = Math.floor(courseHandicap / holeCount);
  const remainder = courseHandicap % holeCount;
  const allocation: number[] = [];
  for (let si = 1; si <= holeCount; si++) {
    allocation.push(base + (si <= remainder ? 1 : 0));
  }
  return allocation;
}

/**
 * Calculate Adjusted Gross Score (AGS) from hole-by-hole score_details.
 *
 * If handicapIndex is null or holes lack stroke index data, raw gross score
 * is returned without NDB adjustments (matching WHS for new/unknown players).
 */
export function calculateAGS(
  scoreDetails: ScoreDetails,
  courseRating: number,
  slope: number,
  par: number,
  handicapIndex: number | null,
): {
  adjustedGrossScore: number;
  grossScore: number;
  wasAdjusted: boolean;
  hasStrokeIndex: boolean;
} {
  const holeKeys = Object.keys(scoreDetails.holes).sort((a, b) => {
    const numA = parseInt(a.replace("hole-", ""), 10);
    const numB = parseInt(b.replace("hole-", ""), 10);
    return numA - numB;
  });

  // Check if stroke index data is present
  const hasStrokeIndex = holeKeys.some(
    (k) => scoreDetails.holes[k].handicap != null,
  );

  let grossScore = 0;
  let adjustedGrossScore = 0;
  let wasAdjusted = false;

  // Calculate course handicap if we have what we need
  const courseHandicap =
    handicapIndex != null && hasStrokeIndex
      ? calculateCourseHandicap(handicapIndex, slope, courseRating, par)
      : null;

  for (const key of holeKeys) {
    const hole = scoreDetails.holes[key];
    const score = parseInt(hole.score, 10);
    if (isNaN(score)) continue;

    const holePar = parseInt(hole.par, 10);
    grossScore += score;

    if (courseHandicap != null && hole.handicap != null) {
      const ndb = calculateNDB(holePar, hole.handicap, courseHandicap);
      const adjusted = Math.min(score, ndb);
      adjustedGrossScore += adjusted;
      if (adjusted < score) wasAdjusted = true;
    } else {
      adjustedGrossScore += score;
    }
  }

  return { adjustedGrossScore, grossScore, wasAdjusted, hasStrokeIndex };
}

/**
 * Calculate a single handicap differential.
 * differential = ((AGS − courseRating) × 113) / slope
 */
export function calculateDifferential(
  adjustedGrossScore: number,
  courseRating: number,
  slope: number,
): number {
  return ((adjustedGrossScore - courseRating) * 113) / slope;
}

/**
 * Build a human-readable method description string.
 */
export function getMethodDescription(
  eligibleCount: number,
  usedCount: number,
  adjustment: number,
): string {
  const capped = Math.min(eligibleCount, 20);
  const adjStr =
    adjustment !== 0
      ? ` (${adjustment > 0 ? "+" : ""}${adjustment.toFixed(1)} adj.)`
      : "";
  return `Lowest ${usedCount} of ${capped === eligibleCount ? eligibleCount : `last ${capped}`}${adjStr}`;
}

/**
 * Calculate the Handicap Index from an array of eligible rounds.
 *
 * - Takes the most recent 20 rounds (sorted by datePlayed desc)
 * - Picks the N lowest differentials per the WHS table
 * - Averages them, applies adjustment, rounds to 1 decimal
 * - Returns null handicapIndex if fewer than 3 eligible rounds
 */
export function calculateHandicapIndex(
  eligibleRounds: HandicapEligibleRound[],
): HandicapResult {
  const now = new Date().toISOString();

  if (eligibleRounds.length < 3) {
    return {
      handicapIndex: null,
      differentials: eligibleRounds.map((r) => ({
        roundId: r.roundId,
        datePlayed: r.datePlayed,
        differential: r.differential,
        isUsed: false,
      })),
      eligibleCount: eligibleRounds.length,
      usedCount: 0,
      excludedRounds: [],
      methodDescription:
        eligibleRounds.length === 0
          ? "No eligible rounds"
          : `Need ${3 - eligibleRounds.length} more eligible round${3 - eligibleRounds.length > 1 ? "s" : ""}`,
      lastUpdated: now,
      trend: null,
    };
  }

  // Sort by date descending, break ties by roundId descending for determinism
  const sorted = [...eligibleRounds].sort((a, b) => {
    const dateDiff =
      new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.roundId - a.roundId;
  });
  const recent = sorted.slice(0, 20);
  const count = recent.length;

  // Look up table entry (clamp to 20)
  const tableEntry = DIFFERENTIAL_TABLE[Math.min(count, 20)];
  const { used, adjustment } = tableEntry;

  // Sort by differential ascending to pick lowest N
  const byDiff = [...recent].sort((a, b) => a.differential - b.differential);
  const usedRoundIds = new Set(byDiff.slice(0, used).map((r) => r.roundId));

  // Average the lowest N differentials
  const sum = byDiff
    .slice(0, used)
    .reduce((acc, r) => acc + r.differential, 0);
  const avg = sum / used;
  const rawIndex = avg + adjustment;

  // Round to 1 decimal
  const handicapIndex = Math.round(rawIndex * 10) / 10;

  // Build differential list with isUsed flags
  const differentials: HandicapDifferential[] = recent.map((r) => ({
    roundId: r.roundId,
    datePlayed: r.datePlayed,
    differential: r.differential,
    isUsed: usedRoundIds.has(r.roundId),
  }));

  return {
    handicapIndex,
    differentials,
    eligibleCount: eligibleRounds.length,
    usedCount: used,
    excludedRounds: [],
    methodDescription: getMethodDescription(count, used, adjustment),
    lastUpdated: now,
    trend: null,
  };
}

/**
 * Format a handicap index for display.
 * - Positive: "12.3"
 * - Plus handicap (negative index): "+2.1"
 * - Null: "N/A"
 */
export function formatHandicapIndex(value: number | null): string {
  if (value == null) return "N/A";
  if (value < 0) return `+${Math.abs(value).toFixed(1)}`;
  return value.toFixed(1);
}
