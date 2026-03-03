import { Platform, TextStyle } from "react-native";

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
      shadowOpacity: 0.04,
      shadowRadius: 4,
    },
    android: { elevation: 1 },
  })!,
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
  })!,
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
  })!,
} as const;

// === Colors ===

export const Color = {
  // Brand
  primary: "#15603A",
  primaryLight: "#E8F0EC",
  primaryBorder: "#5BA67A",

  // Accent (gold / champagne)
  accent: "#C4973B",
  accentLight: "#FBF6EE",

  // Neutrals
  neutral900: "#111517",
  neutral700: "#3D4549",
  neutral500: "#6B7681",
  neutral400: "#94A0AC",
  neutral300: "#D5DAE0",
  neutral200: "#E8EAED",
  neutral100: "#F3F4F6",
  neutral50: "#F9FAFB",
  white: "#FFFFFF",

  // Semantic
  danger: "#C53030",
  dangerLight: "#FEF2F2",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  info: "#2563EB",
} as const;

// === Typography ===

export const Font = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semiBold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
} as const;

export const Type = {
  h1: {
    fontFamily: Font.bold,
    fontSize: 28,
    lineHeight: 34,
    color: Color.neutral900,
  } as TextStyle,
  h2: {
    fontFamily: Font.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Color.neutral900,
  } as TextStyle,
  h3: {
    fontFamily: Font.semiBold,
    fontSize: 17,
    lineHeight: 22,
    color: Color.neutral900,
  } as TextStyle,
  body: {
    fontFamily: Font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Color.neutral700,
  } as TextStyle,
  bodySm: {
    fontFamily: Font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Color.neutral500,
  } as TextStyle,
  caption: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    lineHeight: 16,
    color: Color.neutral400,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  } as TextStyle,
  label: {
    fontFamily: Font.medium,
    fontSize: 14,
    lineHeight: 18,
    color: Color.neutral700,
  } as TextStyle,
  overline: {
    fontFamily: Font.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Color.neutral400,
    letterSpacing: 0.5,
  } as TextStyle,
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
