/**
 * scrape-green-centers.ts
 *
 * Scrapes green center coordinates from GolfTraxx.com hole-layout pages
 * using Puppeteer with Google Maps Marker constructor interception.
 *
 * Usage:
 *   npx tsx scripts/scrape-green-centers.ts [options]
 *
 * Options:
 *   --course-id <id>          Single course (for testing)
 *   --limit <n>               Max courses to process (default: 10)
 *   --delay <ms>              Delay between hole page loads (default: 3000)
 *   --course-delay <ms>       Delay between courses (default: 8000)
 *   --cooldown-interval <n>   Restart browser every N courses (default: 50)
 *   --dry-run                 Log results without writing to DB
 *   --diagnostic              Dump all marker data for first hole only (Phase 1)
 */

import "dotenv/config";
import postgres from "postgres";
import puppeteer, { type Browser, type Page } from "puppeteer";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const COURSE_ID = getArg("--course-id");
const LIMIT = parseInt(getArg("--limit") || "10", 10);
const DELAY_MS = parseInt(getArg("--delay") || "1500", 10);
const COURSE_DELAY_MS = parseInt(getArg("--course-delay") || "4000", 10);
const COOLDOWN_INTERVAL = parseInt(getArg("--cooldown-interval") || "50", 10);
const DRY_RUN = process.argv.includes("--dry-run");
const DIAGNOSTIC = process.argv.includes("--diagnostic");

const COMMON_SUFFIXES = [
  "Golf Club",
  "Golf Course",
  "Country Club",
  "Golf Resort",
];

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
};

// ---------------------------------------------------------------------------
// Marker interception script — injected BEFORE page scripts run
// ---------------------------------------------------------------------------

const MARKER_INTERCEPTOR = `
(function() {
  window.__capturedMarkers = [];
  window.__gmapsPatched = false;

  // Patch as soon as google.maps.Marker is available
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
      } catch(e) {
        // swallow
      }
      return marker;
    };
    // Copy prototype and static methods
    google.maps.Marker.prototype = OriginalMarker.prototype;
    Object.keys(OriginalMarker).forEach(function(key) {
      try { google.maps.Marker[key] = OriginalMarker[key]; } catch(e) {}
    });
  }

  // Poll until google.maps.Marker exists, then patch
  const interval = setInterval(function() {
    patchMarker();
    if (window.__gmapsPatched) clearInterval(interval);
  }, 50);

  // Also try on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', patchMarker);
})();
`;

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

function buildHoleUrl(courseName: string, zip: string, hole: number): string {
  const name = encodeURIComponent(courseName.replace(/'/g, "")).replace(/%20/g, "+");
  return `https://golftraxx.com/hole-layout?coursename=${name}&zipcode=${zip}&hole=${hole}&static=true`;
}

// ---------------------------------------------------------------------------
// Scrape a single hole page
// ---------------------------------------------------------------------------

async function scrapeHole(
  browser: Browser,
  courseName: string,
  zip: string,
  hole: number,
): Promise<{ markers: CapturedMarker[]; greenCenter: GreenCenter | null }> {
  const url = buildHoleUrl(courseName, zip, hole);
  const page: Page = await browser.newPage();

  try {
    // Set a realistic user-agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Block unnecessary resources (images, CSS, fonts) — we only need JS for markers
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (type === "image" || type === "stylesheet" || type === "font" || type === "media") {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Inject marker interceptor before page scripts run
    await page.evaluateOnNewDocument(MARKER_INTERCEPTOR);

    // Navigate and wait for network to mostly settle
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Check for 404 (course not found on GolfTraxx)
    if (response?.status() === 404) {
      return { markers: [], greenCenter: null };
    }

    // Give extra time for Google Maps to init and create markers
    await new Promise((r) => setTimeout(r, 1500));

    // Retrieve captured markers
    const markers: CapturedMarker[] = await page.evaluate(
      () => (window as any).__capturedMarkers || [],
    );

    // Identify the "Center" green marker
    const greenCenter = identifyGreenCenter(markers);

    return { markers, greenCenter };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Hole ${hole} error: ${msg}`);
    return { markers: [], greenCenter: null };
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Identify the green center marker from captured markers
// ---------------------------------------------------------------------------

function identifyGreenCenter(markers: CapturedMarker[]): GreenCenter | null {
  if (markers.length === 0) return null;

  // Strategy 1 (primary): GolfTraxx uses title="greencenter" exactly
  for (const m of markers) {
    const title = (m.title || "").toLowerCase();
    if (title === "greencenter") {
      if (m.lat != null && m.lng != null) return { lat: m.lat, lng: m.lng };
    }
  }

  // Strategy 2: icon URL containing "PinCenter" (the green center pin image)
  for (const m of markers) {
    const icon = (m.icon || "");
    if (icon.includes("PinCenter.png")) {
      if (m.lat != null && m.lng != null) return { lat: m.lat, lng: m.lng };
    }
  }

  // Strategy 3: title loosely containing "center" but not "PinCenterGreen"
  // (PinCenterGreen is a tee marker, not a green marker)
  for (const m of markers) {
    const title = (m.title || "").toLowerCase();
    const icon = (m.icon || "");
    if (title.includes("center") && !icon.includes("PinCenterGreen")) {
      if (m.lat != null && m.lng != null) return { lat: m.lat, lng: m.lng };
    }
  }

  // Strategy 4: If we have markers with "greenfront" and "greenback",
  // pick the one that's neither
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
        (m => m.title !== "tee_target" && !(m.title || "").includes("Tee"))(markers[i]) &&
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
// Diagnostic mode — dump all marker info for a single hole
// ---------------------------------------------------------------------------

async function runDiagnostic(browser: Browser) {
  let courseName: string;
  let zip: string;

  if (COURSE_ID) {
    const row = (
      await sql`
        SELECT course_name, postal_code FROM courses WHERE id = ${COURSE_ID}
      `
    )[0];
    if (!row?.course_name || !row?.postal_code) {
      console.error("Could not find course for diagnostic. Provide a valid --course-id.");
      return;
    }
    courseName = row.course_name;
    zip = row.postal_code;
  } else {
    // Default: Green Knoll Golf Course (known working on GolfTraxx)
    courseName = "Green Knoll Golf Course";
    zip = "08807";
  }

  console.log(`\n=== DIAGNOSTIC MODE ===`);
  console.log(`Course: ${courseName}`);
  console.log(`Zip: ${zip}`);
  console.log(`URL: ${buildHoleUrl(courseName, zip, 1)}\n`);

  const { markers, greenCenter } = await scrapeHole(browser, courseName, zip, 1);

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

  if (greenCenter) {
    console.log(`Identified green center: ${greenCenter.lat}, ${greenCenter.lng}`);
  } else {
    console.log(`Could not identify green center from markers.`);
  }
}

// ---------------------------------------------------------------------------
// Common-suffix fallback — try appending "Golf Club", "Golf Course", etc.
// ---------------------------------------------------------------------------

async function trySuffixFallback(
  browser: Browser,
  baseName: string,
  zip: string,
): Promise<{ courseName: string; greenCenter: GreenCenter | null } | null> {
  const lower = baseName.toLowerCase();
  // Skip if the name already ends with one of these suffixes
  if (COMMON_SUFFIXES.some((s) => lower.endsWith(s.toLowerCase()))) {
    return null;
  }
  // Skip compound sub-course names (e.g. "Blue/Red", "Dogwood/Pines") — won't match individually
  if (baseName.includes("/")) {
    return null;
  }

  for (const suffix of COMMON_SUFFIXES) {
    const candidate = `${baseName} ${suffix}`;
    console.log(`  Trying suffix fallback "${candidate}"...`);
    const { markers, greenCenter } = await scrapeHole(browser, candidate, zip, 1);
    if (markers.length > 0) {
      console.log(`  => Suffix fallback hit: "${candidate}"`);
      return { courseName: candidate, greenCenter };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Full extraction for a single course
// ---------------------------------------------------------------------------

async function scrapeCourse(
  browser: Browser,
  course: {
    id: number;
    course_name: string;
    club_name: string | null;
    postal_code: string;
    layout_data: string | null;
  },
): Promise<Record<string, GreenCenter> | null> {
  // Parse hole count from layout_data
  let holeCount = 18;
  let existingLayout: LayoutData | null = null;
  if (course.layout_data) {
    try {
      existingLayout = JSON.parse(course.layout_data) as LayoutData;
      holeCount = existingLayout.hole_count || 18;
    } catch {
      // default to 18
    }
  }

  const zip = course.postal_code;
  const greenCenters: Record<string, GreenCenter> = {};
  let found = 0;
  let missed = 0;

  // Try course_name first; if hole 1 fails, try club_name as fallback
  let courseName = course.course_name;
  const { markers: h1Markers, greenCenter: h1Center } = await scrapeHole(browser, courseName, zip, 1);
  if (h1Markers.length === 0 && course.club_name && course.club_name !== course.course_name) {
    console.log(`  Trying club_name "${course.club_name}" instead...`);
    const fallback = await scrapeHole(browser, course.club_name, zip, 1);
    if (fallback.markers.length > 0) {
      courseName = course.club_name;
      if (fallback.greenCenter) {
        greenCenters["hole-1"] = fallback.greenCenter;
        found++;
        process.stdout.write(`  Hole 1: ${fallback.greenCenter.lat.toFixed(6)}, ${fallback.greenCenter.lng.toFixed(6)}\n`);
      } else {
        missed++;
        process.stdout.write(`  Hole 1: no green center found\n`);
      }
    } else {
      // club_name also failed — try common suffix fallback
      const suffixHit = await trySuffixFallback(browser, course.course_name, zip);
      if (suffixHit) {
        courseName = suffixHit.courseName;
        if (suffixHit.greenCenter) {
          greenCenters["hole-1"] = suffixHit.greenCenter;
          found++;
          process.stdout.write(`  Hole 1: ${suffixHit.greenCenter.lat.toFixed(6)}, ${suffixHit.greenCenter.lng.toFixed(6)}\n`);
        } else {
          missed++;
          process.stdout.write(`  Hole 1: no green center found\n`);
        }
      } else {
        console.log(`  => Course not found on GolfTraxx, skipping`);
        return null;
      }
    }
  } else if (h1Markers.length === 0) {
    // course_name returned 0 markers and no club_name to try — try suffix fallback
    const suffixHit = await trySuffixFallback(browser, course.course_name, zip);
    if (suffixHit) {
      courseName = suffixHit.courseName;
      if (suffixHit.greenCenter) {
        greenCenters["hole-1"] = suffixHit.greenCenter;
        found++;
        process.stdout.write(`  Hole 1: ${suffixHit.greenCenter.lat.toFixed(6)}, ${suffixHit.greenCenter.lng.toFixed(6)}\n`);
      } else {
        missed++;
        process.stdout.write(`  Hole 1: no green center found\n`);
      }
    } else {
      console.log(`  => Course not found on GolfTraxx (0 markers on hole 1), skipping`);
      return null;
    }
  } else if (h1Center) {
    greenCenters["hole-1"] = h1Center;
    found++;
    process.stdout.write(`  Hole 1: ${h1Center.lat.toFixed(6)}, ${h1Center.lng.toFixed(6)}\n`);
  } else {
    missed++;
    process.stdout.write(`  Hole 1: no green center found\n`);
  }

  // Rate limit after hole 1
  if (holeCount > 1) await new Promise((r) => setTimeout(r, DELAY_MS));

  for (let hole = 2; hole <= holeCount; hole++) {
    const { markers, greenCenter } = await scrapeHole(browser, courseName, zip, hole);

    if (greenCenter) {
      greenCenters[`hole-${hole}`] = greenCenter;
      found++;
      process.stdout.write(`  Hole ${hole}: ${greenCenter.lat.toFixed(6)}, ${greenCenter.lng.toFixed(6)}\n`);
    } else {
      missed++;
      process.stdout.write(`  Hole ${hole}: no green center found\n`);
    }

    // Rate limiting between holes
    if (hole < holeCount) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`  => ${found}/${holeCount} holes scraped (${missed} missed)`);

  if (found === 0) return null;
  return greenCenters;
}

// ---------------------------------------------------------------------------
// Browser launcher (DRY helper for launch + restarts)
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

function isConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Connection closed") || msg.includes("net::ERR_CONNECTION");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== GolfTraxx Green Center Scraper ===\n");
  if (DRY_RUN) console.log("** DRY RUN — no DB writes **\n");
  console.log(`Settings: course-delay=${COURSE_DELAY_MS}ms, cooldown-interval=${COOLDOWN_INTERVAL}\n`);

  let browser = await launchBrowser();

  try {
    // ----- Diagnostic mode -----
    if (DIAGNOSTIC) {
      await runDiagnostic(browser);
      return;
    }

    // ----- Fetch courses -----
    let courses: {
      id: number;
      course_name: string;
      club_name: string | null;
      postal_code: string;
      layout_data: string | null;
    }[];

    if (COURSE_ID) {
      courses = await sql`
        SELECT id, course_name, club_name, postal_code, layout_data
        FROM courses
        WHERE id = ${COURSE_ID}
          AND postal_code IS NOT NULL
      `;
    } else {
      // US courses that have layout_data but no greenCenters, haven't been attempted, and have a postal_code
      courses = await sql`
        SELECT c.id, c.course_name, c.club_name, c.postal_code, c.layout_data
        FROM courses c
        JOIN states s ON c.state_id = s.id
        JOIN countries co ON s.country_id = co.id
        WHERE c.postal_code IS NOT NULL
          AND c.layout_data IS NOT NULL
          AND co.name = 'United States'
          AND (
            c.layout_data NOT LIKE '%greenCenters%'
            OR c.layout_data::jsonb -> 'greenCenters' = '{}'::jsonb
          )
          AND c.layout_data NOT LIKE '%greenCenterAttemptedAt%'
        ORDER BY c.id
        LIMIT ${LIMIT}
      `;
    }

    if (courses.length === 0) {
      console.log("No courses found to scrape.");
      return;
    }

    console.log(`Found ${courses.length} course(s) to process\n`);

    let success = 0;
    let failed = 0;
    let coursesSinceCooldown = 0;

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      console.log(
        `[${i + 1}/${courses.length}] ${course.course_name} (id=${course.id}, zip=${course.postal_code})`,
      );

      // --- Periodic cooldown with browser restart ---
      if (coursesSinceCooldown >= COOLDOWN_INTERVAL) {
        console.log(`\nCooldown: pausing 30s and restarting browser (after ${COOLDOWN_INTERVAL} courses)...`);
        await browser.close();
        await new Promise((r) => setTimeout(r, 30_000));
        browser = await launchBrowser();
        coursesSinceCooldown = 0;
        console.log(`Browser restarted, resuming.\n`);
      }

      try {
        const greenCenters = await scrapeCourse(browser, course);

        if (greenCenters && Object.keys(greenCenters).length > 0) {
          if (!DRY_RUN) {
            // Merge greenCenters into existing layout_data
            let layoutObj: LayoutData;
            try {
              layoutObj = JSON.parse(course.layout_data || "{}") as LayoutData;
            } catch {
              layoutObj = { teeboxes: [], hole_count: 18 };
            }
            layoutObj.greenCenters = greenCenters;
            const updatedLayout = JSON.stringify(layoutObj);

            await sql`
              UPDATE courses
              SET layout_data = ${updatedLayout},
                  updated_at = now()
              WHERE id = ${course.id}
            `;
            console.log(`  => DB updated\n`);
          } else {
            console.log(`  => Would update DB (dry-run)\n`);
          }
          success++;
        } else {
          // Stamp the attempt so we don't retry this course
          if (!DRY_RUN && course.layout_data) {
            try {
              const layoutObj = JSON.parse(course.layout_data);
              layoutObj.greenCenterAttemptedAt = new Date().toISOString();
              await sql`
                UPDATE courses
                SET layout_data = ${JSON.stringify(layoutObj)},
                    updated_at = now()
                WHERE id = ${course.id}
              `;
            } catch { /* best effort */ }
          }
          console.log(`  => Skipped (no green centers found)\n`);
          failed++;
        }
      } catch (err) {
        // --- Connection error: backoff + browser restart + single retry ---
        if (isConnectionError(err)) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  => Connection error: ${msg}`);
          console.log(`  => Pausing 30s and restarting browser for retry...`);
          try { await browser.close(); } catch { /* already dead */ }
          await new Promise((r) => setTimeout(r, 30_000));
          browser = await launchBrowser();
          coursesSinceCooldown = 0;

          // Retry this course once
          try {
            console.log(`  => Retrying ${course.course_name}...`);
            const greenCenters = await scrapeCourse(browser, course);

            if (greenCenters && Object.keys(greenCenters).length > 0) {
              if (!DRY_RUN) {
                let layoutObj: LayoutData;
                try {
                  layoutObj = JSON.parse(course.layout_data || "{}") as LayoutData;
                } catch {
                  layoutObj = { teeboxes: [], hole_count: 18 };
                }
                layoutObj.greenCenters = greenCenters;
                const updatedLayout = JSON.stringify(layoutObj);

                await sql`
                  UPDATE courses
                  SET layout_data = ${updatedLayout},
                      updated_at = now()
                  WHERE id = ${course.id}
                `;
                console.log(`  => DB updated (on retry)\n`);
              } else {
                console.log(`  => Would update DB (dry-run, retry)\n`);
              }
              success++;
            } else {
              // Stamp the attempt on retry failure too
              if (!DRY_RUN && course.layout_data) {
                try {
                  const layoutObj = JSON.parse(course.layout_data);
                  layoutObj.greenCenterAttemptedAt = new Date().toISOString();
                  await sql`
                    UPDATE courses
                    SET layout_data = ${JSON.stringify(layoutObj)},
                        updated_at = now()
                    WHERE id = ${course.id}
                  `;
                } catch { /* best effort */ }
              }
              console.log(`  => Skipped on retry (no green centers found)\n`);
              failed++;
            }
          } catch (retryErr) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
            console.error(`  => Retry also failed: ${retryMsg}, skipping\n`);
            failed++;
          }
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  => Error: ${msg}\n`);
          failed++;
        }
      }

      coursesSinceCooldown++;

      // Delay between courses
      if (i < courses.length - 1) {
        await new Promise((r) => setTimeout(r, COURSE_DELAY_MS));
      }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Success: ${success}`);
    console.log(`Failed/Skipped: ${failed}`);
  } finally {
    await browser.close();
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
