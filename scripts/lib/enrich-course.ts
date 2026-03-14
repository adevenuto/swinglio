// Reusable course enrichment utility (Node-side only, not for RN runtime)
// Primary: golfcourseapi.com  |  Fallback: Google Geocoding

export type EnrichmentResult = {
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  teeboxEnrichments?: TeeboxEnrichment[];
  matchedCourseName?: string;
  matchedClubName?: string;
  apiCourseId?: number;
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
  lat?: number | null;
  lng?: number | null;
  teeboxNames?: string[];
};

export class RateLimitError extends Error {
  constructor() {
    super("API rate limit exceeded (429)");
    this.name = "RateLimitError";
  }
}

// ---- Display name helper ----

export function buildCourseName(courseName: string, clubName: string): string {
  const cn = courseName.trim();
  const cl = clubName.trim();
  if (cn.toLowerCase() === cl.toLowerCase()) return cn;
  if (cn.toLowerCase().includes(cl.toLowerCase())) return cn;
  if (cl.toLowerCase().includes(cn.toLowerCase())) return cl;
  return `${cl} ${cn}`;
}

// ---- Golf term stripping ----

/**
 * Aggressively strip golf-related terms (full words + abbreviations),
 * location qualifiers after dashes, and leading "The".
 * Used for both search query generation and name normalization.
 */
function stripGolfTerms(s: string): string {
  return s
    .replace(/\b(golf\s*(course|club|links)|country\s*club)\b/gi, "")
    .replace(/\bg\.?\s*[cl]\.?\b/gi, "")       // Gc, Gl, G.C., G.L.
    .replace(/\bc\.?\s*c\.?\b/gi, "")           // CC, C.C.
    .replace(/\bmuni(cipal)?\b/gi, "")          // Muni, Municipal
    .replace(/\s+-\s+.+$/, "")                  // " - Sun City West" location suffix
    .replace(/^the\s+/i, "")                    // leading "The"
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---- Search query generation ----

/**
 * Generate multiple search query variants from a course name.
 * 1. Full name as-is
 * 2. Strip venue suffix ("At/Of/- [Venue]") → base name + venue name
 * 3. First word of name (broadest search — address matching disambiguates)
 *    For article-led names ("The Hill GC"), falls back to stripGolfTerms.
 */
export function generateSearchQueries(name: string): string[] {
  const queries = [name];

  // Match patterns like "Tuscany Falls At Pebble Creek", "Course Of The Club", "Course - Venue"
  const suffixMatch = name.match(/^(.+?)\s+(?:at|of|-)\s+(.+)$/i);
  if (suffixMatch) {
    const baseName = suffixMatch[1].trim();
    const venueName = suffixMatch[2].trim();
    if (baseName && baseName !== name) queries.push(baseName);
    if (venueName && venueName !== name) queries.push(venueName);
  }

  // First word: broadest search — address matching handles disambiguation
  const SKIP_FIRST_WORDS = /^(the|a|an)$/i;
  const firstWord = name.split(/\s+/)[0];
  if (firstWord && SKIP_FIRST_WORDS.test(firstWord)) {
    // Article lead — fall back to stripGolfTerms for a meaningful core name
    const coreName = stripGolfTerms(name);
    if (coreName && coreName !== name && !queries.includes(coreName)) {
      queries.push(coreName);
    }
  } else if (firstWord && firstWord.length >= 6 && firstWord !== name && !queries.includes(firstWord)) {
    queries.push(firstWord);
  }

  return Array.from(new Set(queries));
}

// ---- Haversine distance ----

/** Returns distance in km between two lat/lng coordinates */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const queries = generateSearchQueries(course.name);

  // Build localAddress for address-aware matching
  const localAddress: {
    street?: string;
    postalCode?: string;
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  } = {};
  if (course.street) localAddress.street = course.street;
  if (course.postalCode) localAddress.postalCode = course.postalCode;
  if (course.cityName) localAddress.city = course.cityName;
  if (course.stateAbbr) localAddress.state = course.stateAbbr;
  else if (course.state) localAddress.state = course.state;
  if (course.lat != null) localAddress.lat = course.lat;
  if (course.lng != null) localAddress.lng = course.lng;
  const hasAddress = Object.keys(localAddress).length > 0;

  for (let qi = 0; qi < queries.length; qi++) {
    const query = queries[qi];
    // Delay between query variants (not before the first one)
    if (qi > 0) await new Promise((r) => setTimeout(r, 500));

    try {
      const url = `${GOLF_API_BASE}/courses?course_name=${encodeURIComponent(query)}`;
      let res = await fetch(url, {
        headers: { Authorization: `Key ${apiKey}` },
      });

      // Retry once after a pause on 429
      if (res.status === 429) {
        console.warn(`  Golf API 429 — pausing 30s then retrying...`);
        await new Promise((r) => setTimeout(r, 30_000));
        res = await fetch(url, {
          headers: { Authorization: `Key ${apiKey}` },
        });
        if (res.status === 429) {
          throw new RateLimitError();
        }
      }

      if (!res.ok) {
        console.warn(`  Golf API ${res.status}: ${res.statusText}`);
        continue;
      }

      const data: { courses: ApiCourse[] } = await res.json();
      if (!data.courses?.length) continue;

      // Find best match using name + address scoring
      const candidates = data.courses.map((c) => ({
        ...c,
        name: c.course_name,
        clubName: c.club_name,
      }));
      const match = findBestMatch(
        course.name,
        candidates,
        hasAddress ? localAddress : undefined,
        course.teeboxNames,
      ) as (ApiCourse & { name: string; clubName: string }) | null;
      if (!match) continue;

      // Flatten tees from male/female groups, dedup by tee_name
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
        matchedClubName: match.club_name,
        apiCourseId: match.id,
        source: "golfcourseapi",
      };
    } catch (err: unknown) {
      if (err instanceof RateLimitError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  Golf API error (query="${query}"): ${msg}`);
    }
  }

  return null;
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
  localAddress?: {
    street?: string;
    postalCode?: string;
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  },
  localTeeboxNames?: string[],
): Record<string, unknown> | null {
  const normalize = (s: string) =>
    stripGolfTerms(s)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const target = normalize(localName);
  if (!target) return null;

  let bestCandidate: Record<string, unknown> | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    const candidateName = normalize(String(c.name || c.courseName || ""));

    // --- Name score (0-100) ---
    // Try matching against both course_name and club_name, use the better score
    let nameScore = computeNameScore(target, candidateName);

    // Club name fallback: if candidate has a clubName, try matching against that too
    const clubName = c.clubName as string | undefined;
    if (clubName) {
      const normalizedClub = normalize(clubName);
      if (normalizedClub) {
        const clubScore = computeNameScore(target, normalizedClub);
        nameScore = Math.max(nameScore, clubScore);
      }
    }

    // --- Address bonus (0-85), state penalty, geo score ---
    let addressBonus = 0;
    let statePenalty = 0;
    let geoScore = 0;
    if (localAddress) {
      // Extract candidate address info from API response shape
      const loc = c.location as
        | { address?: string; city?: string; state?: string; latitude?: number; longitude?: number }
        | undefined;

      if (loc) {
        // Street number match (+25)
        if (localAddress.street) {
          const localNum = localAddress.street.match(/^(\d+)/);
          const apiAddr = String(loc.address || "");
          const apiNum = apiAddr.match(/^(\d+)/);
          if (localNum && apiNum && localNum[1] === apiNum[1]) {
            addressBonus += 25;
          }
        }

        // Postal code match (+30): extract from API address string
        if (localAddress.postalCode) {
          const apiAddr = String(loc.address || "");
          const postalMatch = apiAddr.match(/\b(\d{5})(?:-\d{4})?\b/);
          if (postalMatch && postalMatch[1] === localAddress.postalCode) {
            addressBonus += 30;
          }
        }

        // City + state match (+15)
        if (
          localAddress.city &&
          localAddress.state &&
          loc.city &&
          loc.state
        ) {
          if (
            loc.city.toLowerCase() === localAddress.city.toLowerCase() &&
            loc.state.toLowerCase() === localAddress.state.toLowerCase()
          ) {
            addressBonus += 15;
          }
        }

        // State mismatch penalty (-40)
        if (localAddress.state && loc.state) {
          if (localAddress.state.toLowerCase() !== loc.state.toLowerCase()) {
            statePenalty = -40;
          }
        }

        // Graduated lat/lng proximity scoring
        if (
          localAddress.lat != null &&
          localAddress.lng != null &&
          loc.latitude != null &&
          loc.longitude != null
        ) {
          const dist = haversine(
            localAddress.lat,
            localAddress.lng,
            loc.latitude,
            loc.longitude,
          );
          if (dist <= 2) {
            geoScore = 15;       // very close — strong signal
          } else if (dist <= 50) {
            geoScore = 5;        // same metro area
          } else if (dist > 100) {
            geoScore = -30;      // almost certainly wrong
          }
          // 50-100km: geoScore stays 0 (ambiguous)
        }
      }
    }

    // --- Teebox overlap bonus (0-20) ---
    let teeboxBonus = 0;
    if (localTeeboxNames?.length) {
      const tees = c.tees as { male?: { tee_name: string }[]; female?: { tee_name: string }[] } | undefined;
      if (tees) {
        const apiTeeNames = new Set<string>();
        for (const t of tees.male || []) apiTeeNames.add(t.tee_name.toLowerCase());
        for (const t of tees.female || []) apiTeeNames.add(t.tee_name.toLowerCase());

        if (apiTeeNames.size > 0) {
          let matchCount = 0;
          for (const name of localTeeboxNames) {
            if (apiTeeNames.has(name.toLowerCase())) matchCount++;
          }
          teeboxBonus = Math.round((matchCount / localTeeboxNames.length) * 20);
        }
      }
    }

    const totalScore = nameScore + addressBonus + statePenalty + geoScore + teeboxBonus;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestCandidate = c;
    }
  }

  // Accept if total score >= 45 (address signals alone can carry the match)
  if (bestScore >= 45) return bestCandidate;

  return null;
}

/** Compute a name similarity score (0-100) between two normalized strings */
function computeNameScore(target: string, candidate: string): number {
  if (candidate === target) return 100;

  // Substring match — scale score by how much of the longer string the shorter covers
  if (candidate.includes(target) || target.includes(candidate)) {
    const minLen = Math.min(target.length, candidate.length);
    const maxLen = Math.max(target.length, candidate.length, 1);
    const lenRatio = minLen / maxLen;
    if (lenRatio >= 0.6) return 60;          // substantial overlap
    if (lenRatio < 0.4) return 25;           // too little overlap ("forest" vs "forest highlands canyon")
    // Linear interpolation: 0.4 → 30, 0.6 → 60
    return Math.round(30 + (lenRatio - 0.4) / 0.2 * 30);
  }

  const dist = levenshtein(target, candidate);
  const maxLen = Math.max(target.length, candidate.length, 1);
  const ratio = dist / maxLen;
  if (ratio <= 0.3) return 40 + Math.round(20 * (1 - ratio / 0.3));
  return 0;
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
