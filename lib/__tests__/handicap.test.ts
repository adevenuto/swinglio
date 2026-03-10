import {
  calculateNDB,
  calculateCourseHandicap,
  computeStrokeAllocation,
  calculateAGS,
  calculateDifferential,
  calculateHandicapIndex,
  formatHandicapIndex,
  getMethodDescription,
  DIFFERENTIAL_TABLE,
} from "../handicap";
import { ScoreDetails } from "../../types/scoring";
import { HandicapEligibleRound } from "../../types/handicap";

// === calculateNDB ===

describe("calculateNDB", () => {
  test("par 4, SI 1, CH 18 → 7", () => {
    // base = floor(18/18) = 1, rem = 0, SI 1 <= 0 → false, strokes = 1
    // NDB = 4 + 2 + 1 = 7
    expect(calculateNDB(4, 1, 18)).toBe(7);
  });

  test("par 3, SI 17, CH 5 → 5", () => {
    // base = floor(5/18) = 0, rem = 5, SI 17 <= 5 → false, strokes = 0
    // NDB = 3 + 2 + 0 = 5
    expect(calculateNDB(3, 17, 5)).toBe(5);
  });

  test("par 5, SI 3, CH 23 → 9", () => {
    // base = floor(23/18) = 1, rem = 5, SI 3 <= 5 → true, strokes = 2
    // NDB = 5 + 2 + 2 = 9
    expect(calculateNDB(5, 3, 23)).toBe(9);
  });

  test("par 4, SI 10, CH 0 → 6", () => {
    // base = 0, rem = 0, strokes = 0
    // NDB = 4 + 2 + 0 = 6
    expect(calculateNDB(4, 10, 0)).toBe(6);
  });
});

// === calculateCourseHandicap ===

describe("calculateCourseHandicap", () => {
  test("HI 15, slope 130, CR 72.5, par 72 → 18", () => {
    // 15 * (130/113) + (72.5 - 72) = 15 * 1.15044... + 0.5 = 17.757 + 0.5 = 18.257 → 18
    expect(calculateCourseHandicap(15, 130, 72.5, 72)).toBe(18);
  });

  test("HI 0, slope 113, CR 72, par 72 → 0", () => {
    expect(calculateCourseHandicap(0, 113, 72, 72)).toBe(0);
  });

  test("HI 10, slope 113, CR 72, par 72 → 10", () => {
    // 10 * 1 + 0 = 10
    expect(calculateCourseHandicap(10, 113, 72, 72)).toBe(10);
  });
});

// === computeStrokeAllocation ===

describe("computeStrokeAllocation", () => {
  test("CH 20 → 2 holes get 2 strokes, 16 get 1", () => {
    const alloc = computeStrokeAllocation(20, 18);
    expect(alloc).toHaveLength(18);
    // base = floor(20/18) = 1, rem = 2
    // SI 1 and SI 2 get base+1 = 2, rest get 1
    expect(alloc[0]).toBe(2); // SI 1
    expect(alloc[1]).toBe(2); // SI 2
    for (let i = 2; i < 18; i++) {
      expect(alloc[i]).toBe(1);
    }
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(20);
  });

  test("CH 36 → all 18 get 2", () => {
    const alloc = computeStrokeAllocation(36, 18);
    expect(alloc).toHaveLength(18);
    for (const strokes of alloc) {
      expect(strokes).toBe(2);
    }
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(36);
  });

  test("CH 0 → all 18 get 0", () => {
    const alloc = computeStrokeAllocation(0, 18);
    for (const strokes of alloc) {
      expect(strokes).toBe(0);
    }
  });
});

// === calculateDifferential ===

describe("calculateDifferential", () => {
  test("AGS 85, CR 72.1, slope 131 → ~11.1", () => {
    const diff = calculateDifferential(85, 72.1, 131);
    // ((85 - 72.1) * 113) / 131 = (12.9 * 113) / 131 = 1457.7 / 131 ≈ 11.127
    expect(diff).toBeCloseTo(11.13, 1);
  });

  test("AGS equals CR → 0", () => {
    const diff = calculateDifferential(72, 72, 113);
    expect(diff).toBe(0);
  });

  test("AGS below CR → negative differential", () => {
    const diff = calculateDifferential(68, 72, 113);
    // ((68-72) * 113) / 113 = -4
    expect(diff).toBe(-4);
  });

  test("9-hole round with halved courseRating produces reasonable differential", () => {
    // Billy Caldwell Blue: 9-hole score 33, 18-hole courseRating 69.8, slope 118
    // Bug: ((33 - 69.8) * 113) / 118 = -35.24 (wrong — uses 18-hole CR for 9-hole score)
    // Fix: halve courseRating → 69.8 / 2 = 34.9
    // ((33 - 34.9) * 113) / 118 = -1.82
    const adjCourseRating = 69.8 / 2; // 34.9
    const diff = calculateDifferential(33, adjCourseRating, 118);
    expect(diff).toBeCloseTo(-1.82, 1);
  });

  test("18-hole round is unaffected by 9-hole adjustment logic", () => {
    // Wilmette Black: 18-hole score 66, courseRating 70.8, slope 130
    // 18-hole par 72 → courseRating 70.8 < 72 * 1.5 (108) → no adjustment
    const diff = calculateDifferential(66, 70.8, 130);
    // ((66 - 70.8) * 113) / 130 = -4.17
    expect(diff).toBeCloseTo(-4.17, 1);
  });
});

// === calculateAGS ===

describe("calculateAGS", () => {
  const makeScoreDetails = (
    scores: { par: number; score: number; handicap?: number }[],
  ): ScoreDetails => {
    const holes: Record<string, any> = {};
    scores.forEach((h, i) => {
      holes[`hole-${i + 1}`] = {
        par: String(h.par),
        length: "400",
        score: String(h.score),
        ...(h.handicap != null ? { handicap: h.handicap } : {}),
      };
    });
    return { name: "test", holes };
  };

  test("without handicapIndex → returns gross score unchanged", () => {
    const sd = makeScoreDetails([
      { par: 4, score: 5 },
      { par: 3, score: 4 },
      { par: 5, score: 7 },
    ]);
    const result = calculateAGS(sd, 72, 113, 72, null);
    expect(result.grossScore).toBe(16);
    expect(result.adjustedGrossScore).toBe(16);
    expect(result.wasAdjusted).toBe(false);
  });

  test("without stroke index on holes → returns gross score unchanged", () => {
    const sd = makeScoreDetails([
      { par: 4, score: 10 },
      { par: 3, score: 8 },
    ]);
    const result = calculateAGS(sd, 72, 113, 72, 15);
    expect(result.adjustedGrossScore).toBe(18);
    expect(result.wasAdjusted).toBe(false);
    expect(result.hasStrokeIndex).toBe(false);
  });

  test("with stroke index + handicapIndex → applies NDB cap", () => {
    // CH = round(15 * (113/113) + (72-72)) = 15
    // Hole 1: par 4, SI 1, CH 15 → base=0, rem=15, 1<=15→true, strokes=1, NDB=7
    //   score 10 → capped to 7
    // Hole 2: par 3, SI 18, CH 15 → base=0, rem=15, 18<=15→false, strokes=0, NDB=5
    //   score 4 → not capped (4 < 5)
    const sd = makeScoreDetails([
      { par: 4, score: 10, handicap: 1 },
      { par: 3, score: 4, handicap: 18 },
    ]);
    const result = calculateAGS(sd, 72, 113, 72, 15);
    expect(result.grossScore).toBe(14);
    expect(result.adjustedGrossScore).toBe(11); // 7 + 4
    expect(result.wasAdjusted).toBe(true);
    expect(result.hasStrokeIndex).toBe(true);
  });
});

// === calculateHandicapIndex ===

function makeEligibleRound(
  roundId: number,
  differential: number,
  daysAgo: number = 0,
): HandicapEligibleRound {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    roundId,
    datePlayed: date.toISOString().split("T")[0],
    courseRating: 72,
    slopeRating: 113,
    par: 72,
    holeCount: 18,
    grossScore: 85,
    adjustedGrossScore: 85,
    wasAdjusted: false,
    hasStrokeIndex: false,
    isAttested: true,
    differential,
  };
}

describe("calculateHandicapIndex", () => {
  test("2 rounds → null (below minimum)", () => {
    const rounds = [
      makeEligibleRound(1, 10, 1),
      makeEligibleRound(2, 12, 2),
    ];
    const result = calculateHandicapIndex(rounds);
    expect(result.handicapIndex).toBeNull();
    expect(result.usedCount).toBe(0);
  });

  test("3 rounds → lowest 1 − 2.0", () => {
    const rounds = [
      makeEligibleRound(1, 10, 1),
      makeEligibleRound(2, 12, 2),
      makeEligibleRound(3, 8, 3),
    ];
    const result = calculateHandicapIndex(rounds);
    // Lowest differential = 8, adjustment = -2.0
    // HI = 8 + (-2.0) = 6.0
    expect(result.handicapIndex).toBe(6.0);
    expect(result.usedCount).toBe(1);
    expect(result.eligibleCount).toBe(3);
  });

  test("6 rounds → lowest 2 average − 1.0", () => {
    const rounds = [
      makeEligibleRound(1, 15, 1),
      makeEligibleRound(2, 10, 2),
      makeEligibleRound(3, 12, 3),
      makeEligibleRound(4, 8, 4),
      makeEligibleRound(5, 20, 5),
      makeEligibleRound(6, 11, 6),
    ];
    const result = calculateHandicapIndex(rounds);
    // Lowest 2: 8 and 10, average = 9, adjustment = -1.0
    // HI = 9 - 1.0 = 8.0
    expect(result.handicapIndex).toBe(8.0);
    expect(result.usedCount).toBe(2);
  });

  test("20 rounds → lowest 8 averaged, no adjustment", () => {
    // Create 20 rounds with known differentials
    const diffs = [15, 10, 12, 8, 20, 11, 14, 9, 18, 13, 16, 7, 19, 17, 6, 22, 21, 5, 25, 23];
    const rounds = diffs.map((d, i) => makeEligibleRound(i + 1, d, i));
    const result = calculateHandicapIndex(rounds);

    // Lowest 8 of 20: 5, 6, 7, 8, 9, 10, 11, 12
    // Sum = 68, avg = 8.5, adjustment = 0
    expect(result.handicapIndex).toBe(8.5);
    expect(result.usedCount).toBe(8);
    expect(result.eligibleCount).toBe(20);
  });

  test("0 rounds → null", () => {
    const result = calculateHandicapIndex([]);
    expect(result.handicapIndex).toBeNull();
    expect(result.methodDescription).toBe("No eligible rounds");
  });

  test("differentials have correct isUsed flags", () => {
    const rounds = [
      makeEligibleRound(1, 10, 1),
      makeEligibleRound(2, 5, 2),
      makeEligibleRound(3, 15, 3),
    ];
    const result = calculateHandicapIndex(rounds);
    // Lowest 1: roundId 2 (diff=5)
    const usedDiffs = result.differentials.filter((d) => d.isUsed);
    expect(usedDiffs).toHaveLength(1);
    expect(usedDiffs[0].roundId).toBe(2);
  });
});

// === formatHandicapIndex ===

describe("formatHandicapIndex", () => {
  test("positive → decimal string", () => {
    expect(formatHandicapIndex(12.3)).toBe("12.3");
  });

  test("zero → '0.0'", () => {
    expect(formatHandicapIndex(0)).toBe("0.0");
  });

  test("negative (plus handicap) → '+2.1'", () => {
    expect(formatHandicapIndex(-2.1)).toBe("+2.1");
  });

  test("null → 'N/A'", () => {
    expect(formatHandicapIndex(null)).toBe("N/A");
  });
});

// === getMethodDescription ===

describe("getMethodDescription", () => {
  test("20 rounds, 8 used, 0 adj", () => {
    expect(getMethodDescription(20, 8, 0)).toBe("Lowest 8 of 20");
  });

  test("3 rounds, 1 used, -2.0 adj", () => {
    expect(getMethodDescription(3, 1, -2.0)).toBe(
      "Lowest 1 of 3 (-2.0 adj.)",
    );
  });

  test("6 rounds, 2 used, -1.0 adj", () => {
    expect(getMethodDescription(6, 2, -1.0)).toBe(
      "Lowest 2 of 6 (-1.0 adj.)",
    );
  });
});

// === DIFFERENTIAL_TABLE ===

describe("DIFFERENTIAL_TABLE", () => {
  test("has entries for 3 through 20", () => {
    for (let i = 3; i <= 20; i++) {
      expect(DIFFERENTIAL_TABLE[i]).toBeDefined();
      expect(DIFFERENTIAL_TABLE[i].used).toBeGreaterThan(0);
    }
  });

  test("used count increases with round count", () => {
    let prevUsed = 0;
    for (let i = 3; i <= 20; i++) {
      expect(DIFFERENTIAL_TABLE[i].used).toBeGreaterThanOrEqual(prevUsed);
      prevUsed = DIFFERENTIAL_TABLE[i].used;
    }
  });
});
