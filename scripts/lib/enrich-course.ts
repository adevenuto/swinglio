// Reusable course enrichment utility (Node-side only, not for RN runtime)
// Primary: golfcourseapi.com  |  Fallback: Google Geocoding

export type EnrichmentResult = {
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  teeboxEnrichments?: TeeboxEnrichment[];
  matchedCourseName?: string;
  source: "golfcourseapi" | "google" | "none";
};

export type HoleEnrichment = {
  par: number;
  yardage: number;
  handicap: number;
};

export type TeeboxEnrichment = {
  name: string;
  slope?: number;
  courseRating?: number;
  totalYardage?: number;
  holes?: HoleEnrichment[];
};

export type CourseInput = {
  name: string;
  street?: string | null;
  state?: string | null;
  postalCode?: string | null;
  cityName?: string;
  stateAbbr?: string;
};

export class RateLimitError extends Error {
  constructor() {
    super("API rate limit exceeded (429)");
    this.name = "RateLimitError";
  }
}

// ---- Main entry point ----

export async function enrichCourse(
  course: CourseInput,
  apiKey: string,
  options?: { googleApiKey?: string },
): Promise<EnrichmentResult> {
  // Step 1: Try golfcourseapi.com
  const golfResult = await searchGolfCourseApi(course, apiKey);
  if (golfResult) return golfResult;

  // Step 2: Fallback to Google Geocoding for lat/lng only
  if (options?.googleApiKey) {
    const googleResult = await geocodeWithGoogle(course, options.googleApiKey);
    if (googleResult) return googleResult;
  }

  return { source: "none" };
}

// ---- Golf Course API ----

const GOLF_API_BASE = "https://api.golfcourseapi.com/v1";

// API response types (golfcourseapi.com actual shape)
type ApiTee = {
  tee_name: string;
  course_rating: number;
  slope_rating: number;
  bogey_rating: number;
  total_yards: number;
  total_meters: number;
  number_of_holes: number;
  par_total: number;
  front_course_rating: number;
  front_slope_rating: number;
  back_course_rating: number;
  back_slope_rating: number;
  holes: { par: number; yardage: number; handicap: number }[];
};

type ApiCourse = {
  id: number;
  club_name: string;
  course_name: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  tees: {
    male?: ApiTee[];
    female?: ApiTee[];
  };
};

async function searchGolfCourseApi(
  course: CourseInput,
  apiKey: string,
): Promise<EnrichmentResult | null> {
  try {
    const url = `${GOLF_API_BASE}/courses?course_name=${encodeURIComponent(course.name)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (res.status === 429) {
      throw new RateLimitError();
    }

    if (!res.ok) {
      console.warn(`  Golf API ${res.status}: ${res.statusText}`);
      return null;
    }

    const data: { courses: ApiCourse[] } = await res.json();
    if (!data.courses?.length) return null;

    // Find best match by course_name
    const candidates = data.courses.map((c) => ({
      ...c,
      name: c.course_name,
    }));
    const match = findBestMatch(course.name, candidates) as (ApiCourse & { name: string }) | null;
    if (!match) return null;

    // Flatten tees from male/female groups — use male tees primarily (most common for scoring)
    // Include both genders, dedup by tee_name
    const allTees: ApiTee[] = [
      ...(match.tees?.male || []),
      ...(match.tees?.female || []),
    ];
    const seenNames = new Set<string>();
    const uniqueTees: TeeboxEnrichment[] = [];
    for (const t of allTees) {
      const key = t.tee_name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      const rawHoles = t.holes ?? [];
      const is9Duped = isDuplicated9Hole(rawHoles);
      uniqueTees.push({
        name: t.tee_name,
        slope: t.slope_rating,
        courseRating: t.course_rating,
        totalYardage: is9Duped
          ? Math.round(t.total_yards / 2)
          : t.total_yards,
        holes: is9Duped ? rawHoles.slice(0, 9) : rawHoles,
      });
    }

    return {
      lat: match.location?.latitude,
      lng: match.location?.longitude,
      teeboxEnrichments: uniqueTees,
      matchedCourseName: match.course_name,
      source: "golfcourseapi",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  Golf API error: ${msg}`);
    return null;
  }
}

// ---- Google Geocoding fallback ----

async function geocodeWithGoogle(
  course: CourseInput,
  googleApiKey: string,
): Promise<EnrichmentResult | null> {
  const address = [
    course.name,
    course.street,
    course.cityName,
    course.state,
    course.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      source: "google",
    };
  } catch {
    return null;
  }
}

// ---- 9-hole duplication detection ----

/**
 * Detects if an 18-hole array is actually a 9-hole course with front 9
 * duplicated into the back 9. The Golf Course API does this for 9-hole
 * courses — holes 10-18 have identical par, yardage, AND handicap to holes 1-9.
 * Including handicap prevents false positives on real 18-hole courses where
 * par+yardage happen to match across nines (handicap assignments are always
 * structurally different: odd on one nine, even on the other).
 */
export function isDuplicated9Hole(
  holes: { par: number; yardage: number; handicap?: number }[],
): boolean {
  if (holes.length !== 18) return false;
  for (let i = 0; i < 9; i++) {
    if (
      holes[i].par !== holes[i + 9].par ||
      holes[i].yardage !== holes[i + 9].yardage ||
      holes[i].handicap !== holes[i + 9].handicap
    ) {
      return false;
    }
  }
  return true;
}

// ---- Teebox enrichment merger ----

export function applyTeeboxEnrichments(
  existingLayoutData: string | null,
  enrichments?: TeeboxEnrichment[],
): string | null {
  if (!existingLayoutData || !enrichments?.length) return existingLayoutData;

  try {
    const parsed = JSON.parse(existingLayoutData);
    if (!parsed.teeboxes) return existingLayoutData;

    const usedEnrichments = new Set<number>();

    for (const teebox of parsed.teeboxes) {
      // 1. Try exact name match (case-insensitive)
      let match = enrichments.find(
        (e, i) =>
          !usedEnrichments.has(i) &&
          e.name.toLowerCase() === (teebox.name || "").toLowerCase(),
      );

      // 2. Fallback: match by closest total yardage
      if (!match) {
        const localYardage = computeTotalYardage(teebox.holes);
        if (localYardage > 0) {
          let bestIdx = -1;
          let bestDiff = Infinity;
          for (let i = 0; i < enrichments.length; i++) {
            if (usedEnrichments.has(i)) continue;
            const ey = enrichments[i].totalYardage;
            if (ey === undefined) continue;
            const diff = Math.abs(ey - localYardage);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestIdx = i;
            }
          }
          // Accept if within 5% of local yardage
          if (bestIdx >= 0 && bestDiff / localYardage <= 0.05) {
            match = enrichments[bestIdx];
            usedEnrichments.add(bestIdx);
          }
        }
      } else {
        const idx = enrichments.indexOf(match);
        if (idx >= 0) usedEnrichments.add(idx);
      }

      if (match) {
        if (match.slope !== undefined) teebox.slope = match.slope;
        if (match.courseRating !== undefined)
          teebox.courseRating = match.courseRating;
        if (match.totalYardage !== undefined)
          teebox.totalYardage = match.totalYardage;

        // Merge per-hole data (handicap always; par/yardage when local is empty)
        if (match.holes?.length && teebox.holes) {
          for (let h = 0; h < match.holes.length; h++) {
            const holeKey = `hole-${h + 1}`;
            const local = teebox.holes[holeKey];
            if (!local) continue;
            const api = match.holes[h];
            if (api.handicap != null) local.handicap = api.handicap;
            if (!local.par && api.par != null) local.par = String(api.par);
            if (!local.length && api.yardage != null)
              local.length = String(api.yardage);
          }
        }
      }
    }

    return JSON.stringify(parsed);
  } catch {
    return existingLayoutData;
  }
}

// ---- Build layout_data from API (full replace, not merge) ----

export function buildLayoutFromApi(
  enrichments: TeeboxEnrichment[],
  existingLayoutData?: string | null,
): string {
  // Parse existing layout to preserve teebox colors (local-only field)
  const colorMap: Record<string, string> = {};
  if (existingLayoutData) {
    try {
      const existing = JSON.parse(existingLayoutData);
      for (const t of existing.teeboxes || []) {
        if (t.color) colorMap[t.name.toLowerCase()] = t.color;
      }
    } catch {}
  }

  const teeboxes = enrichments.map((e, i) => {
    const holes: Record<
      string,
      { par: string; length: string; handicap?: number }
    > = {};
    if (e.holes) {
      for (let h = 0; h < e.holes.length; h++) {
        holes[`hole-${h + 1}`] = {
          par: String(e.holes[h].par),
          length: String(e.holes[h].yardage),
          handicap: e.holes[h].handicap,
        };
      }
    }
    const color = colorMap[e.name.toLowerCase()];
    return {
      order: i,
      name: e.name,
      ...(color && { color }),
      slope: e.slope,
      courseRating: e.courseRating,
      totalYardage: e.totalYardage,
      holes,
    };
  });

  const holeCount = enrichments[0]?.holes?.length ?? 18;
  return JSON.stringify({ teeboxes, hole_count: holeCount });
}

function computeTotalYardage(
  holes: Record<string, { length?: string }> | undefined,
): number {
  if (!holes) return 0;
  let total = 0;
  for (const h of Object.values(holes)) {
    const y = parseInt(h.length || "0", 10);
    if (!isNaN(y)) total += y;
  }
  return total;
}

// ---- Fuzzy matching ----

export function findBestMatch(
  localName: string,
  candidates: Record<string, unknown>[],
): Record<string, unknown> | null {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/golf\s*(club|course|links)/gi, "")
      .replace(/country\s*club/gi, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  const target = normalize(localName);
  if (!target) return null;

  // Exact normalized match
  const exact = candidates.find(
    (c) => normalize(String(c.name || c.courseName || "")) === target,
  );
  if (exact) return exact;

  // Contains match
  const contains = candidates.find((c) => {
    const n = normalize(String(c.name || c.courseName || ""));
    return n.includes(target) || target.includes(n);
  });
  if (contains) return contains;

  // Levenshtein distance fallback
  let bestCandidate: Record<string, unknown> | null = null;
  let bestDistance = Infinity;
  for (const c of candidates) {
    const n = normalize(String(c.name || c.courseName || ""));
    const dist = levenshtein(target, n);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestCandidate = c;
    }
  }

  const maxLen = Math.max(target.length, 1);
  if (bestDistance / maxLen <= 0.3) return bestCandidate;

  return null;
}

// ---- Helpers ----

function strVal(val: unknown): string | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  return String(val);
}

function parseNum(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}
