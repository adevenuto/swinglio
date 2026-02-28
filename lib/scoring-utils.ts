import { ScoreDetails } from "@/types/scoring";

export type PlayerResult = {
  golfer_id: string;
  display_name: string;
  total_score: number;
  front_nine: number;
  back_nine: number;
  score_to_par: number;
  holes_completed: number;
  hole_count: number;
};

export type ResultsData = {
  completed_at: string;
  course_name: string;
  teebox_name: string;
  players: PlayerResult[];
};

/**
 * Compute a single player's result from their score_details and tee box holes.
 */
export function computePlayerResult(
  scoreDetails: ScoreDetails,
  teeboxHoles: Record<string, { par: string; length: string }>,
  golferId: string,
  displayName: string,
): PlayerResult {
  const holeKeys = Object.keys(teeboxHoles);
  const holeCount = holeKeys.length;

  let totalScore = 0;
  let totalPar = 0;
  let frontNine = 0;
  let backNine = 0;
  let frontPar = 0;
  let backPar = 0;
  let holesCompleted = 0;

  for (let i = 1; i <= holeCount; i++) {
    const key = `hole-${i}`;
    const holeData = scoreDetails.holes[key];
    const teeboxHole = teeboxHoles[key];
    const par = teeboxHole ? parseInt(teeboxHole.par, 10) : 0;

    if (i <= 9) frontPar += par;
    else backPar += par;

    if (holeData?.score) {
      const score = parseInt(holeData.score, 10);
      if (!isNaN(score)) {
        totalScore += score;
        holesCompleted++;
        if (i <= 9) frontNine += score;
        else backNine += score;
      }
    }
  }

  totalPar = frontPar + backPar;

  return {
    golfer_id: golferId,
    display_name: displayName,
    total_score: totalScore,
    front_nine: frontNine,
    back_nine: backNine,
    score_to_par: totalScore - totalPar,
    holes_completed: holesCompleted,
    hole_count: holeCount,
  };
}

/**
 * Build the results_data JSON for a completed round.
 */
export function buildResultsData(
  playerResults: PlayerResult[],
  courseName: string,
  teeboxName: string,
): ResultsData {
  return {
    completed_at: new Date().toISOString(),
    course_name: courseName,
    teebox_name: teeboxName,
    players: playerResults,
  };
}
