import { Platform } from "react-native";

// === Spacing (8pt grid) ===

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// === Border Radius ===

export const Radius = {
  sm: 8, // badges, small tags
  md: 12, // cards, containers
  lg: 24, // pills, buttons, chips
  full: 9999, // circles
} as const;

// === Shadows ===

export const Shadow = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
  })!,
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
  })!,
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
  })!,
} as const;

// === Colors ===

export const Color = {
  // Brand
  primary: "#16a34a",
  primaryLight: "#f0fdf4",
  primaryBorder: "#86efac",

  // Neutrals
  neutral900: "#111827",
  neutral700: "#374151",
  neutral500: "#6b7280",
  neutral400: "#9ca3af",
  neutral300: "#d4d4d4",
  neutral200: "#e5e5e5",
  neutral100: "#f5f5f5",
  neutral50: "#fafafa",
  white: "#ffffff",

  // Semantic
  danger: "#dc2626",
  dangerLight: "#fef2f2",
  warning: "#f59e0b",
  warningLight: "#fffbeb",
  info: "#3b82f6",
} as const;

// === Animation ===

export const Animation = {
  /** Hole transition slide duration (ms) */
  durationMs: 200,
  /** Horizontal slide offset (px) */
  slideOffset: 40,
  /** Opacity during slide-in */
  slideMinOpacity: 0.7,
} as const;
