/**
 * scrape-green-centers-v2.ts
 *
 * Searches GolfTraxx by course name via /courses-by-name, matches results
 * against our DB courses, then navigates to /full-layout to scrape green
 * center coordinates. Combines search + scrape into a single pass, bypassing
 * the 700-marker limit of state index pages.
 *
 * Usage:
 *   npx tsx scripts/scrape-green-centers-v2.ts [options]
 *
 * Options:
 *   --course-id <id>          Single course (for testing)
 *   --limit <n>               Max courses to process (default: all)
 *   --delay <ms>              Delay between courses (default: 3000)
 *   --cooldown-interval <n>   Restart browser every N courses (default: 50)
 *   --dry-run                 Log results without writing to DB
 *   --min-confidence <n>      Match threshold 0-1 (default: 0.6)
 *   --retry-failed            Include courses with a prior greenCenterAttemptedAt
 *   --verbose                 Extra logging
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

const COURSE_ID = getArg("--course-id");
const LIMIT = getArg("--limit") ? parseInt(getArg("--limit")!, 10) : null;
const DELAY_MS = parseInt(getArg("--delay") || "3000", 10);
const COOLDOWN_INTERVAL = parseInt(getArg("--cooldown-interval") || "50", 10);
const DRY_RUN = process.argv.includes("--dry-run");
const MIN_CONFIDENCE = parseFloat(getArg("--min-confidence") || "0.6");
const RETRY_FAILED = process.argv.includes("--retry-failed");
const VERBOSE = process.argv.includes("--verbose");

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

type GreenCenter = { lat: number; lng: number };

type LayoutData = {
  teeboxes: unknown[];
  hole_count: number;
  greenCenters?: Record<string, GreenCenter>;
  greenCenterAttemptedAt?: string;
  golftraxx?: {
    name: string;
    matchedAt: string;
    matchConfidence: number;
    source: string;
    zip?: string | null;
  };
};

type DBCourse = {
  id: number;
  course_name: string;
  club_name: string | null;
  street: string | null;
  state: string | null;
  postal_code: string | null;
  layout_data: string | null;
  city_name: string | null;
};

type SearchResult = {
  courseName: string;
  address: {
    street: string;
    city: string;
    state: string;
  };
  formData: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Marker interception script — injected BEFORE page scripts run
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
// Name matching utilities (from scrape-golftraxx-index.ts)
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
  const sorted = [...STRIP_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    if (n.endsWith(suffix)) {
      n = n.slice(0, -suffix.length).trim();
      break;
    }
  }
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
// Identify the green center marker from captured markers
// ---------------------------------------------------------------------------

function identifyGreenCenter(markers: CapturedMarker[]): GreenCenter | null {
  if (markers.length === 0) return null;

  // Strategy 1: title="greencenter" exactly
  for (const m of markers) {
    const title = (m.title || "").toLowerCase();
    if (title === "greencenter") {
      if (m.lat != null && m.lng != null) return { lat: m.lat, lng: m.lng };
    }
  }

  // Strategy 2: icon URL containing "PinCenter"
  for (const m of markers) {
    const icon = m.icon || "";
    if (icon.includes("PinCenter.png")) {
      if (m.lat != null && m.lng != null) return { lat: m.lat, lng: m.lng };
    }
  }

  // Strategy 3: title loosely containing "center" but not PinCenterGreen icon
  for (const m of markers) {
    const title = (m.title || "").toLowerCase();
    const icon = m.icon || "";
    if (title.includes("center") && !icon.includes("PinCenterGreen")) {
      if (m.lat != null && m.lng != null) return { lat: m.lat, lng: m.lng };
    }
  }

  // Strategy 4: if greenfront and greenback exist, pick the one that's neither
  const frontIdx = markers.findIndex(
    (m) => (m.title || "").toLowerCase() === "greenfront",
  );
  const backIdx = markers.findIndex(
    (m) => (m.title || "").toLowerCase() === "greenback",
  );
  if (frontIdx !== -1 && backIdx !== -1) {
    for (let i = 0; i < markers.length; i++) {
      if (
        i !== frontIdx &&
        i !== backIdx &&
        ((m) =>
          m.title !== "tee_target" && !(m.title || "").includes("Tee"))(
          markers[i],
        ) &&
        markers[i].lat != null &&
        markers[i].lng != null
      ) {
        return { lat: markers[i].lat, lng: markers[i].lng };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

function isConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Connection closed") || msg.includes("net::ERR_CONNECTION")
  );
}

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (
      type === "image" ||
      type === "stylesheet" ||
      type === "font" ||
      type === "media"
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });
  return page;
}

// ---------------------------------------------------------------------------
// Step 1: Search GolfTraxx by name
// ---------------------------------------------------------------------------

function buildSearchTerms(course: DBCourse): string[] {
  const raw = course.club_name || course.course_name;
  const terms: string[] = [];

  // 1. Strip common golf suffixes for broader search
  const stripped = raw
    .replace(
      /\s*(Golf\s*(Club|Course|Resort|Center|Centre|Links)|Country\s*Club)\s*$/i,
      "",
    )
    .trim();

  // 2. Full stripped name first
  terms.push(stripped);

  // 3. If different, also try the full raw name (with suffix)
  if (stripped !== raw) terms.push(raw);

  // 4. Progressively strip words from end of stripped name
  //    e.g. "Bella Vista Poa" → "Bella Vista"
  const words = stripped.split(/\s+/);
  for (let i = words.length - 1; i >= 2; i--) {
    const shorter = words.slice(0, i).join(" ");
    if (!terms.includes(shorter)) terms.push(shorter);
  }

  return terms;
}

async function searchGolfTraxx(
  browser: Browser,
  searchTerm: string,
): Promise<SearchResult[]> {
  const page = await setupPage(browser);

  try {
    const encoded = encodeURIComponent(searchTerm);
    const url = `https://golftraxx.com/courses-by-name?coursename=${encoded}&static=true`;

    if (VERBOSE) console.log(`  URL: ${url}`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });

    // Wait for the results table to appear (or timeout if no results)
    try {
      await page.waitForSelector("table.table-footable tbody tr", {
        timeout: 5000,
      });
    } catch {
      // No results table — likely no matches
      return [];
    }

    // Extract rows from the results table
    const results: SearchResult[] = await page.evaluate(() => {
      const rows = document.querySelectorAll(
        "table.table-footable tbody tr",
      );
      const parsed: SearchResult[] = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 2) return;

        // First cell: course name (td.coursename or first td)
        const nameCell =
          row.querySelector("td.coursename") || cells[0];
        const courseName = (nameCell?.textContent || "").trim();

        // Second cell: address — contains a Google Maps link
        const addressCell = cells[1];
        const addressHtml = addressCell?.innerHTML || "";
        const addressText = (addressCell?.textContent || "").trim();

        // Parse address: typically "123 Main St\nCity, ST" or similar
        let street = "";
        let city = "";
        let state = "";

        // Try to split by <br> first
        const parts = addressHtml
          .split(/<br\s*\/?>/i)
          .map((p) => p.replace(/<[^>]+>/g, "").trim())
          .filter(Boolean);

        if (parts.length >= 2) {
          street = parts[0];
          const cityState = parts[parts.length - 1];
          const csMatch = cityState.match(
            /^(.+?),\s*([A-Z]{2})\s*$/,
          );
          if (csMatch) {
            city = csMatch[1].trim();
            state = csMatch[2].trim();
          } else {
            city = cityState;
          }
        } else {
          // Fallback: try to parse from plain text
          const csMatch = addressText.match(
            /^(.+?)\s+(.+?),\s*([A-Z]{2})\s*$/,
          );
          if (csMatch) {
            street = csMatch[1].trim();
            city = csMatch[2].trim();
            state = csMatch[3].trim();
          }
        }

        // Extract form data from form[name="viewcard"]
        const form = row.querySelector(
          'form[name="viewcard"]',
        ) as HTMLFormElement | null;
        const formData: Record<string, string> = {};
        if (form) {
          const inputs = form.querySelectorAll(
            "input[type=hidden]",
          );
          inputs.forEach((input) => {
            const inp = input as HTMLInputElement;
            if (inp.name) formData[inp.name] = inp.value || "";
          });
        }

        parsed.push({
          courseName,
          address: { street, city, state },
          formData,
        });
      });

      return parsed;
    });

    return results;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Search error: ${msg}`);
    return [];
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Step 3: Match search results against DB course
// ---------------------------------------------------------------------------

function scoreMatch(
  result: SearchResult,
  course: DBCourse,
): number {
  // --- Name score (0–1) ---
  const nameScores: number[] = [
    nameSimilarity(result.courseName, course.course_name),
  ];
  if (course.club_name) {
    nameScores.push(nameSimilarity(result.courseName, course.club_name));
  }
  const nameScore = Math.max(...nameScores);

  // --- Address score (0–1) ---
  // Build from available signals, weighted by reliability
  let addressPoints = 0;
  let addressMax = 0;

  // State match (most reliable — 2-letter code)
  if (result.address.state && course.state) {
    addressMax += 0.35;
    if (result.address.state.toUpperCase() === course.state.toUpperCase()) {
      addressPoints += 0.35;
    }
  }

  // City match (use levenshtein similarity to handle minor spelling diffs)
  if (result.address.city && course.city_name) {
    addressMax += 0.30;
    const citySim = nameSimilarity(result.address.city, course.city_name);
    addressPoints += 0.30 * citySim;
  }

  // Street name similarity
  if (result.address.street && course.street) {
    addressMax += 0.20;
    const resultStreet = result.address.street.replace(/^\d+\s*/, "").trim().toLowerCase();
    const courseStreet = course.street.replace(/^\d+\s*/, "").trim().toLowerCase();
    if (resultStreet && courseStreet) {
      const streetSim = nameSimilarity(resultStreet, courseStreet);
      addressPoints += 0.20 * streetSim;
    }

    // Street number exact match — extra signal
    addressMax += 0.15;
    const resultNum = result.address.street.match(/^\d+/);
    const courseNum = course.street.match(/^\d+/);
    if (resultNum && courseNum && resultNum[0] === courseNum[0]) {
      addressPoints += 0.15;
    }
  }

  // Normalize: if we had address data, score = points/max; if no data, assume neutral (0.5)
  const addressScore = addressMax > 0 ? addressPoints / addressMax : 0.5;

  // --- Hard penalty: state mismatch when both present ---
  const stateMismatch =
    result.address.state && course.state &&
    result.address.state.toUpperCase() !== course.state.toUpperCase();

  if (stateMismatch) {
    // Different state = almost certainly wrong course. Cap score low.
    return nameScore * 0.3;
  }

  // --- Combined score: 55% name, 45% address ---
  return 0.55 * nameScore + 0.45 * addressScore;
}

function findBestMatch(
  results: SearchResult[],
  course: DBCourse,
): { result: SearchResult; score: number } | null {
  let best: { result: SearchResult; score: number } | null = null;

  for (const result of results) {
    const score = scoreMatch(result, course);
    if (score >= MIN_CONFIDENCE && (!best || score > best.score)) {
      best = { result, score };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Step 4 & 5: Navigate to /full-layout and extract green centers
// ---------------------------------------------------------------------------

async function scrapeFullLayout(
  browser: Browser,
  match: SearchResult,
  holeCount: number,
): Promise<Record<string, GreenCenter> | null> {
  const page = await setupPage(browser);

  try {
    // Inject marker interceptor before navigation
    await page.evaluateOnNewDocument(MARKER_INTERCEPTOR);

    // Build the full-layout URL from form data
    const formData = match.formData;
    const params = new URLSearchParams(formData);
    const url = `https://golftraxx.com/full-layout?${params.toString()}`;

    if (VERBOSE) console.log(`  Full layout URL: ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Poll for markers (up to 5s) — faster than fixed sleep, still bounded
    const markerDeadline = Date.now() + 5000;
    let markers: CapturedMarker[] = [];
    while (Date.now() < markerDeadline) {
      markers = await page.evaluate(
        () => (window as any).__capturedMarkers || [],
      );
      if (markers.length > 0) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    if (VERBOSE) {
      console.log(`  Full layout: ${markers.length} markers captured`);
      for (const m of markers.slice(0, 10)) {
        console.log(
          `    marker: title=${JSON.stringify(m.title)}, icon=${JSON.stringify(m.icon)?.slice(0, 60)}, lat=${m.lat}, lng=${m.lng}`,
        );
      }
      if (markers.length > 10) console.log(`    ... and ${markers.length - 10} more`);
    }

    // Check if this is a multi-hole view (many markers) or single-hole view
    // On full-layout, markers often have hole-specific titles/labels
    const greenCenters: Record<string, GreenCenter> = {};

    // Try to group markers by hole and extract green centers
    // GolfTraxx full-layout typically shows all holes on one map
    // with markers titled per hole (e.g., "greencenter", numbered labels, etc.)

    // Strategy A: If markers have hole-specific info, group them
    // Look for markers with numeric labels or hole-number titles
    const holeGroups = new Map<number, CapturedMarker[]>();

    for (const m of markers) {
      // Check label for hole number
      let holeNum: number | null = null;
      if (m.label) {
        const labelNum = parseInt(m.label, 10);
        if (!isNaN(labelNum) && labelNum >= 1 && labelNum <= holeCount) {
          holeNum = labelNum;
        }
      }
      // Check title for hole number patterns
      if (!holeNum && m.title) {
        const holeMatch = m.title.match(/\b(\d{1,2})\b/);
        if (holeMatch) {
          const n = parseInt(holeMatch[1], 10);
          if (n >= 1 && n <= holeCount) holeNum = n;
        }
      }

      if (holeNum) {
        if (!holeGroups.has(holeNum)) holeGroups.set(holeNum, []);
        holeGroups.get(holeNum)!.push(m);
      }
    }

    // If we got hole-specific markers, extract green centers per hole
    if (holeGroups.size > 0) {
      if (VERBOSE)
        console.log(`  Found markers for ${holeGroups.size} holes (grouped by label/title)`);

      for (const [hole, holeMarkers] of holeGroups) {
        const gc = identifyGreenCenter(holeMarkers);
        if (gc) greenCenters[`hole-${hole}`] = gc;
      }
    }

    // Strategy B: If no hole grouping worked, try all markers as a single set
    // (some pages show one hole at a time or have ungrouped markers)
    if (Object.keys(greenCenters).length === 0 && markers.length > 0) {
      // Look for green center markers without hole grouping
      // If there's exactly one green center marker, assign to hole-1
      // Otherwise, try hole-by-hole navigation fallback
      const singleGC = identifyGreenCenter(markers);
      if (singleGC && markers.length <= 10) {
        // Likely single-hole view — fall back to hole-by-hole scraping
        if (VERBOSE)
          console.log("  Single-hole view detected, falling back to hole-by-hole");
        await page.close();
        return await scrapeHoleByHole(browser, match, holeCount);
      }
    }

    // If full layout gave us green centers, return them
    if (Object.keys(greenCenters).length > 0) {
      return greenCenters;
    }

    // Strategy C: Full layout didn't yield grouped results —
    // fall back to hole-by-hole navigation
    if (VERBOSE)
      console.log("  Full layout didn't yield grouped markers, trying hole-by-hole");
    await page.close();
    return await scrapeHoleByHole(browser, match, holeCount);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Full layout error: ${msg}`);
    await page.close();
    // Fall back to hole-by-hole
    return await scrapeHoleByHole(browser, match, holeCount);
  }
}

// ---------------------------------------------------------------------------
// Hole-by-hole fallback (using coursename + zip from search result)
// ---------------------------------------------------------------------------

function buildHoleUrl(courseName: string, zip: string, hole: number): string {
  const name = encodeURIComponent(courseName.replace(/'/g, "")).replace(
    /%20/g,
    "+",
  );
  return `https://golftraxx.com/hole-layout?coursename=${name}&zipcode=${zip}&hole=${hole}&static=true`;
}

async function scrapeHoleByHole(
  browser: Browser,
  match: SearchResult,
  holeCount: number,
): Promise<Record<string, GreenCenter> | null> {
  // Extract zip from form data or address
  const zip =
    match.formData["zipcode"] ||
    match.formData["zip"] ||
    "";

  if (!zip) {
    if (VERBOSE) console.log("  No zip available for hole-by-hole fallback");
    return null;
  }

  const courseName = match.courseName;
  const greenCenters: Record<string, GreenCenter> = {};
  let found = 0;

  for (let hole = 1; hole <= holeCount; hole++) {
    const page = await setupPage(browser);

    try {
      await page.evaluateOnNewDocument(MARKER_INTERCEPTOR);

      const url = buildHoleUrl(courseName, zip, hole);
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (response?.status() === 404) {
        process.stdout.write(`  Hole ${hole}: 404\n`);
        continue;
      }

      // Poll for markers (up to 3s) — single hole loads faster than full layout
      const holeDeadline = Date.now() + 3000;
      let markers: CapturedMarker[] = [];
      while (Date.now() < holeDeadline) {
        markers = await page.evaluate(
          () => (window as any).__capturedMarkers || [],
        );
        if (markers.length > 0) break;
        await new Promise((r) => setTimeout(r, 250));
      }

      const gc = identifyGreenCenter(markers);
      if (gc) {
        greenCenters[`hole-${hole}`] = gc;
        found++;
        if (VERBOSE)
          process.stdout.write(
            `  Hole ${hole}: ${gc.lat.toFixed(6)}, ${gc.lng.toFixed(6)}\n`,
          );
      } else if (VERBOSE) {
        process.stdout.write(
          `  Hole ${hole}: no green center (${markers.length} markers)\n`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (VERBOSE) console.error(`  Hole ${hole} error: ${msg}`);
    } finally {
      await page.close();
    }

    // Delay between holes
    if (hole < holeCount) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (found === 0) return null;
  return greenCenters;
}

// ---------------------------------------------------------------------------
// Process a single course end-to-end
// ---------------------------------------------------------------------------

async function processCourse(
  browser: Browser,
  course: DBCourse,
): Promise<{
  greenCenters: Record<string, GreenCenter> | null;
  matchInfo: { name: string; score: number } | null;
}> {
  // Parse hole count from layout_data
  let holeCount = 18;
  if (course.layout_data) {
    try {
      const ld = JSON.parse(course.layout_data) as LayoutData;
      holeCount = ld.hole_count || 18;
    } catch {}
  }

  // Step 1: Search GolfTraxx — try each term until we get results
  const searchTerms = buildSearchTerms(course);
  let results: SearchResult[] = [];
  let usedSearchTerm = "";

  for (const term of searchTerms) {
    console.log(`  Searching: "${term}"...`);
    results = await searchGolfTraxx(browser, term);
    console.log(`  Found ${results.length} results`);
    if (results.length > 0) {
      usedSearchTerm = term;
      break;
    }
  }

  if (results.length === 0) {
    return { greenCenters: null, matchInfo: null };
  }

  // Step 2: Find best match (course_name used for scoring/disambiguation)
  const best = findBestMatch(results, course);
  if (!best) {
    if (VERBOSE) {
      console.log("  No match above confidence threshold. Scores:");
      for (const r of results.slice(0, 5)) {
        const s = scoreMatch(r, course);
        console.log(
          `    "${r.courseName}" (${r.address.street || "?"}, ${r.address.city || "?"}, ${r.address.state || "?"}) → ${s.toFixed(2)}`,
        );
      }
    }
    return { greenCenters: null, matchInfo: null };
  }

  console.log(
    `  Best match: "${best.result.courseName}" (score=${best.score.toFixed(2)}, ${best.result.address.street || "?"}, ${best.result.address.city || "?"}, ${best.result.address.state || "?"})`,
  );

  // Step 3: Navigate to full-layout and extract green centers
  console.log("  Navigating to full-layout...");
  const greenCenters = await scrapeFullLayout(
    browser,
    best.result,
    holeCount,
  );

  return {
    greenCenters,
    matchInfo: { name: best.result.courseName, score: best.score },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== GolfTraxx Green Center Scraper v2 (Name Search) ===\n");
  if (DRY_RUN) console.log("** DRY RUN — no DB writes **\n");
  console.log(
    `Settings: limit=${LIMIT ?? "all"}, delay=${DELAY_MS}ms, cooldown=${COOLDOWN_INTERVAL}, min-confidence=${MIN_CONFIDENCE}\n`,
  );

  let browser = await launchBrowser();

  try {
    // ----- Fetch candidate courses -----
    let courses: DBCourse[];

    if (COURSE_ID) {
      courses = await sql`
        SELECT c.id, c.course_name, c.club_name, c.street, c.state, c.postal_code,
               c.layout_data::text as layout_data, ci.name as city_name
        FROM courses c
        LEFT JOIN cities ci ON ci.id = c.city_id
        WHERE c.id = ${COURSE_ID}
      `;
    } else {
      const attemptFilter = RETRY_FAILED
        ? sql``
        : sql`AND c.layout_data NOT LIKE '%greenCenterAttemptedAt%'`;

      courses = await sql`
        SELECT c.id, c.course_name, c.club_name, c.street, c.state, c.postal_code,
               c.layout_data::text as layout_data, ci.name as city_name
        FROM courses c
        LEFT JOIN cities ci ON ci.id = c.city_id
        WHERE c.layout_data IS NOT NULL
          AND c.layout_data NOT LIKE '%"greenCenters":%'
          ${attemptFilter}
        ORDER BY c.id
        ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
      `;
    }

    if (courses.length === 0) {
      console.log("No courses found to process.");
      return;
    }

    console.log(`Found ${courses.length} course(s) to process\n`);

    // Counters
    let greenCentersFound = 0;
    let noMatch = 0;
    let matchNoMarkers = 0;
    let coursesSinceCooldown = 0;

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      console.log(
        `[${i + 1}/${courses.length}] ${course.club_name || course.course_name} (id=${course.id})`,
      );

      // Periodic cooldown with browser restart
      if (coursesSinceCooldown >= COOLDOWN_INTERVAL) {
        console.log(
          `\nCooldown: pausing 30s and restarting browser (after ${COOLDOWN_INTERVAL} courses)...`,
        );
        await browser.close();
        await new Promise((r) => setTimeout(r, 30_000));
        browser = await launchBrowser();
        coursesSinceCooldown = 0;
        console.log("Browser restarted, resuming.\n");
      }

      try {
        const { greenCenters, matchInfo } = await processCourse(
          browser,
          course,
        );

        if (
          greenCenters &&
          Object.keys(greenCenters).length > 0
        ) {
          const holeCount =
            (() => {
              try {
                return (JSON.parse(course.layout_data || "{}") as LayoutData)
                  .hole_count || 18;
              } catch {
                return 18;
              }
            })();
          console.log(
            `  Captured ${Object.keys(greenCenters).length}/${holeCount} green centers ✓`,
          );

          if (!DRY_RUN) {
            // Safety: re-read current layout_data to prevent overwriting
            const [current] = await sql`
              SELECT layout_data::text as layout_data
              FROM courses
              WHERE id = ${course.id}
            `;
            const currentLayout = current?.layout_data || course.layout_data;
            if (
              currentLayout &&
              currentLayout.includes('"greenCenters":')
            ) {
              console.log(
                "  => Skipping DB write — course already has greenCenters (race condition guard)",
              );
            } else {
              let layoutObj: LayoutData;
              try {
                layoutObj = JSON.parse(
                  currentLayout || "{}",
                ) as LayoutData;
              } catch {
                layoutObj = { teeboxes: [], hole_count: 18 };
              }
              layoutObj.greenCenters = greenCenters;
              layoutObj.golftraxx = {
                name: matchInfo!.name,
                matchedAt: new Date().toISOString(),
                matchConfidence:
                  Math.round(matchInfo!.score * 100) / 100,
                source: "name-search",
              };

              await sql`
                UPDATE courses
                SET layout_data = ${JSON.stringify(layoutObj)},
                    updated_at = now()
                WHERE id = ${course.id}
              `;
              console.log("  => DB updated");
            }
          } else {
            console.log("  => Would update DB (dry-run)");
          }
          greenCentersFound++;
        } else if (!matchInfo) {
          // No GolfTraxx match found
          if (!DRY_RUN && course.layout_data) {
            try {
              const layoutObj = JSON.parse(course.layout_data);
              layoutObj.greenCenterAttemptedAt =
                new Date().toISOString();
              await sql`
                UPDATE courses
                SET layout_data = ${JSON.stringify(layoutObj)},
                    updated_at = now()
                WHERE id = ${course.id}
              `;
            } catch {
              /* best effort */
            }
          }
          console.log("  => No GolfTraxx match found");
          noMatch++;
        } else {
          // Match found but no markers captured
          if (!DRY_RUN && course.layout_data) {
            try {
              const layoutObj = JSON.parse(course.layout_data);
              layoutObj.greenCenterAttemptedAt =
                new Date().toISOString();
              layoutObj.golftraxx = {
                name: matchInfo.name,
                matchedAt: new Date().toISOString(),
                matchConfidence:
                  Math.round(matchInfo.score * 100) / 100,
                source: "name-search",
              };
              await sql`
                UPDATE courses
                SET layout_data = ${JSON.stringify(layoutObj)},
                    updated_at = now()
                WHERE id = ${course.id}
              `;
            } catch {
              /* best effort */
            }
          }
          console.log("  => Match found, but no green center markers captured");
          matchNoMarkers++;
        }
      } catch (err) {
        if (isConnectionError(err)) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  => Connection error: ${msg}`);
          console.log(
            "  => Pausing 30s and restarting browser...",
          );
          try {
            await browser.close();
          } catch {
            /* already dead */
          }
          await new Promise((r) => setTimeout(r, 30_000));
          browser = await launchBrowser();
          coursesSinceCooldown = 0;

          // Retry once
          try {
            console.log(
              `  => Retrying ${course.club_name || course.course_name}...`,
            );
            const { greenCenters, matchInfo } =
              await processCourse(browser, course);
            if (
              greenCenters &&
              Object.keys(greenCenters).length > 0
            ) {
              if (!DRY_RUN) {
                const [current] = await sql`
                  SELECT layout_data::text as layout_data
                  FROM courses
                  WHERE id = ${course.id}
                `;
                const currentLayout =
                  current?.layout_data || course.layout_data;
                if (
                  currentLayout &&
                  currentLayout.includes('"greenCenters":')
                ) {
                  console.log(
                    "  => Skipping (already has greenCenters)",
                  );
                } else {
                  let layoutObj: LayoutData;
                  try {
                    layoutObj = JSON.parse(
                      currentLayout || "{}",
                    ) as LayoutData;
                  } catch {
                    layoutObj = {
                      teeboxes: [],
                      hole_count: 18,
                    };
                  }
                  layoutObj.greenCenters = greenCenters;
                  layoutObj.golftraxx = {
                    name: matchInfo!.name,
                    matchedAt: new Date().toISOString(),
                    matchConfidence:
                      Math.round(matchInfo!.score * 100) / 100,
                    source: "name-search",
                  };
                  await sql`
                    UPDATE courses
                    SET layout_data = ${JSON.stringify(layoutObj)},
                        updated_at = now()
                    WHERE id = ${course.id}
                  `;
                  console.log("  => DB updated (on retry)");
                }
              }
              greenCentersFound++;
            } else {
              noMatch++;
            }
          } catch (retryErr) {
            const retryMsg =
              retryErr instanceof Error
                ? retryErr.message
                : String(retryErr);
            console.error(
              `  => Retry also failed: ${retryMsg}, skipping`,
            );
            noMatch++;
          }
        } else {
          const msg =
            err instanceof Error ? err.message : String(err);
          console.error(`  => Error: ${msg}`);
          noMatch++;
        }
      }

      coursesSinceCooldown++;
      console.log();

      // Delay between courses
      if (i < courses.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    console.log("=== Results ===");
    console.log(`Processed: ${courses.length}`);
    console.log(`Green centers found: ${greenCentersFound}`);
    console.log(`No GolfTraxx match: ${noMatch}`);
    console.log(`Match found, no markers: ${matchNoMarkers}`);
  } finally {
    await browser.close();
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
