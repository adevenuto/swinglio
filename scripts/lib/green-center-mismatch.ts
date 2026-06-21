/**
 * green-center-mismatch.ts
 *
 * Shared detection logic for green-center data that belongs to the WRONG course
 * (the name-collision scraping bug). Imported by both the read-only audit
 * (audit-green-center-mismatches.ts) and the remediation script
 * (clear-bad-green-centers.ts) so the two can never drift apart.
 *
 * Signal: a course's own lat/lng is authoritative. If the median green-center
 * point is far from it, the greens belong to a different course. When lat/lng is
 * missing, fall back to the course's US-state bounding box.
 */

import type postgres from "postgres";

export const FLAG_KM_DEFAULT = 10;
export const BORDERLINE_MAX_KM = 25; // 10–25km = borderline (possible geocoding noise)
const BBOX_BUFFER_DEG = 0.5;

export type CourseRow = {
  id: number;
  course_name: string;
  club_name: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  layout_data: string | null;
  city_name: string | null;
};

export type Flagged = {
  course: CourseRow;
  medianLat: number;
  medianLng: number;
  distanceKm: number | null; // null = flagged via state bbox (no lat/lng)
  reasons: string[];
};

export type AuditResult = {
  totalWithGreenCenters: number;
  evaluated: number;
  noReference: number;
  flagged: Flagged[];
};

// ---------------------------------------------------------------------------
// Geo helpers
// ---------------------------------------------------------------------------

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Approximate bounding boxes for US states + DC: [minLat, maxLat, minLng, maxLng].
export const STATE_BBOX: Record<string, [number, number, number, number]> = {
  AL: [30.1, 35.1, -88.5, -84.9], AK: [51.2, 71.5, -179.2, -129.9],
  AZ: [31.3, 37.1, -114.9, -109.0], AR: [33.0, 36.6, -94.7, -89.6],
  CA: [32.5, 42.1, -124.5, -114.1], CO: [36.9, 41.1, -109.1, -102.0],
  CT: [40.9, 42.1, -73.8, -71.7], DE: [38.4, 39.9, -75.8, -75.0],
  DC: [38.7, 39.0, -77.2, -76.9], FL: [24.4, 31.1, -87.7, -79.9],
  GA: [30.3, 35.1, -85.7, -80.8], HI: [18.8, 22.3, -160.3, -154.7],
  ID: [41.9, 49.1, -117.3, -110.9], IL: [36.9, 42.6, -91.6, -87.4],
  IN: [37.7, 41.8, -88.1, -84.7], IA: [40.3, 43.6, -96.7, -90.1],
  KS: [36.9, 40.1, -102.1, -94.5], KY: [36.4, 39.2, -89.6, -81.9],
  LA: [28.9, 33.1, -94.1, -88.7], ME: [42.9, 47.6, -71.2, -66.9],
  MD: [37.8, 39.8, -79.6, -74.9], MA: [41.1, 42.9, -73.6, -69.8],
  MI: [41.6, 48.4, -90.5, -82.3], MN: [43.4, 49.5, -97.3, -89.4],
  MS: [30.1, 35.1, -91.7, -88.0], MO: [35.9, 40.7, -95.9, -89.0],
  MT: [44.3, 49.1, -116.1, -103.9], NE: [39.9, 43.1, -104.1, -95.2],
  NV: [34.9, 42.1, -120.1, -113.9], NH: [42.6, 45.4, -72.6, -70.5],
  NJ: [38.8, 41.4, -75.6, -73.8], NM: [31.2, 37.1, -109.1, -102.9],
  NY: [40.4, 45.1, -79.8, -71.8], NC: [33.7, 36.7, -84.4, -75.4],
  ND: [45.8, 49.1, -104.1, -96.5], OH: [38.3, 42.4, -84.9, -80.5],
  OK: [33.5, 37.1, -103.1, -94.4], OR: [41.9, 46.4, -124.6, -116.4],
  PA: [39.6, 42.4, -80.6, -74.6], RI: [41.1, 42.1, -71.9, -71.0],
  SC: [32.0, 35.3, -83.5, -78.4], SD: [42.4, 45.99, -104.1, -96.3],
  TN: [34.9, 36.8, -90.4, -81.6], TX: [25.7, 36.6, -106.7, -93.4],
  UT: [36.9, 42.1, -114.1, -108.9], VT: [42.7, 45.1, -73.5, -71.4],
  VA: [36.5, 39.5, -83.7, -75.1], WA: [45.5, 49.1, -124.9, -116.9],
  WV: [37.1, 40.7, -82.7, -77.6], WI: [42.4, 47.4, -92.9, -86.7],
  WY: [40.9, 45.1, -111.1, -103.9],
};

export function outsideStateBbox(state: string, lat: number, lng: number): boolean {
  const bbox = STATE_BBOX[state.toUpperCase()];
  if (!bbox) return false; // unknown state code — can't judge
  const [minLat, maxLat, minLng, maxLng] = bbox;
  return (
    lat < minLat - BBOX_BUFFER_DEG ||
    lat > maxLat + BBOX_BUFFER_DEG ||
    lng < minLng - BBOX_BUFFER_DEG ||
    lng > maxLng + BBOX_BUFFER_DEG
  );
}

export function isUS(lat: number | null, lng: number | null): boolean {
  return (
    lat != null && lng != null &&
    ((lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) || // contiguous
      (lat >= 51 && lat <= 72 && lng >= -170 && lng <= -129) || // AK
      (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154)) // HI
  );
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Query all courses with greenCenters and classify mismatches. */
export async function findMismatches(
  sql: ReturnType<typeof postgres>,
  flagKm: number = FLAG_KM_DEFAULT,
): Promise<AuditResult> {
  const courses = await sql<CourseRow[]>`
    SELECT c.id, c.course_name, c.club_name, c.state, c.lat, c.lng,
           c.layout_data::text as layout_data, ci.name as city_name
    FROM courses c
    LEFT JOIN cities ci ON ci.id = c.city_id
    WHERE c.layout_data LIKE '%"greenCenters":%'
    ORDER BY c.id
  `;

  const flagged: Flagged[] = [];
  let evaluated = 0;
  let noReference = 0;

  for (const course of courses) {
    if (!course.layout_data) continue;

    let ld: { greenCenters?: Record<string, { lat: number; lng: number }> };
    try {
      ld = JSON.parse(course.layout_data);
    } catch {
      continue;
    }

    const gc = ld.greenCenters;
    if (!gc || typeof gc !== "object") continue;

    const points = Object.values(gc).filter(
      (p) => p && typeof p.lat === "number" && typeof p.lng === "number",
    );
    if (points.length === 0) continue;

    evaluated++;

    const medianLat = median(points.map((p) => p.lat));
    const medianLng = median(points.map((p) => p.lng));
    const reasons: string[] = [];
    let distanceKm: number | null = null;

    if (course.lat != null && course.lng != null) {
      distanceKm = haversineKm(course.lat, course.lng, medianLat, medianLng);
      if (distanceKm > flagKm) {
        reasons.push(`${distanceKm.toFixed(0)}km from course center`);
      }
    } else if (course.state && STATE_BBOX[course.state.toUpperCase()]) {
      if (outsideStateBbox(course.state, medianLat, medianLng)) {
        reasons.push(`green centers outside ${course.state.toUpperCase()} state bounds`);
      }
    } else {
      noReference++;
      continue;
    }

    if (reasons.length > 0) {
      flagged.push({ course, medianLat, medianLng, distanceKm, reasons });
    }
  }

  flagged.sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0));
  return { totalWithGreenCenters: courses.length, evaluated, noReference, flagged };
}

/** Split flagged courses into the agreed remediation sets. */
export function classifySets(flagged: Flagged[]) {
  const isBorderline = (f: Flagged) =>
    f.distanceKm != null && f.distanceKm > FLAG_KM_DEFAULT && f.distanceKm <= BORDERLINE_MAX_KM;
  const borderline = flagged.filter(isBorderline);
  const clearSet = flagged.filter((f) => !isBorderline(f));
  const reScrapeSet = clearSet.filter((f) => isUS(f.course.lat, f.course.lng));
  return { borderline, clearSet, reScrapeSet };
}
