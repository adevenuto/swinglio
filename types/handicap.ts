// === Handicap System Types ===

export type ExclusionReason =
  | "no_course_rating"
  | "no_slope"
  | "invalid_slope"
  | "no_par"
  | "not_attested"
  | "total_only"
  | "withdrew";

export type HandicapExcludedRound = {
  roundId: number;
  reason: ExclusionReason;
};

export type HandicapDifferential = {
  roundId: number;
  datePlayed: string;
  differential: number;
  isUsed: boolean;
  courseName?: string;
  grossScore?: number;
};

export type HandicapEligibleRound = {
  roundId: number;
  datePlayed: string;
  courseRating: number;
  slopeRating: number;
  par: number;
  holeCount: number;
  grossScore: number;
  adjustedGrossScore: number;
  wasAdjusted: boolean;
  hasStrokeIndex: boolean;
  isAttested: boolean;
  differential: number;
};

export type HandicapResult = {
  handicapIndex: number | null;
  differentials: HandicapDifferential[];
  eligibleCount: number;
  usedCount: number;
  excludedRounds: HandicapExcludedRound[];
  methodDescription: string;
  lastUpdated: string;
  /** Change from previous index (negative = improved). null if no previous. */
  trend: number | null;
};
