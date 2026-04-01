/**
 * Format a date string (DATE or TIMESTAMP) for display, ignoring timezone shifts.
 * Handles both "2025-03-27" (plain date) and "2025-03-27T06:00:00Z" (timestamp).
 */
export function formatDisplayDate(dateStr: string, includeYear = false): string {
  const dateOnly = dateStr.split("T")[0];
  const [y, m, d] = dateOnly.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (includeYear) opts.year = "numeric";
  return date.toLocaleDateString("en-US", opts);
}
