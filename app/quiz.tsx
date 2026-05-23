import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors, Fonts, Radius } from '@/constants/theme';
import QuizSegmentStep, { SEGMENTS } from '@/components/QuizSegmentStep';
import JourneyMap, { Phase } from '@/components/JourneyMap';
import {
  PatternLineup,
  CuticleStrands,
} from '@/components/InterstitialVisuals';

// ════════════════════════════════════════════════════════════════
// Voice: Tressana speaks like a Black woman in her thirties who has
// worked in salons, lived through a postpartum shed and a transitioning
// year, and would never ask a question she wouldn't want asked of her.
// Direct without being cold, warm without performing care, specific
// over universal.
// ════════════════════════════════════════════════════════════════

// ─── SVG Curl Pattern ────────────────────────────────────────────
function CurlPattern({ type, size = 62, color }: { type: string; size?: number; color?: string }) {
  const cx = 25;
  let d = '', sw = 2.2;
  const stroke = color || Colors.ink;

  if (type === '1' || type === '1A') { d = `M${cx} 2 L${cx} 68`; sw = type === '1A' ? 1.8 : 2.2; }
  else if (type === '1B') { d = `M${cx} 2 Q${cx+3} 20, ${cx} 35 Q${cx-3} 50, ${cx} 68`; sw = 2.2; }
  else if (type === '1C') { d = `M${cx} 2 L${cx} 68`; sw = 3.2; }
  else if (type === '2' || type === '2A') { d = `M${cx} 2 Q${cx+10} 14, ${cx} 24 Q${cx-10} 34, ${cx} 44 Q${cx+8} 54, ${cx} 68`; sw = 2; }
  else if (type === '2B') { d = `M${cx} 2 Q${cx+12} 10, ${cx} 18 Q${cx-12} 26, ${cx} 34 Q${cx+12} 42, ${cx} 50 Q${cx-12} 58, ${cx} 68`; sw = 2; }
  else if (type === '2C') { d = `M${cx} 2 Q${cx+14} 7, ${cx} 13 Q${cx-14} 19, ${cx} 24 Q${cx+14} 29, ${cx} 35 Q${cx-14} 41, ${cx} 46 Q${cx+14} 51, ${cx} 57 Q${cx-14} 63, ${cx} 68`; sw = 2; }
  else if (type === '3' || type === '3A') { d = `M${cx} 2 C${cx+18} 5, ${cx+18} 16, ${cx} 18 C${cx-18} 20, ${cx-18} 31, ${cx} 33 C${cx+18} 35, ${cx+18} 46, ${cx} 48 C${cx-18} 50, ${cx-18} 61, ${cx} 63 L${cx} 68`; sw = 1.8; }
  else if (type === '3B') { d = `M${cx} 2 C${cx+16} 4, ${cx+16} 12, ${cx} 14 C${cx-16} 16, ${cx-16} 24, ${cx} 26 C${cx+16} 28, ${cx+16} 36, ${cx} 38 C${cx-16} 40, ${cx-16} 48, ${cx} 50 C${cx+16} 52, ${cx+16} 60, ${cx} 62 L${cx} 68`; sw = 1.8; }
  else if (type === '3C') { d = `M${cx} 2 C${cx+14} 3, ${cx+14} 9, ${cx} 10 C${cx-14} 11, ${cx-14} 17, ${cx} 18 C${cx+14} 19, ${cx+14} 25, ${cx} 26 C${cx-14} 27, ${cx-14} 33, ${cx} 34 C${cx+14} 35, ${cx+14} 41, ${cx} 42 C${cx-14} 43, ${cx-14} 49, ${cx} 50 C${cx+14} 51, ${cx+14} 57, ${cx} 58 C${cx-14} 59, ${cx-14} 65, ${cx} 66`; sw = 1.7; }
  else if (type === '4' || type === '4A') { d = `M${cx} 2 C${cx+11} 3, ${cx+11} 7, ${cx} 8 C${cx-11} 9, ${cx-11} 13, ${cx} 14 C${cx+11} 15, ${cx+11} 19, ${cx} 20 C${cx-11} 21, ${cx-11} 25, ${cx} 26 C${cx+11} 27, ${cx+11} 31, ${cx} 32 C${cx-11} 33, ${cx-11} 37, ${cx} 38 C${cx+11} 39, ${cx+11} 43, ${cx} 44 C${cx-11} 45, ${cx-11} 49, ${cx} 50 C${cx+11} 51, ${cx+11} 55, ${cx} 56 C${cx-11} 57, ${cx-11} 61, ${cx} 62 C${cx+11} 63, ${cx+11} 67, ${cx} 68`; sw = 1.5; }
  else if (type === '4B') { let y = 2; d = `M${cx} ${y}`; let left = true; while (y + 6 <= 68) { y += 6; d += ` L${left ? cx-10 : cx+10} ${y}`; left = !left; } sw = 1.5; }
  else if (type === '4C') { d = `M${cx} 2`; for (let y = 2; y + 5 <= 68; y += 5) { d += ` C${cx+9} ${y+1}, ${cx+9} ${y+4}, ${cx} ${y+5} C${cx-9} ${y+6}, ${cx-9} ${y+9}, ${cx} ${y+10}`; y += 5; } sw = 1.4; }

  if (!d) return null;
  return (
    <Svg width={size * 0.7} height={size} viewBox="0 0 50 70">
      <Path d={d} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Step types ──────────────────────────────────────────────────
type QuestionStep = {
  kind: 'question';
  id: string;
  question: string;
  subtitle: string;
  multi: boolean;
  showPattern: boolean;
  proTip: string;
  helpTitle: string;
  helpBody: string;
  options: { value: string; label: string; desc: string }[];
};

type InterstitialStep = {
  kind: 'interstitial';
  id: 'welcome' | 'why_pattern' | 'why_porosity' | 'why_history' | 'we_hear' | 'almost';
  title: string;
  body: string;
  cta?: string;
};

type SegmentsStep = {
  kind: 'segments';
  id: 'segments';
  question: string;
  subtitle: string;
  helpTitle: string;
  helpBody: string;
};

type Step = QuestionStep | InterstitialStep | SegmentsStep;

// ─── Quiz steps ──────────────────────────────────────────────────
const QUIZ_STEPS: Step[] = [
  // ── BELONGING SCREEN ─────────────────────────────────────────────
  {
    kind: 'interstitial',
    id: 'welcome',
    title: "Before we start.",
    body: "We built Tressana for women whose hair has been overlooked, judged, or hard to figure out alone. You\u2019ll see questions about your hair, your scalp, your history, what your hair is doing right now. Answer what you want. Skip what you don\u2019t. Nothing here is graded.",
    cta: "I\u2019m in",
  },

  {
    kind: 'question',
    id: 'strand',
    question: "Pull a single strand from your crown.",
    subtitle: "Crown hair is your truest texture \u2014 the part that hasn\u2019t been styled or stretched.",
    multi: false, showPattern: false,
    proTip: "Clean and dry. Product makes everything lie about itself.",
    helpTitle: 'Why a single strand?',
    helpBody: "Your whole head can look different depending on styling, products, or how recently you washed. A clean strand from the crown tells the truth. If you\u2019ve had chemical treatments, take a piece closer to the root.",
    options: [
      { value: 'ready', label: "Got one", desc: 'Clean, dry, ready to look' },
      { value: 'skip', label: "I\u2019ll go from memory", desc: "Fine \u2014 we\u2019ll still get close" },
    ],
  },
  {
    kind: 'question',
    id: 'curl',
    question: "Hold it at one end. What does it want to do?",
    subtitle: "Don\u2019t stretch it \u2014 let gravity have it.",
    multi: false, showPattern: true,
    proTip: "Watch it root to tip. Don\u2019t pull, don\u2019t straighten. Let it tell you.",
    helpTitle: 'Reading your strand',
    helpBody: "Round follicles produce straight hair. Oval, wavy or curly. Flat or elliptical, coily. The follicle shape is what your strand is doing on its own \u2014 unstyled, unstretched.",
    options: [
      { value: '1', label: 'Falls completely straight', desc: 'No bend, no curve, just hangs' },
      { value: '2', label: 'Makes a loose S-shape', desc: 'Gentle bends, like soft waves' },
      { value: '3', label: 'Springs into curls', desc: 'Defined spirals that bounce back' },
      { value: '4', label: 'Coils up tight', desc: 'Zig-zags, tight coils, or shrinks up' },
    ],
  },
  {
    kind: 'question',
    id: 'subtype',
    question: "How tight does it spring?",
    subtitle: "Match it to the closest object. Don\u2019t overthink \u2014 closest wins.",
    multi: false, showPattern: true,
    proTip: "If it\u2019s between two, go with the tighter one. We\u2019d rather give your hair more moisture than less.",
    helpTitle: 'The A-B-C system',
    helpBody: "A is loosest, C is tightest. This isn\u2019t about better or worse \u2014 it\u2019s about what your hair needs. Tighter patterns hold less moisture and need more. Looser patterns can\u2019t carry weight.",
    options: [],
  },
  {
    kind: 'question',
    id: 'density',
    question: "When you grab a handful, how much do you feel?",
    subtitle: "This is about how much hair you have, not how it looks. A whisper, a handful, or a real weight?",
    multi: false, showPattern: false,
    proTip: "Hold a single strand next to a piece of sewing thread. Same width or thinner is fine. Thicker is coarse.",
    helpTitle: 'Why density matters',
    helpBody: "Density (how many strands you have) and porosity (how each strand handles water) are different. Both shape what your hair needs. A 3B with fine density needs lighter products than a 3B with coarse density \u2014 same pattern, different routine.",
    options: [
      { value: 'fine', label: 'Fine \u2014 like a whisper', desc: 'Strands feel thin. A handful feels light.' },
      { value: 'medium', label: 'Medium \u2014 a clear handful', desc: 'Normal strand thickness. Holds a brush well.' },
      { value: 'coarse', label: 'Coarse \u2014 real weight', desc: 'Thick strands. A handful feels substantial.' },
      { value: 'unsure', label: "Not sure", desc: "We\u2019ll start medium and you can adjust later." },
    ],
  },

  // ── INTERSTITIAL 1 ───────────────────────────────────────────────
  {
    kind: 'interstitial',
    id: 'why_pattern',
    title: "It\u2019s structure \u2014 not a score.",
    body: "1A and 4C aren\u2019t a ranking. They\u2019re different shapes that hold and lose water differently. Pattern is for matching products to your hair, not measuring your hair against anyone else\u2019s.",
  },

  {
    kind: 'question',
    id: 'porosity',
    question: "How does water act on your hair?",
    subtitle: "Think about wash day. Does it sit on top, or does your hair drink it in?",
    multi: false, showPattern: false,
    proTip: "Not sure is fine \u2014 most women don\u2019t know this off the top. We\u2019ll help you test it later.",
    helpTitle: 'The water glass test',
    helpBody: "Drop a clean strand in room-temperature water. Wait three minutes. Floats = low porosity. Middle = medium. Sinks = high. This single test tells you which products will penetrate your hair vs sit on top.",
    options: [
      { value: 'low', label: 'Sits on top forever', desc: 'Takes ages to fully wet. Hair stays dry inside.' },
      { value: 'medium', label: 'Wets at a normal pace', desc: 'Steady absorption, holds moisture well.' },
      { value: 'high', label: 'Soaks instantly', desc: 'Drenches fast, dries fast.' },
      { value: 'unsure', label: "I don\u2019t know yet", desc: "We\u2019ll figure it out together." },
    ],
  },

  // ── INTERSTITIAL 2 ───────────────────────────────────────────────
  {
    kind: 'interstitial',
    id: 'why_porosity',
    title: "Porosity decides what your hair holds.",
    body: "Most product mismatches come down to this single variable. A heavy butter feels rich on one woman and like coating on another \u2014 same butter, different cuticle.",
  },

  {
    kind: 'question',
    id: 'scalp',
    question: "Your scalp.",
    subtitle: "Where every strand is born \u2014 and where most hair problems actually start.",
    multi: true, showPattern: false,
    proTip: "Part it. Touch it. What\u2019s true today?",
    helpTitle: 'Why scalp matters',
    helpBody: "A dry, irritated, or clogged scalp produces weaker hair, full stop. Most growth and breakage issues track back to scalp condition. We factor it into every recommendation.",
    options: [
      { value: 'oily', label: 'Gets oily fast', desc: 'Greasy roots within a day or two' },
      { value: 'dry', label: 'Tight and dry', desc: 'Feels parched, sometimes itchy' },
      { value: 'flaky', label: 'Flaking or dandruff', desc: 'White flakes when you part it' },
      { value: 'sensitive', label: 'Sensitive or tender', desc: 'Reacts to products, gets irritated' },
      { value: 'buildup', label: 'Product buildup', desc: 'Feels coated even after washing' },
      { value: 'healthy', label: 'Pretty healthy', desc: 'Balanced, comfortable' },
    ],
  },
  {
    kind: 'question',
    id: 'wash_frequency',
    question: "How often does your hair want water?",
    subtitle: "Be honest about what your hair actually wants, not what you've been told to do.",
    multi: false, showPattern: false,
    proTip: "If you skip wash days when life gets busy, count that as 'less often.'",
    helpTitle: 'Why wash frequency matters',
    helpBody: "How often you wash isn't a fixed truth \u2014 it's a relationship between your scalp, your hair, and your week. We build routines that match the cadence you can actually keep, not an ideal you'll abandon.",
    options: [
      { value: 'daily', label: 'Daily', desc: 'My hair feels best with regular water' },
      { value: 'few_days', label: 'Every 2\u20133 days', desc: 'Not daily, but pretty regular' },
      { value: 'weekly', label: 'Once a week', desc: 'A weekly deep wash is my rhythm' },
      { value: 'co_wash', label: 'Co-wash only', desc: 'No shampoo \u2014 conditioner washes or water only' },
    ],
  },
  {
    kind: 'question',
    id: 'length',
    question: "Where does your hair fall when it's out?",
    subtitle: "When it's stretched, not shrunk. Coily hair shrinks \u2014 that's why we ask stretched length.",
    multi: false, showPattern: false,
    proTip: "Ends are years older than roots. Length tells us how much end-care your routine needs.",
    helpTitle: 'Why length matters',
    helpBody: "Length is time. The longer your hair, the more it has lived through \u2014 washes, weather, styles, products. Long hair needs more end-care. Short hair needs more growth-care. Both can break, but for different reasons.",
    options: [
      { value: 'short', label: 'Above the shoulder', desc: 'Ear-length, bob, TWA, or shorter' },
      { value: 'mid', label: 'Shoulder to mid-back', desc: 'Most common range' },
      { value: 'long', label: 'Mid-back to waist', desc: 'Longer ends, more end-care needed' },
      { value: 'extra_long', label: 'Waist and below', desc: 'Hair that has lived a lot' },
    ],
  },
  {
    kind: 'question',
    id: 'history',
    question: "What has your hair carried?",
    subtitle: "Past treatments, past styles, past lives. Honest is the answer here.",
    multi: true, showPattern: false,
    proTip: "We don\u2019t ask to flag damage. We ask so what we recommend fits.",
    helpTitle: 'Why history matters',
    helpBody: "Chemical treatments change your hair\u2019s structure until it grows out. Relaxers break bonds. Colour lifts the cuticle. Heat damage doesn\u2019t reverse \u2014 it manages. Knowing this means we recommend what helps now, not what would\u2019ve helped a year ago.",
    options: [
      { value: 'colour', label: 'Colour treated', desc: 'Dyed, bleached, or highlighted' },
      { value: 'relaxer', label: 'Chemically relaxed', desc: 'Relaxer or texturiser' },
      { value: 'heat', label: 'Regular heat', desc: 'Straighteners, curling irons weekly+' },
      { value: 'protective', label: 'Protective styles often', desc: 'Braids, weaves, wigs regularly' },
      { value: 'natural', label: 'Fully natural', desc: 'No chemicals, minimal heat' },
      { value: 'transitioning', label: 'Currently transitioning', desc: 'Growing out chemical treatment' },
    ],
  },

  // ── INTERSTITIAL 3 ───────────────────────────────────────────────
  {
    kind: 'interstitial',
    id: 'why_history',
    title: "Your history shapes what works.",
    body: "We don\u2019t ask to flag damage. We ask so what we recommend fits the hair you have now \u2014 not the hair someone else thinks you should have.",
  },

  // ── SEGMENTS ─────────────────────────────────────────────────────
  {
    kind: 'segments',
    id: 'segments',
    question: "Where is your hair right now?",
    subtitle: "Select what\u2019s true. Your routine adapts to where you are, not just your texture.",
    helpTitle: 'Why this matters',
    helpBody: "Hair care is not one-size-fits-all. Someone with braids needs scalp care between the braids, not deep conditioning. Someone post-transplant needs graft protection, not styling tips. Someone going through chemo needs gentle scalp comfort, not curl definition. This step makes sure your routine matches your reality.",
  },

  // ── BREATH BEAT (post-segments) ──────────────────────────────────
  {
    kind: 'interstitial',
    id: 'we_hear',
    title: "We hear you.",
    body: "Wherever you are \u2014 natural, in protective styles, transitioning, recovering \u2014 we built this for that. One more step.",
  },

  {
    kind: 'question',
    id: 'time_budget',
    question: "How much time do you actually have for your hair?",
    subtitle: "Daily, not weekly. We build the routine around what you can keep \u2014 not aspirations.",
    multi: false, showPattern: false,
    proTip: "The best routine is the one you'll do. Be honest about an average morning.",
    helpTitle: 'Why time budget matters',
    helpBody: "A 45-minute routine you skip is worse than a 10-minute one you actually do. We size your daily routine to the time you have, and add a longer weekly cycle separately if you want one.",
    options: [
      { value: 'minimal', label: 'Under 10 minutes', desc: 'Mornings are tight. Keep it efficient.' },
      { value: 'short', label: '10 to 20 minutes', desc: 'I can do a real morning routine' },
      { value: 'medium', label: '20 to 40 minutes', desc: "I'm willing to take time" },
      { value: 'generous', label: '40+ minutes', desc: 'I love my hair time' },
    ],
  },

  {
    kind: 'question',
    id: 'goals',
    question: "What do you want for your hair?",
    subtitle: "Pick what feels true. We\u2019ll build your plan around it.",
    multi: true, showPattern: false,
    proTip: "Two or three is enough. We\u2019ll prioritise from the top.",
    helpTitle: 'How goals shape your plan',
    helpBody: "Each goal changes the products and steps we recommend. Moisture means heavier conditioners. Frizz control focuses on sealants. Length retention means protective handling. We balance everything so nothing fights itself.",
    options: [
      { value: 'moisture', label: 'More moisture', desc: 'Hair feels dry, rough, or straw-like' },
      { value: 'growth', label: 'Length retention', desc: 'Reduce breakage, hold onto length' },
      { value: 'definition', label: 'Curl definition', desc: 'Bouncier, more defined curls' },
      { value: 'frizz', label: 'Frizz control', desc: 'Tame flyaways and puffiness' },
      { value: 'scalp_goal', label: 'Healthier scalp', desc: 'Fix the foundation first' },
      { value: 'damage', label: 'Repair damage', desc: 'Recover from heat or colour' },
    ],
  },

  // ── INTERSTITIAL 4 (closer) ──────────────────────────────────────
  {
    kind: 'interstitial',
    id: 'almost',
    title: "Welcome in.",
    body: "Your routine is built from your texture, scalp, story, and what you want next. Yours to swap. Ours to adjust as your hair changes.",
  },
];

const SUBTYPES: Record<string, { value: string; label: string; desc: string }[]> = {
  '1': [
    { value: '1A', label: 'Pin straight', desc: 'Flat, no volume' },
    { value: '1B', label: 'Straight with body', desc: 'Slight bend, some volume' },
    { value: '1C', label: 'Straight and thick', desc: 'Coarse, no curl' },
  ],
  '2': [
    { value: '2A', label: 'Loose ribbon', desc: 'Almost straight with a hint of S' },
    { value: '2B', label: 'Stretched spring', desc: 'Clear S-shape from mid-length' },
    { value: '2C', label: 'Phone cord', desc: 'Deep waves, almost curls' },
  ],
  '3': [
    { value: '3A', label: 'Around a candle', desc: 'Loose, wide spirals, lots of shine' },
    { value: '3B', label: 'Around a marker', desc: 'Springy ringlets, big volume' },
    { value: '3C', label: 'Around a pencil', desc: 'Tight corkscrews, packed close' },
  ],
  '4': [
    { value: '4A', label: 'Around a chopstick', desc: 'Visible coil springs' },
    { value: '4B', label: 'Sharp Z-bends', desc: 'Zig-zag, sharp angles' },
    { value: '4C', label: 'Around a needle', desc: 'Extremely tight, maximum shrinkage' },
  ],
};

// ─── Phase mapping ───────────────────────────────────────────────
// Step layout (18 total):
//   0 welcome
//   1 strand · 2 curl · 3 subtype · 4 density · 5 why_pattern              → texture
//   6 porosity · 7 why_porosity · 8 scalp · 9 wash_frequency · 10 length   → scalp
//   11 history · 12 why_history · 13 segments · 14 we_hear                 → story
//   15 time_budget · 16 goals · 17 almost                                  → plan
function phaseForStep(idx: number): Phase | null {
  if (idx === 0) return null;
  if (idx <= 5) return 'texture';
  if (idx <= 10) return 'scalp';
  if (idx <= 14) return 'story';
  return 'plan';
}

const PHASE_ORDER: Phase[] = ['texture', 'scalp', 'story', 'plan'];

function completedBefore(phase: Phase | null): Phase[] {
  if (!phase) return [];
  return PHASE_ORDER.slice(0, PHASE_ORDER.indexOf(phase));
}

// 1-based interstitial index for display (00 / 04 for welcome, 01 / 04 onward for the rest)
function interstitialDisplay(stepId: string): string | null {
  const order: Record<string, string> = {
    welcome:     '00 / 04',
    why_pattern: '01 / 04',
    why_porosity:'02 / 04',
    why_history: '03 / 04',
    we_hear:     '\u2014',       // breath beat — no index, just an em-dash
    almost:      '04 / 04',
  };
  return order[stepId] ?? null;
}

// ─── Component ───────────────────────────────────────────────────
const PROGRESS_KEY = 'tressana_quiz_progress';

export default function QuizScreen() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Resume saved progress on mount, if any. We auto-resume rather than
  // showing a dialog — the friction of "pick up where you left off?" is
  // mostly noise. If the user wanted to start over they'd swipe through.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PROGRESS_KEY).then(saved => {
      if (cancelled) return;
      if (saved) {
        try {
          const { idx: savedIdx, answers: savedAnswers } = JSON.parse(saved);
          if (typeof savedIdx === 'number' && savedAnswers && typeof savedAnswers === 'object') {
            setIdx(savedIdx);
            setAnswers(savedAnswers);
          }
        } catch {
          // ignore corrupt progress
        }
      }
      setProgressLoaded(true);
    }).catch(() => setProgressLoaded(true));
    return () => { cancelled = true; };
  }, []);

  // Persist progress on every step or answer change, after initial load.
  // Skip persisting the welcome screen — no reason to "resume" on idx 0.
  useEffect(() => {
    if (!progressLoaded) return;
    if (idx === 0 && Object.keys(answers).length === 0) return;
    AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ idx, answers })).catch(() => {});
  }, [idx, answers, progressLoaded]);

  const mainType = (answers.curl as string) || '';

  const steps = useMemo(() =>
    QUIZ_STEPS.map(s => {
      if (s.kind === 'question' && s.id === 'subtype') {
        // Edge case: if user reached subtype without picking curl (e.g. by
        // skipping back and changing answers), give them a graceful skip
        // instead of an empty options list that silently blocks continue.
        if (!mainType) {
          return {
            ...s,
            options: [{
              value: 'skip',
              label: "Pick a curl pattern first",
              desc: "Tap back, pick a curl, then we\u2019ll come back to this.",
            }],
          };
        }
        return { ...s, options: SUBTYPES[mainType] || [] };
      }
      return s;
    }),
    [mainType]
  );

  const step = steps[idx];
  const currentPhase = phaseForStep(idx);
  const completed = completedBefore(currentPhase);

  // Auto-promotion of growth goal made VISIBLE: when user lands on
  // the goals step with postpartum or transplant in segments, growth
  // is pre-selected and a banner names the inference. User keeps full
  // control — they can deselect.
  const segmentsList = (answers.segments as string[]) || [];
  const autoPromotionReason = segmentsList.includes('postpartum')
    ? 'postpartum'
    : segmentsList.includes('transplant')
      ? 'transplant recovery'
      : null;

  useEffect(() => {
    if (step.kind === 'question' && step.id === 'goals' && autoPromotionReason) {
      const currentGoals = (answers.goals as string[]) || [];
      if (!currentGoals.includes('growth')) {
        setAnswers(a => ({ ...a, goals: [...currentGoals, 'growth'] }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const select = (val: string) => {
    if (step.kind !== 'question') return;
    Haptics.selectionAsync().catch(() => {});
    if (step.multi) {
      const cur = (answers[step.id] as string[]) || [];
      setAnswers(a => ({ ...a, [step.id]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] }));
    } else {
      setAnswers(a => ({ ...a, [step.id]: val }));
    }
  };

  const setSegments = (next: string[]) => {
    setAnswers(a => ({ ...a, segments: next }));
  };

  const isSelected = (val: string) => {
    if (step.kind !== 'question') return false;
    const a = answers[step.id];
    return Array.isArray(a) ? a.includes(val) : a === val;
  };

  const canContinue = (() => {
    if (step.kind === 'interstitial') return true;
    if (step.kind === 'segments') return ((answers.segments as string[])?.length ?? 0) > 0;
    if (step.multi) return ((answers[step.id] as string[])?.length ?? 0) > 0;
    return !!answers[step.id];
  })();

  const finish = useCallback(async () => {
    const hairType = (answers.subtype as string) || ((answers.curl as string) || '') + 'A';
    const segments = (answers.segments as string[]) || ['natural'];
    const goals = (answers.goals as string[]) || [];

    const quizResults = {
      hairType,
      curl: answers.curl,
      subtype: answers.subtype,
      density: answers.density || 'unsure',
      porosity: answers.porosity || 'unsure',
      scalp: answers.scalp || [],
      wash_frequency: answers.wash_frequency || 'few_days',
      length: answers.length || 'mid',
      history: answers.history || [],
      goals,
      segments,
      time_budget: answers.time_budget || 'short',
    };
    await AsyncStorage.setItem('tressana_quiz', JSON.stringify(quizResults));

    // Clear in-progress save now that we have a completed result.
    await AsyncStorage.removeItem(PROGRESS_KEY).catch(() => {});

    try {
      const { supabase } = require('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_action: 'complete_quiz',
          p_reference_id: null,
          p_description: 'Completed hair discovery quiz',
          p_override_amount: null,
        });
      }
    } catch (e) {
      // intentional silent
    }

    router.replace('/name');
  }, [answers, router]);

  const handleNext = useCallback(async () => {
    setShowHelp(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (idx < steps.length - 1) {
      setIdx(i => i + 1);
    } else {
      await finish();
    }
  }, [idx, steps.length, finish]);

  const handleBack = () => {
    setShowHelp(false);
    if (idx > 0) {
      Haptics.selectionAsync().catch(() => {});
      setIdx(i => i - 1);
    } else {
      router.back();
    }
  };

  const ctaLabel = (() => {
    if (step.kind === 'interstitial') {
      if (step.cta) return step.cta;
      if (idx === steps.length - 1) return 'Take me in';
      return 'Continue';
    }
    if (idx === steps.length - 1) return 'See my results';
    return 'Continue';
  })();

  return (
    <View style={$.container}>
      {/* Top nav with journey map — single source of progress */}
      <View style={$.nav}>
        <Pressable onPress={handleBack} style={$.backBtn}>
          <Text style={$.backArrow}>{'\u2039'}</Text>
        </Pressable>
        <View style={$.mapWrap}>
          <JourneyMap currentPhase={currentPhase} completedPhases={completed} compact />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={$.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step.kind === 'interstitial' ? (
          <Animated.View
            key={`int-${step.id}-${idx}`}
            entering={FadeIn.duration(480)}
            exiting={FadeOut.duration(180)}
            style={$.interstitial}
          >
            {interstitialDisplay(step.id) && (
              <Text style={$.intIndex}>{interstitialDisplay(step.id)}</Text>
            )}
            <Text style={$.intTitle}>{step.title}</Text>
            <Text style={$.intBody}>{step.body}</Text>

            {step.id === 'why_pattern'  && <PatternLineup selectedType={(answers.subtype as string) || ''} />}
            {step.id === 'why_porosity' && <CuticleStrands />}
            {/* welcome, why_history, we_hear, almost: deliberately no visual */}
          </Animated.View>
        ) : step.kind === 'segments' ? (
          <Animated.View key={`seg-${idx}`} entering={FadeIn.duration(280)}>
            <View style={$.qRow}>
              <View style={{ flex: 1 }}>
                <Text style={$.question}>{step.question}</Text>
                <Text style={$.qSub}>{step.subtitle}</Text>
              </View>
              <Pressable onPress={() => setShowHelp(true)} style={$.helpBtn}>
                <Text style={$.helpBtnText}>?</Text>
              </Pressable>
            </View>
            <Text style={$.multiLabel}>Select all that apply</Text>
            <QuizSegmentStep
              selected={(answers.segments as string[]) || []}
              onSelect={setSegments}
            />
          </Animated.View>
        ) : (
          <Animated.View key={`q-${step.id}-${idx}`} entering={FadeIn.duration(280)}>
            <View style={$.qRow}>
              <View style={{ flex: 1 }}>
                <Text style={$.question}>{step.question}</Text>
                <Text style={$.qSub}>{step.subtitle}</Text>
              </View>
              <Pressable onPress={() => setShowHelp(true)} style={$.helpBtn}>
                <Text style={$.helpBtnText}>?</Text>
              </Pressable>
            </View>

            {/* Auto-promotion banner — visible on goals step when relevant */}
            {step.id === 'goals' && autoPromotionReason && (
              <View style={$.autoBanner}>
                <Text style={$.autoBannerLabel}>WE\u2019VE PULLED IN</Text>
                <Text style={$.autoBannerTitle}>Length retention</Text>
                <Text style={$.autoBannerBody}>
                  Because you mentioned {autoPromotionReason} \u2014 hair tends to shed more in this phase, that\u2019s normal. Keep it or untap it.
                </Text>
              </View>
            )}

            <Text style={$.tipText}>{step.proTip}</Text>

            {step.multi && <Text style={$.multiLabel}>Select all that apply</Text>}

            {step.id === 'subtype' && mainType && (
              <View style={$.chartRow}>
                {(SUBTYPES[mainType] || []).map(opt => {
                  const active = isSelected(opt.value);
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => select(opt.value)}
                      style={[$.chartItem, active && $.chartItemActive]}
                    >
                      <View style={[$.chartPatternBox, active && $.chartPatternBoxActive]}>
                        <CurlPattern type={opt.value} size={54} color={active ? Colors.violet : Colors.muted} />
                      </View>
                      <Text style={[$.chartLabel, active && $.chartLabelActive]}>{opt.value}</Text>
                      <Text style={[$.chartDesc, active && $.chartDescActive]} numberOfLines={2}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={$.opts}>
              {step.options.map((opt) => {
                const sel = isSelected(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => select(opt.value)}
                    style={({ pressed }) => [$.opt, sel && $.optSel, pressed && $.optPressed]}
                  >
                    {step.id === 'curl' && (
                      <View style={[$.optStrand, sel && $.optStrandSel]}>
                        <CurlPattern type={opt.value} size={54} color={sel ? Colors.violet : Colors.muted} />
                      </View>
                    )}

                    <View style={[$.indicator, sel && $.indicatorOn]}>
                      {sel && <Text style={$.indicatorCheck}>{'\u2713'}</Text>}
                    </View>

                    <View style={$.optBody}>
                      <Text style={[$.optLabel, sel && $.optLabelSel]}>{opt.label}</Text>
                      <Text style={$.optDesc}>{opt.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={$.footer}>
        <Pressable
          onPress={canContinue ? handleNext : undefined}
          disabled={!canContinue}
          style={({ pressed }) => [
            $.nextBtn,
            !canContinue && $.nextBtnOff,
            pressed && canContinue && $.nextBtnPress,
          ]}
        >
          <Text style={[$.nextLabel, !canContinue && $.nextLabelOff]}>{ctaLabel}</Text>
        </Pressable>
      </View>

      {step.kind !== 'interstitial' && (
        <Modal visible={showHelp} transparent animationType="slide">
          <Pressable style={$.sheetOverlay} onPress={() => setShowHelp(false)}>
            <View style={$.sheet} onStartShouldSetResponder={() => true}>
              <View style={$.sheetHandle} />
              <View style={$.sheetHeader}>
                <Text style={$.sheetTitle}>{step.helpTitle}</Text>
                <Pressable onPress={() => setShowHelp(false)}>
                  <Text style={$.sheetClose}>{'\u00d7'}</Text>
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={$.sheetBody}>{step.helpBody}</Text>
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const $ = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  nav: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: Colors.ink, marginTop: -2, marginLeft: -1 },
  mapWrap: { flex: 1 },

  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 30 },

  // Question header
  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  question: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.ink, letterSpacing: -0.5, lineHeight: 28 },
  qSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 4, lineHeight: 19 },
  helpBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  helpBtnText: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.violet },

  // Auto-promotion banner — visible inference on goals step
  autoBanner: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(244,132,185,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.pink,
    marginBottom: 18,
    gap: 4,
  },
  autoBannerLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 10,
    color: Colors.pink,
    letterSpacing: 1.6,
  },
  autoBannerTitle: {
    fontFamily: Fonts.headingSemi, fontSize: 16,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  autoBannerBody: {
    fontFamily: Fonts.body, fontSize: 12,
    color: Colors.ink, opacity: 0.7,
    lineHeight: 17,
    marginTop: 2,
  },

  // Pro tip — italic line
  tipText: {
    fontFamily: Fonts.body, fontStyle: 'italic',
    fontSize: 13, color: Colors.muted,
    lineHeight: 19, marginBottom: 18,
  },

  multiLabel: {
    fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 12,
  },

  // Curl chart
  chartRow: { flexDirection: 'row', gap: 10, marginBottom: 18, marginTop: 4 },
  chartItem: {
    flex: 1, padding: 12, borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', gap: 6,
  },
  chartItemActive: { borderColor: Colors.violet, backgroundColor: 'rgba(118,67,172,0.04)' },
  chartPatternBox: {
    width: 56, height: 70, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: '#F7F5FB',
  },
  chartPatternBoxActive: { backgroundColor: 'rgba(118,67,172,0.10)' },
  chartLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.ink },
  chartLabelActive: { color: Colors.violet },
  chartDesc: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, textAlign: 'center', lineHeight: 13 },
  chartDescActive: { color: Colors.ink },

  // Options
  opts: { gap: 10 },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  optSel: { borderColor: Colors.violet, backgroundColor: 'rgba(118,67,172,0.04)' },
  optPressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },

  optStrand: {
    width: 50, height: 60, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: '#F7F5FB',
  },
  optStrandSel: { backgroundColor: 'rgba(118,67,172,0.10)' },

  indicator: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  indicatorOn: { backgroundColor: Colors.violet, borderColor: Colors.violet },
  indicatorCheck: { fontSize: 12, color: '#fff', fontFamily: Fonts.bodyBold, marginTop: -1 },

  optBody: { flex: 1 },
  optLabel: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.ink, marginBottom: 2 },
  optLabelSel: { color: Colors.violet },
  optDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 16 },

  // Interstitial — editorial layout
  interstitial: {
    paddingTop: 32,
    paddingHorizontal: 4,
    gap: 20,
  },
  intIndex: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 3,
  },
  intTitle: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    color: Colors.ink,
    letterSpacing: -1,
    lineHeight: 38,
  },
  intBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.ink,
    opacity: 0.62,
    lineHeight: 22,
    maxWidth: 360,
    marginBottom: 4,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    backgroundColor: Colors.porcelain,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51,36,99,0.06)',
  },
  nextBtn: {
    width: '100%',
    paddingVertical: 17,
    borderRadius: Radius.lg,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  nextBtnOff: { backgroundColor: '#E0DCD5', shadowOpacity: 0, elevation: 0 },
  nextBtnPress: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  nextLabel: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.white, letterSpacing: 0.2 },
  nextLabelOff: { color: '#9D9686' },

  // Help sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(18,11,46,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32,
    maxHeight: '80%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 14,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.ink, letterSpacing: -0.3 },
  sheetClose: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.muted, lineHeight: 28 },
  sheetBody: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, lineHeight: 22 },
});