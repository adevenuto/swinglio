/**
 * scrape-golftraxx-index.ts
 *
 * Phase 1: Scrapes GolfTraxx state-level index pages to discover which courses
 * they have, then matches against our DB courses using state + lat/lng proximity
 * + fuzzy name matching.
 *
 * Usage:
 *   npx tsx scripts/scrape-golftraxx-index.ts [options]
 *
 * Options:
 *   --states <abbr,...>   Comma-separated state abbreviations (default: all US states)
 *   --diagnostic          Dump raw marker data for first state only (no matching)
 *   --dry-run             Log matches without writing to DB
 *   --limit <n>           Limit number of states to process
 */

import "dotenv/config";
import postgres from "postgres";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { distance as levenshtein } from "fastest-levenshtein";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const STATES_ARG = getArg("--states");
const DIAGNOSTIC = process.argv.includes("--diagnostic");
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = getArg("--limit") ? parseInt(getArg("--limit")!, 10) : undefined;

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

const sql = postgres(process.env.DIRECT_URL!);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CapturedMarker = {
  lat: number;
  lng: number;
  title: string | null;
  label: string | null;
  icon: string | null;
};

type DBCourse = {
  id: number;
  course_name: string;
  club_name: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  layout_data: string | null;
};

type GolfTraxxMatch = {
  name: string;
  zip: string | null;
  lat: number;
  lng: number;
  matchedAt: string;
  matchConfidence: number;
};

// ---------------------------------------------------------------------------
// All 51 US state/territory abbreviations (50 states + DC)
// ---------------------------------------------------------------------------

const ALL_US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI",
  "WY",
];

// ---------------------------------------------------------------------------
// Marker interceptor (reused from scrape-green-centers.ts)
// ---------------------------------------------------------------------------

const MARKER_INTERCEPTOR = `
(function() {
  window.__capturedMarkers = [];
  window.__gmapsPatched = false;

  function patchMarker() {
    if (window.__gmapsPatched) return;
    if (typeof google === 'undefined' || !google.maps || !google.maps.Marker) return;
    window.__gmapsPatched = true;

    const OriginalMarker = google.maps.Marker;
    google.maps.Marker = function(opts) {
      const marker = new OriginalMarker(opts);
      try {
        const pos = opts && opts.position;
        let lat = null, lng = null;
        if (pos) {
          lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
          lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
        }
        window.__capturedMarkers.push({
          lat: lat,
          lng: lng,
          title: (opts && opts.title) || null,
          label: (opts && opts.label) || null,
          icon: (opts && opts.icon) ? (typeof opts.icon === 'string' ? opts.icon : JSON.stringify(opts.icon)) : null,
        });
      } catch(e) {}
      return marker;
    };
    google.maps.Marker.prototype = OriginalMarker.prototype;
    Object.keys(OriginalMarker).forEach(function(key) {
      try { google.maps.Marker[key] = OriginalMarker[key]; } catch(e) {}
    });
  }

  const interval = setInterval(function() {
    patchMarker();
    if (window.__gmapsPatched) clearInterval(interval);
  }, 50);

  document.addEventListener('DOMContentLoaded', patchMarker);
})();
`;

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

// ---------------------------------------------------------------------------
// Scrape a single state index page
// ---------------------------------------------------------------------------

async function scrapeStateIndex(
  browser: Browser,
  stateAbbr: string,
): Promise<CapturedMarker[]> {
  const url = `https://golftraxx.com/courses-on-map-by-state?state=${stateAbbr}&static=true`;
  const page: Page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (type === "image" || type === "stylesheet" || type === "font" || type === "media") {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.evaluateOnNewDocument(MARKER_INTERCEPTOR);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });

    // Poll until markers stop growing (stable for 6 seconds)
    let lastCount = 0;
    let stableMs = 0;
    const pollInterval = 500;
    const stableThreshold = 6000;
    const maxWait = 60_000;
    let elapsed = 0;

    while (elapsed < maxWait) {
      await new Promise((r) => setTimeout(r, pollInterval));
      elapsed += pollInterval;

      const count: number = await page.evaluate(
        () => (window as any).__capturedMarkers?.length || 0,
      );

      if (count === lastCount) {
        stableMs += pollInterval;
        if (stableMs >= stableThreshold) break;
      } else {
        stableMs = 0;
        lastCount = count;
      }
    }

    const markers: CapturedMarker[] = await page.evaluate(
      () => (window as any).__capturedMarkers || [],
    );

    return markers;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Error scraping ${stateAbbr}: ${msg}`);
    return [];
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Fuzzy name matching
// ---------------------------------------------------------------------------

const STRIP_SUFFIXES = [
  "golf club",
  "golf course",
  "country club",
  "golf resort",
  "golf & country club",
  "golf and country club",
  "golf links",
  "golf center",
  "golf centre",
  "municipal golf course",
  "public golf course",
  "cc",
  "gc",
  "g.c.",
  "c.c.",
];

function normalizeName(name: string): string {
  let n = name.toLowerCase().trim();
  // Sort suffixes by length desc so longest matches first
  const sorted = [...STRIP_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    if (n.endsWith(suffix)) {
      n = n.slice(0, -suffix.length).trim();
      break;
    }
  }
  // Remove special characters, collapse whitespace
  n = n.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  return n;
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1.0;
  if (na.length === 0 || nb.length === 0) return 0;

  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

// ---------------------------------------------------------------------------
// Extract zip from marker data (best effort)
// ---------------------------------------------------------------------------

function extractZipFromMarker(marker: CapturedMarker): string | null {
  // Check title and label for 5-digit zip patterns
  for (const field of [marker.title, marker.label]) {
    if (!field) continue;
    const match = field.match(/\b(\d{5})\b/);
    if (match) return match[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Match markers against DB courses for a state
// ---------------------------------------------------------------------------

function matchMarkersToCourses(
  markers: CapturedMarker[],
  dbCourses: DBCourse[],
): { courseId: number; match: GolfTraxxMatch }[] {
  const results: { courseId: number; match: GolfTraxxMatch }[] = [];
  const matchedCourseIds = new Set<number>();
  const matchedMarkerIdxs = new Set<number>();

  // For each marker, find the best DB course match
  for (let mi = 0; mi < markers.length; mi++) {
    const marker = markers[mi];
    if (marker.lat == null || marker.lng == null) continue;
    if (matchedMarkerIdxs.has(mi)) continue;

    const markerName = marker.title || "";
    if (!markerName) continue;

    let bestCourse: DBCourse | null = null;
    let bestScore = 0;
    let bestDist = Infinity;

    for (const course of dbCourses) {
      if (matchedCourseIds.has(course.id)) continue;
      if (course.lat == null || course.lng == null) continue;

      const dist = haversineKm(marker.lat, marker.lng, course.lat, course.lng);
      if (dist > 5) continue; // Hard filter: must be within 5km

      // Try both course_name and club_name
      const nameScore = Math.max(
        nameSimilarity(markerName, course.course_name),
        course.club_name ? nameSimilarity(markerName, course.club_name) : 0,
      );

      // Confidence thresholds based on distance
      const minConfidence = dist < 2 ? 0.6 : 0.8;
      if (nameScore < minConfidence) continue;

      // Prefer closer + higher name score
      const combinedScore = nameScore * (1 - dist / 10);
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestCourse = course;
        bestDist = dist;
      }
    }

    if (bestCourse) {
      matchedCourseIds.add(bestCourse.id);
      matchedMarkerIdxs.add(mi);

      const zip =
        extractZipFromMarker(marker) ||
        (bestCourse.postal_code && /^\d{5}$/.test(bestCourse.postal_code)
          ? bestCourse.postal_code
          : null);

      results.push({
        courseId: bestCourse.id,
        match: {
          name: markerName,
          zip,
          lat: marker.lat,
          lng: marker.lng,
          matchedAt: new Date().toISOString(),
          matchConfidence: Math.round(bestScore * 100) / 100,
        },
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Diagnostic mode
// ---------------------------------------------------------------------------

async function runDiagnostic(browser: Browser, stateAbbr: string) {
  console.log(`\n=== DIAGNOSTIC MODE — State: ${stateAbbr} ===\n`);
  console.log(`URL: https://golftraxx.com/courses-on-map-by-state?state=${stateAbbr}&static=true\n`);

  const markers = await scrapeStateIndex(browser, stateAbbr);

  console.log(`Captured ${markers.length} marker(s):\n`);
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    console.log(`  Marker ${i + 1}:`);
    console.log(`    lat: ${m.lat}`);
    console.log(`    lng: ${m.lng}`);
    console.log(`    title: ${JSON.stringify(m.title)}`);
    console.log(`    label: ${JSON.stringify(m.label)}`);
    console.log(`    icon: ${JSON.stringify(m.icon)}`);
    console.log();
  }

  // Show unique titles
  const titles = [...new Set(markers.map((m) => m.title).filter(Boolean))];
  console.log(`\nUnique titles (${titles.length}):`);
  for (const t of titles.slice(0, 50)) {
    console.log(`  - ${t}`);
  }
  if (titles.length > 50) console.log(`  ... and ${titles.length - 50} more`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== GolfTraxx Index Scraper ===\n");
  if (DRY_RUN) console.log("** DRY RUN — no DB writes **\n");

  let browser = await launchBrowser();

  try {
    const statesToScrape = STATES_ARG
      ? STATES_ARG.split(",").map((s) => s.trim().toUpperCase())
      : ALL_US_STATES;

    const limited = LIMIT ? statesToScrape.slice(0, LIMIT) : statesToScrape;

    // ----- Diagnostic mode -----
    if (DIAGNOSTIC) {
      await runDiagnostic(browser, limited[0]);
      return;
    }

    // ----- Get state ID map from DB -----
    const dbStates: { id: number; abbr: string }[] = await sql`
      SELECT s.id, s.abbr
      FROM states s
      JOIN countries c ON s.country_id = c.id
      WHERE c.name = 'United States'
    `;
    const stateIdMap = new Map(dbStates.map((s) => [s.abbr, s.id]));

    let totalMatches = 0;
    let totalMarkers = 0;
    let statesProcessed = 0;

    for (let i = 0; i < limited.length; i++) {
      const stateAbbr = limited[i];
      const stateId = stateIdMap.get(stateAbbr);
      if (!stateId) {
        console.log(`[${i + 1}/${limited.length}] ${stateAbbr} — not found in DB, skipping`);
        continue;
      }

      console.log(`[${i + 1}/${limited.length}] Scraping ${stateAbbr}...`);

      // Scrape markers
      const markers = await scrapeStateIndex(browser, stateAbbr);
      totalMarkers += markers.length;
      console.log(`  ${markers.length} markers found`);

      if (markers.length === 0) {
        statesProcessed++;
        continue;
      }

      // Fetch DB courses for this state (with lat/lng)
      const dbCourses: DBCourse[] = await sql`
        SELECT id, course_name, club_name, postal_code, lat, lng, layout_data
        FROM courses
        WHERE state_id = ${stateId}
          AND lat IS NOT NULL
          AND lng IS NOT NULL
          AND layout_data IS NOT NULL
      `;
      console.log(`  ${dbCourses.length} DB courses with coords`);

      // Match
      const matches = matchMarkersToCourses(markers, dbCourses);
      totalMatches += matches.length;
      console.log(`  ${matches.length} matches`);

      // Write matches to DB
      if (!DRY_RUN && matches.length > 0) {
        let written = 0;
        for (const { courseId, match } of matches) {
          const course = dbCourses.find((c) => c.id === courseId);
          if (!course) continue;

          try {
            const layoutObj = JSON.parse(course.layout_data || "{}");
            layoutObj.golftraxx = match;
            await sql`
              UPDATE courses
              SET layout_data = ${JSON.stringify(layoutObj)},
                  updated_at = now()
              WHERE id = ${courseId}
            `;
            written++;
          } catch (err) {
            console.error(`  Failed to update course ${courseId}: ${err}`);
          }
        }
        console.log(`  ${written} courses updated in DB`);
      } else if (DRY_RUN && matches.length > 0) {
        // In dry-run, show a few sample matches
        const sample = matches.slice(0, 5);
        for (const { courseId, match } of sample) {
          const course = dbCourses.find((c) => c.id === courseId);
          console.log(
            `    [match] "${match.name}" → DB #${courseId} "${course?.course_name}" (conf=${match.matchConfidence}, zip=${match.zip})`,
          );
        }
        if (matches.length > 5) console.log(`    ... and ${matches.length - 5} more`);
      }

      statesProcessed++;

      // Browser restart every 10 states
      if (statesProcessed % 10 === 0 && i < limited.length - 1) {
        console.log(`\n  Restarting browser after ${statesProcessed} states...\n`);
        await browser.close();
        await new Promise((r) => setTimeout(r, 5_000));
        browser = await launchBrowser();
      }

      // Delay between states
      if (i < limited.length - 1) {
        await new Promise((r) => setTimeout(r, 10_000));
      }
    }

    console.log(`\n--- Summary ---`);
    console.log(`States processed: ${statesProcessed}`);
    console.log(`Total GolfTraxx markers: ${totalMarkers}`);
    console.log(`Total DB matches: ${totalMatches}`);
    console.log(`Match rate: ${totalMarkers > 0 ? ((totalMatches / totalMarkers) * 100).toFixed(1) : 0}% of markers matched`);
  } finally {
    await browser.close();
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
