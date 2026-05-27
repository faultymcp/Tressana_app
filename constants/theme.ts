// Tressana Visual Identity — colours, typography, spacing
// "Warm, modern, magical — never clinical"
//
// Day 2 expansion: semantic tokens added below the brand palette so
// components stop referencing raw hex/rgba inline. Existing keys are
// preserved — additions only, no renames. Use the semantic names
// (Surface, Foreground, Border, etc.) in new code.

export const Colors = {
  // Core palette
  violet: '#7643AC',
  pink: '#F484B9',
  lavender: '#C38CD9',
  lime: '#D9FF00',
  porcelain: '#FFFEF7',
  ink: '#332463',
  inkDeep: '#120B2E',
  muted: '#8A7FA0',
  white: '#FFFFFF',
  border: '#EAE6F5',
  dark: '#0c0a15',
  // Functional
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  // Gradients (for LinearGradient)
  gradientPrimary: ['#7643AC', '#F484B9'],
  gradientHeader: ['#120B2E', '#332463', '#7643AC'],
  gradientSplash: ['#120B2E', '#2d1854', '#4a2070', '#7643AC'],
  gradientWelcome: ['#120B2E', '#2d1854', '#4a2070', '#7643AC'],
  gradientLime: ['#D9FF00', '#7643AC', '#F484B9'],
  gradientWarm: ['#C38CD9', '#F484B9'],
  // Translucent
  violetBg: 'rgba(118,67,172,0.06)',
  violetBg2: 'rgba(118,67,172,0.12)',
  violetBg3: 'rgba(118,67,172,0.18)',
  limeBg: 'rgba(217,255,0,0.08)',
};

// ─── Semantic colour tokens ────────────────────────────────────────
// Map to brand palette via emotional role, not hex. Use these in new
// code; let the brand palette change without rewriting screens.
//
//   Surface       = where content sits
//   Foreground    = how content reads
//   BorderTone    = how content is contained
//   Accent        = the self / the user
//   Care          = warmth, care moments (auto-promotion, soft beats)
//   Energy        = agency, action highlights
export const Surface = {
  base: '#FFFEF7',        // porcelain — primary background
  raised: '#FFFFFF',      // cards, sheets
  inset: '#F7F2FB',       // option backgrounds, tinted insets
  accentSoft: 'rgba(118,67,172,0.06)',
  careSoft:   'rgba(244,132,185,0.08)',
};

export const Foreground = {
  primary: '#332463',     // ink — main text
  muted:   '#8A7FA0',     // secondary text, captions
  subtle:  'rgba(51,36,99,0.5)',  // labels, hairlines
  onAccent: '#FFFFFF',    // text on violet backgrounds
};

export const BorderTone = {
  subtle: 'rgba(51,36,99,0.06)',  // dividers between regions
  base:   '#EAE6F5',              // option cards, default outlines
  strong: 'rgba(51,36,99,0.16)',  // hairline frames in editorial layouts
  accent: '#7643AC',              // selected state outline
};

export const Accent = {
  base:  '#7643AC',
  soft:  'rgba(118,67,172,0.10)',
  bgTint:'rgba(118,67,172,0.04)',
};

export const Care = {
  base: '#F484B9',
  soft: 'rgba(244,132,185,0.08)',
};

export const Energy = {
  base: '#D9FF00',
  soft: 'rgba(217,255,0,0.08)',
};

// ─── Type scale ────────────────────────────────────────────────────
// Use these styles directly in components rather than recombining
// fontFamily + fontSize + letterSpacing + lineHeight everywhere.
//
//   display   = hero titles (onboarding, reveal)
//   title     = step questions
//   headline  = card titles, section heads
//   body      = primary copy
//   caption   = secondary copy, descriptions
//   label     = uppercase letterspaced microcopy
//   index     = editorial section markers ("01 / 04")
export const Fonts = {
  heading: 'Fraunces_700Bold',
  headingSemi: 'Fraunces_600SemiBold',
  headingMedium: 'Fraunces_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const Type = {
  display: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    letterSpacing: -1,
    lineHeight: 38,
    color: '#332463',
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 28,
    color: '#332463',
  },
  headline: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 22,
    color: '#332463',
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#332463',
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: '#8A7FA0',
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: '#8A7FA0',
  },
  index: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 3,
    color: '#8A7FA0',
  },
  bodyItalic: {
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic' as const,
    fontSize: 13,
    lineHeight: 19,
    color: '#8A7FA0',
  },
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 30,
};

// ─── Spacing scale ─────────────────────────────────────────────────
// 4-point grid. Use named keys in new code (sm, md, lg, etc.).
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// ─── Elevation / shadow tokens ─────────────────────────────────────
// Use these instead of inline shadow values. Three levels.
//   card    = resting elevation (option rows, cards)
//   raised  = sheet, modal, prominent surface
//   cta     = primary action button (violet glow)
export const Shadows = {
  card: {
    shadowColor: '#332463',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  raised: {
    shadowColor: '#332463',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  cta: {
    shadowColor: '#7643AC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
};

// ─── Motion tokens ─────────────────────────────────────────────────
// Calm timing system. No spring overshoot anywhere — we tried that and
// it felt jumpy. Use these durations everywhere instead of magic numbers.
//
//   fast   = press feedback, indicator state changes
//   medium = step-to-step transitions
//   slow   = interstitial reveals
export const Motion = {
  fast: 180,
  medium: 280,
  slow: 480,
  // For Reanimated withSpring: critically damped, no overshoot.
  springCalm: { damping: 22, stiffness: 220 },
  springTight: { damping: 18, stiffness: 380 },  // for button press
};

// ─── Touch target floor ────────────────────────────────────────────
// Apple HIG: 44pt minimum. Use this constant on small interactive
// elements (icon buttons, indicator circles) to guarantee a tappable
// area even when the visual is smaller.
export const TouchTarget = {
  min: 44,
};