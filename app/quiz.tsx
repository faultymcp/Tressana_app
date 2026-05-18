import { useState, useCallback, useMemo } from 'react';
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
  id: 'why_pattern' | 'why_porosity' | 'why_history' | 'almost';
  title: string;
  body: string;
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
  {
    kind: 'question',
    id: 'strand', question: "Let\u2019s find your curl pattern", subtitle: 'Before we start, grab a single strand.', multi: false, showPattern: false,
    proTip: "Separate a few strands from your crown \u2014 that\u2019s your most natural texture. Clean, dry, product-free.",
    helpTitle: 'Why a single strand?',
    helpBody: "Your whole head can look different depending on styling or product buildup. A single clean strand tells the truth. If you\u2019ve had chemical treatments, try a section closest to your roots.",
    options: [
      { value: 'ready', label: "I\u2019ve got my strand", desc: 'Clean, dry, no product \u2014 ready to go' },
      { value: 'skip', label: "I\u2019ll eyeball it", desc: "That\u2019s fine \u2014 we\u2019ll still get close" },
    ],
  },
  {
    kind: 'question',
    id: 'curl', question: 'What does your strand do naturally?', subtitle: 'Hold it at one end and let it hang.', multi: false, showPattern: true,
    proTip: "Don\u2019t stretch it \u2014 let gravity do the work. Watch root to tip.",
    helpTitle: 'Reading your strand',
    helpBody: "Round follicles = straight. Oval = wavy or curly. Flat/elliptical = coily. Understanding this changes everything about how you care for your hair.",
    options: [
      { value: '1', label: 'Falls completely straight', desc: 'No bend, no curve, just hangs' },
      { value: '2', label: 'Makes a loose S-shape', desc: 'Gentle bends, like soft waves' },
      { value: '3', label: 'Springs into curls', desc: 'Defined spirals that bounce back' },
      { value: '4', label: 'Coils up tight', desc: 'Zig-zags, tight coils, or shrinks up' },
    ],
  },
  {
    kind: 'question',
    id: 'subtype', question: 'How tight is the pattern?', subtitle: 'Compare your curl to an everyday object.', multi: false, showPattern: true,
    proTip: "Which object matches the curl size closest?",
    helpTitle: 'The A-B-C system',
    helpBody: "A is loosest, C is tightest. This isn\u2019t about what\u2019s better \u2014 it\u2019s about what your hair needs. Tighter patterns need more moisture. Looser patterns need less weight.",
    options: [],
  },

  // ── INTERSTITIAL 1 ───────────────────────────────────────────────
  {
    kind: 'interstitial',
    id: 'why_pattern',
    title: "It\u2019s structure, not a score.",
    body: "Tighter coils carry less moisture. Looser ones can\u2019t carry weight. We use pattern to match \u2014 not to rank.",
  },

  {
    kind: 'question',
    id: 'porosity', question: 'How does water behave on your hair?', subtitle: 'Think about what happens when it gets wet.', multi: false, showPattern: false,
    proTip: "Does it take forever to get fully wet? Does it dry in minutes or hours?",
    helpTitle: 'The water glass test',
    helpBody: "Drop a clean strand in room-temp water, wait 3 min. Floats = low porosity. Middle = medium. Sinks = high. This tells you which products will actually penetrate vs sit on top.",
    options: [
      { value: 'low', label: 'Takes forever to get wet', desc: 'Water sits on top. Hair stays dry inside.' },
      { value: 'medium', label: 'Gets wet at a normal pace', desc: 'Absorbs steadily. Holds moisture well.' },
      { value: 'high', label: 'Soaks up water instantly', desc: 'Gets drenched fast but dries fast too.' },
      { value: 'unsure', label: 'Not sure yet', desc: "We\u2019ll help you figure this out." },
    ],
  },

  // ── INTERSTITIAL 2 ───────────────────────────────────────────────
  {
    kind: 'interstitial',
    id: 'why_porosity',
    title: "Porosity decides what your hair holds.",
    body: "Most product mismatches come down to this single variable.",
  },

  {
    kind: 'question',
    id: 'scalp', question: "Now let\u2019s talk about your scalp", subtitle: "Healthy hair starts at the root.", multi: true, showPattern: false,
    proTip: "Part your hair and look in a mirror. Touch it \u2014 what do you notice?",
    helpTitle: 'Why scalp health matters',
    helpBody: "Your scalp is where every strand is born. A dry, irritated, or clogged scalp produces weaker hair. We factor scalp condition into every recommendation.",
    options: [
      { value: 'oily', label: 'Gets oily fast', desc: 'Greasy roots within a day or two' },
      { value: 'dry', label: 'Feels tight and dry', desc: 'Scalp feels parched, sometimes itchy' },
      { value: 'flaky', label: 'Flaking or dandruff', desc: 'White flakes when you part your hair' },
      { value: 'sensitive', label: 'Sensitive or tender', desc: 'Reacts to products, gets irritated' },
      { value: 'buildup', label: 'Product buildup', desc: 'Feels coated even after washing' },
      { value: 'healthy', label: 'Feels pretty healthy', desc: 'Balanced and comfortable' },
    ],
  },
  {
    kind: 'question',
    id: 'history', question: 'What has your hair been through?', subtitle: "No judgment \u2014 helps us understand what it needs.", multi: true, showPattern: false,
    proTip: "Be honest \u2014 past treatments affect what works today.",
    helpTitle: 'Why history matters',
    helpBody: "Chemical treatments change your hair\u2019s structure permanently until it grows out. Relaxers break bonds. Colour lifts the cuticle. Heat damage can\u2019t be reversed, only managed. Knowing this means we recommend what actually helps.",
    options: [
      { value: 'colour', label: 'Colour treated', desc: 'Dyed, bleached, or highlighted' },
      { value: 'relaxer', label: 'Chemically relaxed', desc: 'Relaxer or texturiser' },
      { value: 'heat', label: 'Regular heat styling', desc: 'Straighteners, curling irons weekly+' },
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
    body: "We don\u2019t ask to flag damage. We ask so what we recommend fits the hair you have, not the hair someone else thinks you should have.",
  },

  // ── SEGMENTS (before goals) ──────────────────────────────────────
  {
    kind: 'segments',
    id: 'segments',
    question: 'What describes your hair right now?',
    subtitle: 'Select all that apply. Your routine adapts to your current situation, not just your hair type.',
    helpTitle: 'Why this matters',
    helpBody: "Hair care is not one-size-fits-all. Someone with braids needs scalp care between the braids, not deep conditioning. Someone post-transplant needs graft protection, not styling tips. Someone going through chemotherapy needs gentle scalp comfort, not curl definition.",
  },

  {
    kind: 'question',
    id: 'goals', question: 'What matters most to you?', subtitle: "Pick all that apply \u2014 we\u2019ll build your plan around these.", multi: true, showPattern: false,
    proTip: "Pick your top 2\u20133. We\u2019ll prioritise them in your routine.",
    helpTitle: 'How goals shape your plan',
    helpBody: "Each goal changes the products and steps we recommend. Moisture means heavier conditioners. Frizz control focuses on sealants. Growth means protective handling and scalp stimulation. We balance everything so nothing conflicts.",
    options: [
      { value: 'moisture', label: 'More moisture', desc: 'Hair feels dry, rough, or straw-like' },
      { value: 'growth', label: 'Length retention', desc: 'Reduce breakage, grow longer' },
      { value: 'definition', label: 'Curl definition', desc: 'Bouncier, more defined curls' },
      { value: 'frizz', label: 'Frizz control', desc: 'Tame flyaways and puffiness' },
      { value: 'scalp_goal', label: 'Healthier scalp', desc: 'Fix the foundation first' },
      { value: 'damage', label: 'Repair damage', desc: 'Recover from heat or colour damage' },
    ],
  },

  // ── INTERSTITIAL 4 ───────────────────────────────────────────────
  {
    kind: 'interstitial',
    id: 'almost',
    title: "Your routine is loading.",
    body: "Built from your texture, scalp, story, and what you want next. Yours to swap. Ours to adjust.",
  },
];

const SUBTYPES: Record<string, { value: string; label: string; desc: string }[]> = {
  '1': [
    { value: '1A', label: 'Pin straight', desc: 'Flat against your head, no volume at all' },
    { value: '1B', label: 'Straight with body', desc: 'Slight bend at the ends, some volume' },
    { value: '1C', label: 'Straight and thick', desc: 'Coarse strands, can feel wiry but no curl' },
  ],
  '2': [
    { value: '2A', label: 'Like a loose ribbon', desc: 'Barely waves \u2014 almost straight with a hint of S' },
    { value: '2B', label: 'Like a stretched spring', desc: 'Clear S-shape from mid-length down' },
    { value: '2C', label: 'Like a phone cord', desc: 'Deep waves that almost form curls' },
  ],
  '3': [
    { value: '3A', label: 'Fits around a candle', desc: 'Loose, wide spirals with lots of shine' },
    { value: '3B', label: 'Fits around a marker', desc: 'Springy ringlets with big volume' },
    { value: '3C', label: 'Fits around a pencil', desc: 'Tight corkscrews packed close together' },
  ],
  '4': [
    { value: '4A', label: 'Fits around a chopstick', desc: 'Visible coil springs' },
    { value: '4B', label: 'Sharp Z-bends', desc: 'Zig-zag pattern, bends sharply' },
    { value: '4C', label: 'Fits around a needle', desc: 'Extremely tight, maximum shrinkage' },
  ],
};

// ─── Phase mapping ───────────────────────────────────────────────
function phaseForStep(idx: number): Phase {
  if (idx <= 3) return 'texture';
  if (idx <= 6) return 'scalp';
  if (idx <= 9) return 'story';
  return 'plan';
}
const PHASE_ORDER: Phase[] = ['texture', 'scalp', 'story', 'plan'];
function completedBefore(phase: Phase): Phase[] {
  return PHASE_ORDER.slice(0, PHASE_ORDER.indexOf(phase));
}

// Returns 1-based interstitial index ("01", "02", "03", "04") for the given step index.
function interstitialNumber(idx: number): string {
  let n = 0;
  for (let i = 0; i <= idx; i++) {
    if (QUIZ_STEPS[i].kind === 'interstitial') n++;
  }
  return n.toString().padStart(2, '0');
}

// ════════════════════════════════════════════════════════════════
// Interstitials use the animated visuals from components/InterstitialVisuals.tsx.
// Each is framed by a section index and editorial title above, body below.
// Interstitial 4 uses no visual — the JourneyMap at the top of the screen
// already shows all phases complete.
// ════════════════════════════════════════════════════════════════

// ─── Component ───────────────────────────────────────────────────
export default function QuizScreen() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showHelp, setShowHelp] = useState(false);

  const mainType = (answers.curl as string) || '';

  const steps = useMemo(() =>
    QUIZ_STEPS.map(s => {
      if (s.kind === 'question' && s.id === 'subtype' && mainType) {
        return { ...s, options: SUBTYPES[mainType] || [] };
      }
      return s;
    }),
    [mainType]
  );

  const step = steps[idx];
  const currentPhase = phaseForStep(idx);
  const completed = completedBefore(currentPhase);

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

    const autoGoals = [...((answers.goals as string[]) || [])];
    if (segments.includes('postpartum') && !autoGoals.includes('growth')) autoGoals.push('growth');
    if (segments.includes('transplant') && !autoGoals.includes('growth')) autoGoals.push('growth');

    const quizResults = {
      hairType,
      curl: answers.curl,
      subtype: answers.subtype,
      porosity: answers.porosity || 'unsure',
      scalp: answers.scalp || [],
      history: answers.history || [],
      goals: autoGoals,
      segments,
    };
    await AsyncStorage.setItem('tressana_quiz', JSON.stringify(quizResults));

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

    router.replace('/reveal');
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

  const ctaLabel = step.kind === 'interstitial'
    ? (idx === steps.length - 1 ? 'See my routine' : 'Continue')
    : (idx === steps.length - 1 ? 'See my results' : 'Continue');

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
          // ─────────────────────────────────────────────────────────────
          // Editorial layout: section index, big confident title, body,
          // one typographic flourish below (or none, for the closer).
          // No badges, no pills, no illustrations.
          // ─────────────────────────────────────────────────────────────
          <Animated.View
            key={`int-${step.id}-${idx}`}
            entering={FadeIn.duration(480)}
            exiting={FadeOut.duration(180)}
            style={$.interstitial}
          >
            <Text style={$.intIndex}>{interstitialNumber(idx)}  /  04</Text>
            <Text style={$.intTitle}>{step.title}</Text>
            <Text style={$.intBody}>{step.body}</Text>

            {step.id === 'why_pattern'  && <PatternLineup selectedType={(answers.subtype as string) || ''} />}
            {step.id === 'why_porosity' && <CuticleStrands />}
            {/* why_history: deliberately no visual — restraint is the gesture */}
            {/* almost: no visual — JourneyMap at top already shows completion */}
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

      {/* Footer CTA — solid violet, no gradient */}
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

      {/* Help sheet */}
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

// ─── Screen styles ──────────────────────────────────────────────
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

  // Pro tip — italic line, no badge no card
  tipText: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 19,
    marginBottom: 18,
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

  // Editorial interstitial
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

  // Footer — solid violet, no gradient
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