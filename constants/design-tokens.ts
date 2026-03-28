import { Platform, TextStyle, ViewStyle } from "react-native";

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
      shadowOpacity: 0.1,
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

  // Secondary (chartreuse/yellow-green)
  secondary: "#D3CF37",
  // Tertiary (warm gold)
  tertiary: "#C4973B",

  // Accent aliases (kept for backward compat)
  accent: "#D3CF37",
  accentDark: "#C4973B",
  accentLight: "#F9F8E4",

  // Neutrals (pure gray, no blue tint)
  neutral900: "#2B2B2B",
  neutral700: "#525252",
  neutral500: "#787878",
  neutral400: "#A8A8A8",
  neutral300: "#C8C8C7",
  neutral200: "#DCDCDB",
  neutral100: "#E8E8E7",
  neutral50: "#F7F5F0",
  white: "#FFFFFF",

  // Semantic
  // screenBg: "#F7F5F0", // alias for neutral50 — controls all screen + header backgrounds
  screenBg: "#F7F5F0", // alias for neutral50 — controls all screen + header backgrounds
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  warning: "#EA580C",
  warningLight: "#FFF7ED",
  info: "#2563EB",

  // Gradient
  primaryGradient: ["#1A7A4A", "#15603A", "#0F4D2E"] as readonly [string, string, string],
} as const;

// === Typography ===

export const Font = {
  // Inter — body & UI
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  // Outfit — headlines & display
  displayRegular: "Outfit_400Regular",
  displaySemiBold: "Outfit_600SemiBold",
  displayBold: "Outfit_700Bold",
} as const;

export const Type = {
  h1: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: Color.neutral900,
  } as TextStyle,
  h2: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    lineHeight: 28,
    color: Color.neutral900,
  } as TextStyle,
  h3: {
    fontFamily: Font.displaySemiBold,
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
    color: Color.neutral500,
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

// === Button Styles ===

export const Btn = {
  /** Full-pill CTA — spread onto Paper Button `style` prop */
  pill: {
    borderRadius: Radius.lg,
    paddingVertical: 6,
    paddingHorizontal: Space.lg,
  } as ViewStyle,
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
