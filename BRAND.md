# Tressie — Brand & Design System

*Last revised: working document. Update as decisions are made.*

This document is the single source of truth for how Tressie looks, sounds, and behaves. Before designing or building any new screen, read the relevant section. Before shipping any change, check it against the rules here. The codebase's `constants/theme.ts` and `constants/voice.ts` are the runtime expressions of this document — they must always stay in sync with it.

---

## 1. The promise

Tressie exists for women whose hair has been overlooked by mainstream advice — across every texture from straight to coily, every life stage, every history. Where the haircare industry sells transformation, Tressie offers recognition: we read your hair back to you, and we build the routine that fits *who you are right now*, not who a category says you should be.

The product feels like a thoughtful stylist who has seen everything. Not a beauty brand. Not a coach. Not a clinic. A trusted, specific, calm presence.

**We are:** editorial, specific, warm, plainspoken, calm, even-handed.
**We are not:** clinical, saccharine, performative, hierarchical, urgent, trendy.

---

## 2. Voice

Pulled from `constants/voice.ts`. Six points to remember when writing anything:

1. **Direct without being cold.** "Fine hair gets oily fast" — not "users may experience increased sebum production."
2. **Specific over universal.** Name the thing. "A weekly clarifying wash" not "personalised hair care."
3. **Plain words.** "Hair that has lived a lot" not "hair with historical processing."
4. **Comfortable with hard words.** Say *postpartum*, *chemo*, *alopecia*, *transitioning* directly. Don't euphemise.
5. **Even-handed across hair types.** Never imply one type is harder, easier, more natural, more deserving.
6. **No hierarchy of audiences.** Straight hair is not the default. Coily hair is not the niche. Each is just hair.

**Never use:** *queen, sis, girl, hun*. Emojis. Exclamation marks. Wellness-speak ("your journey"). Beauty-ad speak ("hair you'll love"). The "It's not X — it's Y" rhetorical pattern. Bullet-pointed tips/secrets/hacks. Unsourced statistics. Urgency/scarcity language.

---

## 3. Colour rules

### The palette

| Role | Hex | Usage |
|---|---|---|
| **Violet** (brand) | `#7643AC` | Buttons, brand wordmark, key brand moments only. Never on body type. |
| **Pink** (warm) | `#F484B9` | Pair with violet in gradients. Care/warmth moments. Sparingly. |
| **Lavender** | `#C38CD9` | Subtle tints and atmospheric washes. |
| **Lime** (energy) | `#D9FF00` | Editorial labels, accent dots, page numbers. Small uses only. |
| **Porcelain** (base) | `#FFFEF7` | Primary background — warm cream, never pure white. |
| **Ink** (text) | `#332463` | Primary text colour. Almost-black with violet undertone. |
| **Ink Deep** | `#120B2E` | Dark mode surfaces (reveal, splash). Background only. |
| **Muted** | `#8A7FA0` | Secondary text, captions, hairlines. |

### Three iron rules

1. **Saturated violet is for buttons, the wordmark, and brand moments only.** Never put `#7643AC` on display type. Headlines go in `Ink (#332463)`. The deep violet undertone in ink already gives brand harmony — we don't need to shout it.

2. **Lime is an accent, never an area.** Use for editorial labels (TODAY, ISSUE · 3B), small dots, page numerals. Never for big blocks of colour. Never for body type. If you find yourself filling a card with lime — stop, it's wrong.

3. **Porcelain over white.** Backgrounds use `#FFFEF7`, not `#FFFFFF`. Pure white is clinical. Porcelain is lived-in.

### Surfaces

- **Daily screens** (home, discover, salons, profile): porcelain base
- **Ceremonial screens** (splash, reveal): deep violet base (`#120B2E` → gradient)
- **Onboarding**: porcelain base with full-bleed photography

### Translucent layers

When tinting backgrounds for accent areas (selected option, soft warning, etc.), use the pre-defined tokens — `violetBg`, `violetBg2`, `careSoft`, `limeBg` — not arbitrary `rgba(...)` values.

---

## 4. Typography rules

### Three faces

| Face | Role | When to use |
|---|---|---|
| **Fraunces** (serif) | Display, editorial | Hero names, card titles, magazine headlines, italic accent moments |
| **Sora** (sans-serif geometric) | Structure, UI | Labels in CAPS, button text, headers where Fraunces is too soft |
| **Inter** (sans-serif neutral) | Body, captions | Paragraphs, descriptions, microcopy |

### Hierarchy in practice

```
Display  → Fraunces 700 Bold      32–56pt  →  Hero moments, names
Title    → Fraunces 600 SemiBold  24–32pt  →  Card titles, big numbers
Accent   → Fraunces 400 Italic    14–17pt  →  Pull-quote moments, taglines
Headline → Sora 600 SemiBold      16pt     →  Section heads where serif too soft
Body     → Inter 400 Regular      14pt     →  Paragraphs, descriptions
Caption  → Inter 400 Regular      12pt     →  Secondary text
Label    → Sora 500 Medium        10–11pt  →  CAPS LABELS, letterspaced 2–3pt
```

### Rules

1. **Never put display type in saturated violet.** Always ink (`#332463`). The button can be violet. The headline can't.
2. **One serif per moment.** Don't stack two Fraunces sizes on top of each other unless one is italic.
3. **Labels are uppercase Sora with 2–3pt letter-spacing.** Always lime (`#D9FF00`) or muted (`#8A7FA0`) depending on context. Never violet.
4. **Body copy is Inter at 14pt with 22pt line-height.** Don't break this. Long blocks of Inter at 16pt feel heavy; at 13pt feel cramped.
5. **Italic is for ritual moments.** Fraunces italic gets used for taglines under hero type, daily notes, closing lines. Inter italic for body emphasis. Never both italics on the same screen.

---

## 5. Photography rules

### What Tressie photos look like

- **Real hair, real textures.** Wet hair, dry hair, hands in hair, water in hair, scalp, ends, fingers detangling, braiding, refreshing.
- **All textures.** From bone-straight 1A through tight-coil 4C. Across ethnicities.
- **Process, not result.** Mid-wash beats post-blowout. Setting twists beats finished twists.
- **Close, intimate framing.** Crops that feel observed, not staged.
- **Natural light or considered editorial light.** No flat e-commerce lighting.

### What Tressie photos do not look like

- Stock smiles to camera
- Hair flips, "look-at-me-go" energy
- Photos of products instead of people
- Before/after framings (these imply a deficit)
- Pure white backdrops (clinical)
- AI-generated images that hallucinate hand anatomy or strand structure

### Sourcing

For beta: Unsplash + Pexels (licensed for commercial use). For public release: licensed editorial photography, or AI-generated through your Replicate pipeline with editorial direction. Never Pinterest images — they're someone else's copyright and will get the app removed from stores.

### Use on screen

- **Bleeds full-bleed to the edges.** Never an image with a padded border.
- **Fades into the canvas.** Photos at the top of a screen always transition through a gradient — never a hard cut. The gradient is part of the photo, not chrome.
- **Lives above the text, not behind it.** Avoid text overlay on photo unless you control the photo crop. When text must sit on photo, use deep ink with a subtle cream shadow halo — never a card or scrim.

---

## 6. Layout rules

### Safe areas — always

Use `useSafeAreaInsets()` from `react-native-safe-area-context`. Never hardcode `paddingTop: 56` for the notch. The right pattern:

```tsx
const insets = useSafeAreaInsets();
<View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
```

12pt above the inset for top chrome. Bottom chrome uses `Math.max(insets.bottom, 24)`.

### Spacing — 4-point grid

Use `Spacing` tokens from theme:

```
xs: 4    sm: 8    md: 12    lg: 16    xl: 20
xxl: 24    xxxl: 32    huge: 48
```

Never use arbitrary spacing values. If you reach for 17pt, use 16. If you reach for 22, use 20 or 24.

### Radii

```
sm: 8     md: 12    lg: 16    xl: 20    full: 999
```

Cards use `lg` (16). Pills use `full`. Inputs use `md` (12). Never `xl` for anything except heroes.

### Photo-to-content transition

When a photo dominates the top half of a screen:
- Photo is full-bleed
- Bottom 30–50% of the photo's height has a gradient blending to the background colour
- 5–7 colour stops, starting at fully transparent at 0% and reaching solid background only in the last 10% of the gradient
- For warmth, the gradient can carry a 4–10% wash of brand colour (lavender at 10%) in the middle stops

### Touch targets

Minimum 44×44pt (Apple HIG). Use `hitSlop` to expand tap targets without enlarging visuals.

---

## 7. Motion rules

### Timing

Use `Motion` tokens from theme:

```
fast: 180ms      — press feedback, indicator state changes
medium: 280ms    — step-to-step transitions
slow: 480ms      — interstitial reveals, hero animations
```

### Easing

`Easing.out(Easing.cubic)` for almost everything. Movement enters with energy and settles calmly. No bouncy springs — we tried and it felt jumpy. The only springs are tight, no-overshoot, for button press feedback (`springTight`).

### Rules

1. **Entrance animations on first paint only.** Don't re-animate when state updates.
2. **Cards fade and translate by ~8pt. That's it.** No scale-from-zero. No rotate-in. No bouncy entrances.
3. **Haptics on every meaningful tap.** `Haptics.selectionAsync()` for tab/option, `impactAsync(Light)` for button presses, `notificationAsync(Success)` for completion moments.
4. **Never animate just to animate.** If you can't say what an animation communicates, remove it.

---

## 8. Component rules

### Buttons

- **Primary:** solid violet (`#7643AC`), white text, Radius `lg`, height 52pt minimum, Sora SemiBold 15pt label
- **Gradient:** violet-to-pink (`gradientPrimary`), reserved for the most important action on a screen
- **Press feedback:** `transform: [{ scale: 0.985 }]` while pressed
- **Disabled state:** opacity 0.5, no colour change

### Cards

- White (`#FFFFFF`) surface on porcelain
- Border `BorderTone.base` (`#EAE6F5`)
- Radius `lg` (16)
- Padding `xxl` (24) inside
- Shadow `Shadows.card` — soft, almost imperceptible
- Editorial label inside (lime CAPS) + content

### Editorial labels

```
TODAY  ·  WHAT YOU TOLD US  ·  YOUR ROUTINE  ·  ISSUE · 3B
```

- Sora 500 Medium, 10–11pt
- Letterspacing 2–3pt
- Always UPPERCASE
- Colour: lime (`#D9FF00`) on dark surfaces, muted-ink (`#8A7FA0`) on light, violet (`#7643AC`) in editorial chrome
- Sit above the content they label, with 8–18pt below them

### Progress indicators

- Inside-page progress (onboarding, reveal pager): thin segmented bars or dots
- Bar: 3pt tall, idle `rgba(118,67,172,0.12)`, fill `#7643AC`, radius 2
- Dot: 4pt, idle muted, active lime

---

## 9. Screen archetypes

### Ceremonial (splash, reveal, name capture, post-reveal moments)
- Deep violet/black background
- Cream-coloured text
- Lime for editorial labels
- Atmospheric — glow orbs, gradients
- Large display type in Fraunces
- One-purpose: the moment

### Editorial daily (home, profile, weekly summary)
- Porcelain background
- Ink text
- Lime for labels, violet for actions
- Cards: white on porcelain
- Hero card opens the page

### Quiz/forms (quiz, name capture, settings inputs)
- Porcelain background
- Generous spacing
- Single question per screen
- Calm rhythm

### Discovery (discover, salons, marketplace)
- Porcelain background
- Editorial product cards
- Magazine-style image-led
- Less type-dense than home

---

## 10. The audit checklist

Before any screen ships, walk this:

- [ ] **Safe area:** Uses `useSafeAreaInsets()`. No hardcoded `paddingTop`.
- [ ] **Brand colour usage:** Saturated violet only on buttons, wordmark, brand moments. Headlines in ink. Lime only as accent. No arbitrary `rgba(...)`.
- [ ] **Type:** Display in Fraunces. Labels in Sora caps. Body in Inter. Consistent sizes from the scale.
- [ ] **Hierarchy:** Title and body differ in *value* (lightness) or *weight*, not just colour.
- [ ] **Photos:** Full-bleed, fade to background through gradient, never a hard cut.
- [ ] **Spacing:** 4-point grid throughout. No 17pt or 22pt.
- [ ] **Motion:** Entrance animations only, `Easing.out(Easing.cubic)`, no springs except button press.
- [ ] **Haptics:** Every meaningful tap has feedback.
- [ ] **Voice:** Reads aloud as the Tressie voice would speak. No wellness-speak, no urgency, no AI-balanced rhetoric.
- [ ] **One job:** The screen does one thing well, not six things passably.

---

## 11. Decision log (append as we go)

| Date | Decision | Reason |
|---|---|---|
| Today | Headlines in ink, not saturated violet | Violet on display type reads shouty; reserved for buttons + wordmark |
| Today | Lime is accents only, never areas | Magazine pattern; protects the colour's specialness |
| Today | Photos always full-bleed with gradient fade | No hard cuts; atmospheric transition |
| Today | Safe area context replaces hardcoded paddings | Devices vary; chrome must respect them |

Add a new row every time a non-trivial design choice is made. This is how the system stays consistent as it grows.
