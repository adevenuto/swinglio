/**
 * Returns black or white text color based on the perceived luminance of a hex background.
 * Only handles hex colors (#RGB or #RRGGBB). Returns black for anything else.
 */
export function getContrastColor(bgColor: string | undefined): string {
  if (!bgColor || !bgColor.startsWith("#")) return "#000000";
  let hex = bgColor.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return "#000000";
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
