import type { DistanceUnit } from "@/contexts/preferences-context";

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Haversine distance between two lat/lng points, returned as rounded integer yards.
 */
export function distanceInYards(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return Math.round(haversineMeters(lat1, lng1, lat2, lng2) * 1.09361);
}

/**
 * Haversine distance between two lat/lng points, returned as rounded integer meters.
 */
export function distanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return Math.round(haversineMeters(lat1, lng1, lat2, lng2));
}

/**
 * Returns distance with appropriate label based on user's unit preference.
 */
export function formatDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: DistanceUnit,
): { value: number; label: string } {
  if (unit === "meters") {
    return { value: distanceInMeters(lat1, lng1, lat2, lng2), label: "m" };
  }
  return { value: distanceInYards(lat1, lng1, lat2, lng2), label: "yd" };
}

/**
 * Convert a yards value to the user's preferred unit.
 */
export function yardsToUnit(yards: number, unit: DistanceUnit): number {
  if (unit === "meters") return Math.round(yards * 0.9144);
  return yards;
}

/**
 * Returns the short label for the current unit.
 */
export function unitLabel(unit: DistanceUnit): string {
  return unit === "meters" ? "m" : "yd";
}
