# CLAUDE.md — React Native UI/UX Rules

## Always Do First

- Read `constants/design-tokens.ts` and the memory `design-system.md` before writing any UI code, every session, no exceptions.

## Design Tokens — Hard Requirements

- Always import from `@/constants/design-tokens` — never hardcode hex colors, spacing values, font names, or radius values.
- Available namespaces: `Color`, `Space`, `Radius`, `Shadow`, `Font`, `Type`, `Animation`
- Use `Type.*` spreads for text styles (e.g., `...Type.caption`, `...Type.h2`)

## Styling Method

- `StyleSheet.create()` only — no inline style objects except for computed values.
- All style values must reference design tokens.

## Color Rules

- `Color.primary` (#15603A dark green) — CTAs, active states, selected indicators
- `Color.accent` (#C4973B gold) — highlighted metrics, stat values
- `Color.neutral50` — screen backgrounds
- `Color.white` — cards, inputs, modals
- Never invent colors — use the neutral scale (`neutral900` through `neutral50`) for text hierarchy

## Component Anatomy

- **Cards**: `borderWidth: 1, borderColor: Color.neutral200, borderRadius: Radius.md, backgroundColor: Color.white, ...Shadow.sm` — prefer borders over heavy shadows
- **Inputs/CTAs**: Full-pill shape (`borderRadius: Radius.lg` = 24), height 52, focus state = green border + 2px width
- **Buttons**: Primary = green bg + white bold text + full-pill. Secondary = white bg + green border. Disabled = opacity 0.7
- **Section labels**: Always `...Type.caption` (semiBold 13px uppercase, neutral400)

## Interactive Patterns

- `Pressable` with `({ pressed }) => pressed ? { opacity: 0.7 } : undefined` for press feedback
- Confirmations/destructive actions: native `Alert.alert()` — never Paper Dialog (renders behind modals)
- Transient feedback: Paper `Snackbar`

## Animation Rules

- Only animate `transform` and `opacity` via `react-native-reanimated`
- Use `withTiming` with `Animation.durationMs` (200ms)
- Never animate layout properties (width, height, top, left)

## Icons

- **Feather** — UI controls (plus, minus, chevrons)
- **MaterialIcons** — nav/system icons
- **MaterialCommunityIcons** — domain/branded icons (golf-cart, etc.)
- **FontAwesome5** — status indicators (check-circle, circle)

## Reference Images

- If a reference image/screenshot is provided: match layout, spacing, typography, and color exactly.
- Do not add sections, features, or content not in the reference.
- Do not "improve" a reference design — match it.

## Hard Rules

- Never hardcode colors, spacing, or font names — always use tokens
- Never use Paper Dialog for confirmations — use `Alert.alert()`
- NativeWind has been removed — do not re-add it
- Never animate layout properties (width, height, top, left)
- Screen backgrounds: `Color.neutral50`. Card backgrounds: `Color.white`
- All `Pressable` elements need press feedback — no silent taps
