export const SUBTYPES: Record<string, { value: string; label: string; desc: string }[]> = {
  '1': [
    { value: '1A', label: 'Pin straight', desc: 'No bend at all — lies flat from root to tip' },
    { value: '1B', label: 'Straight with body', desc: 'Mostly straight, slight bend near the ends' },
    { value: '1C', label: 'Straight with wave', desc: 'Straight roots, subtle S-wave forming at tips' },
  ],
  '2': [
    { value: '2A', label: 'Loose wave', desc: 'Gentle S-shape — like a beachy wave' },
    { value: '2B', label: 'Defined wave', desc: 'Clear S-waves from mid-length down' },
    { value: '2C', label: 'Deep wave', desc: 'Strong waves that almost form curls' },
  ],
  '3': [
    { value: '3A', label: 'Loose curl', desc: 'Big, springy loops — think marker-sized' },
    { value: '3B', label: 'Bouncy curl', desc: 'Tighter ringlets — about the size of a Sharpie' },
    { value: '3C', label: 'Tight curl', desc: 'Dense, springy corkscrews — pencil-width or smaller' },
  ],
  '4': [
    { value: '4A', label: 'Soft coil', desc: 'Defined S-pattern — about the width of a crochet needle' },
    { value: '4B', label: 'Z-pattern coil', desc: 'Sharp angles, Z-shaped — less defined curl, more bend' },
    { value: '4C', label: 'Tight coil', desc: 'Very tight, densely packed — may look patternless but has a zig-zag up close' },
  ],
};

export interface QuizStep {
  id: string;
  question: string;
  subtitle: string;
  multi: boolean;
  options: { value: string; label: string; desc: string }[];
}

export const QUIZ_STEPS: QuizStep[] = [
  {
    id: 'curl',
    question: "Let's find your curl pattern",
    subtitle: 'Before we start, grab a single strand.',
    multi: false,
    options: [
      { value: '1', label: 'Straight', desc: 'No curl or wave at all' },
      { value: '2', label: 'Wavy', desc: 'Loose S-shaped waves' },
      { value: '3', label: 'Curly', desc: 'Defined loops and ringlets' },
      { value: '4', label: 'Coily', desc: 'Tight coils or zig-zag pattern' },
    ],
  },
  {
    id: 'subtype',
    question: 'How tight is the pattern?',
    subtitle: 'Compare your curl to an everyday object.',
    multi: false,
    options: [], // populated dynamically from SUBTYPES
  },
  {
    id: 'porosity',
    question: 'How does your hair handle water?',
    subtitle: 'Think about what happens after you spray or wet your hair.',
    multi: false,
    options: [
      { value: 'low', label: 'Water sits on top', desc: 'Takes forever to get fully wet' },
      { value: 'medium', label: 'Absorbs steadily', desc: 'Gets wet in a normal amount of time' },
      { value: 'high', label: 'Soaks up instantly', desc: 'But also dries out fast' },
      { value: 'unsure', label: 'Not sure', desc: "We'll help figure it out" },
    ],
  },
  {
    id: 'scalp',
    question: "Let's talk about your scalp",
    subtitle: 'Select everything that applies — no judgement.',
    multi: true,
    options: [
      { value: 'oily', label: 'Gets oily quickly', desc: 'Greasy by day 2' },
      { value: 'dry', label: 'Feels dry or tight', desc: 'Flaky, itchy, or uncomfortable' },
      { value: 'sensitive', label: 'Sensitive', desc: 'Reacts to products easily' },
      { value: 'dandruff', label: 'Dandruff or flaking', desc: 'White flakes, persistent' },
      { value: 'balanced', label: 'Pretty balanced', desc: 'No major complaints' },
    ],
  },
  {
    id: 'history',
    question: "What has your hair been through?",
    subtitle: "It's okay — we've all been there.",
    multi: true,
    options: [
      { value: 'colour', label: 'Colour-treated', desc: 'Dyed, bleached, or highlighted' },
      { value: 'heat', label: 'Regular heat styling', desc: 'Straightener, curling iron, blow dryer' },
      { value: 'chemical', label: 'Chemical treatments', desc: 'Relaxer, perm, keratin' },
      { value: 'protective', label: 'Protective styles', desc: 'Braids, wigs, weaves' },
      { value: 'natural', label: 'Mostly natural', desc: 'Minimal processing' },
    ],
  },
  {
    id: 'goals',
    question: 'What matters most to you right now?',
    subtitle: 'Pick up to 3 — we\'ll focus your routine.',
    multi: true,
    options: [
      { value: 'moisture', label: 'More moisture', desc: 'Hair feels dry or straw-like' },
      { value: 'definition', label: 'Better curl definition', desc: 'Want more shape and bounce' },
      { value: 'growth', label: 'Length retention', desc: 'Growing it out, reducing breakage' },
      { value: 'frizz', label: 'Frizz control', desc: 'Tame the halo' },
      { value: 'volume', label: 'More volume', desc: 'Flat or limp hair' },
      { value: 'repair', label: 'Damage repair', desc: 'Recovering from heat or chemicals' },
    ],
  },
  {
    id: 'wash',
    question: 'How often do you wash your hair?',
    subtitle: 'There\'s no wrong answer.',
    multi: false,
    options: [
      { value: 'daily', label: 'Every day', desc: '' },
      { value: '2-3', label: 'Every 2–3 days', desc: '' },
      { value: 'weekly', label: 'Once a week', desc: '' },
      { value: 'biweekly', label: 'Every 2 weeks', desc: '' },
      { value: 'monthly', label: 'Less often', desc: '' },
    ],
  },
];
