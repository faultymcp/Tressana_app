import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import Animated, { FadeInUp } from 'react-native-reanimated';

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

// ─── Quiz Data ───────────────────────────────────────────────────
const QUIZ_STEPS = [
  {
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
    id: 'subtype', question: 'How tight is the pattern?', subtitle: 'Compare your curl to an everyday object.', multi: false, showPattern: true,
    proTip: "Which object matches the curl size closest?",
    helpTitle: 'The A-B-C system',
    helpBody: "A is loosest, C is tightest. This isn\u2019t about what\u2019s better \u2014 it\u2019s about what your hair needs. Tighter patterns need more moisture. Looser patterns need less weight.",
    options: [],
  },
  {
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
  {
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
  {
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

// ─── Component ───────────────────────────────────────────────────
export default function QuizScreen() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showHelp, setShowHelp] = useState(false);

  const mainType = (answers.curl as string) || '';
  const steps = QUIZ_STEPS.map(s => s.id === 'subtype' && mainType ? { ...s, options: SUBTYPES[mainType] || [] } : s);
  const step = steps[idx];
  const progress = ((idx + 1) / steps.length) * 100;

  const select = (val: string) => {
    if (step.multi) {
      const cur = (answers[step.id] as string[]) || [];
      setAnswers(a => ({ ...a, [step.id]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] }));
    } else {
      setAnswers(a => ({ ...a, [step.id]: val }));
    }
  };

  const isSelected = (val: string) => {
    const a = answers[step.id];
    return Array.isArray(a) ? a.includes(val) : a === val;
  };

  const canContinue = step.multi
    ? ((answers[step.id] as string[])?.length > 0)
    : !!answers[step.id];

  const handleNext = useCallback(async () => {
    setShowHelp(false);
    if (idx < steps.length - 1) {
      setIdx(i => i + 1);
    } else {
      // Save quiz answers and go straight to results — no auth
      const hairType = (answers.subtype as string) || ((answers.curl as string) || '') + 'A';
      const quizResults = {
        hairType,
        curl: answers.curl,
        subtype: answers.subtype,
        porosity: answers.porosity || 'unsure',
        scalp: answers.scalp || [],
        history: answers.history || [],
        goals: answers.goals || [],
      };
      await AsyncStorage.setItem('tressana_quiz', JSON.stringify(quizResults));
      router.replace('/reveal');
    }
  }, [idx, steps.length, answers, router]);

  const handleBack = () => {
    setShowHelp(false);
    idx > 0 ? setIdx(i => i - 1) : router.back();
  };

  return (
    <View style={$.container}>
      {/* Nav bar */}
      <View style={$.nav}>
        <Pressable onPress={handleBack} style={$.backBtn}>
          <Text style={$.backArrow}>‹</Text>
        </Pressable>
        <View style={$.progressTrack}>
          <LinearGradient
            colors={[Colors.lime, Colors.violet]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[$.progressFill, { width: `${progress}%` }]}
          />
        </View>
        <Text style={$.stepNum}>{idx + 1}/{steps.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={$.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question */}
        <Animated.View key={`q-${step.id}-${idx}`} entering={FadeInUp.duration(300)}>
          <View style={$.qRow}>
            <View style={{ flex: 1 }}>
              <Text style={$.question}>{step.question}</Text>
              <Text style={$.qSub}>{step.subtitle}</Text>
            </View>
            <Pressable onPress={() => setShowHelp(true)} style={$.helpBtn}>
              <Text style={$.helpBtnText}>?</Text>
            </Pressable>
          </View>

          {/* Pro tip */}
          <View style={$.tip}>
            <View style={$.tipBadge}><Text style={$.tipBadgeText}>PRO TIP</Text></View>
            <Text style={$.tipText}>{step.proTip}</Text>
          </View>

          {step.multi && <Text style={$.multiLabel}>Select all that apply</Text>}
        </Animated.View>

        {/* Subtype pattern chart */}
        {step.id === 'subtype' && mainType && (
          <Animated.View entering={FadeInUp.delay(50).duration(300)} style={$.chartRow}>
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
          </Animated.View>
        )}

        {/* Options */}
        <View style={$.opts}>
          {step.options.map((opt, i) => {
            const sel = isSelected(opt.value);
            return (
              <Animated.View key={opt.value} entering={FadeInUp.delay(50 * i).duration(250)}>
                <Pressable
                  onPress={() => select(opt.value)}
                  style={[$.opt, sel && $.optSel]}
                >
                  {/* Curl illustration for main curl step */}
                  {step.showPattern && step.id === 'curl' && (
                    <View style={[$.optStrand, sel && $.optStrandSel]}>
                      <CurlPattern type={opt.value} size={56} color={sel ? Colors.violet : Colors.ink} />
                    </View>
                  )}

                  {/* Selection indicator */}
                  <View style={[$.indicator, sel && $.indicatorOn]}>
                    {sel && <Text style={$.indicatorCheck}>✓</Text>}
                  </View>

                  {/* Text */}
                  <View style={$.optBody}>
                    <Text style={[$.optLabel, sel && $.optLabelSel]}>{opt.label}</Text>
                    <Text style={$.optDesc}>{opt.desc}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={$.footer}>
        <Pressable
          onPress={handleNext}
          disabled={!canContinue}
          style={({ pressed }) => [
            $.nextBtn,
            !canContinue && $.nextBtnOff,
            pressed && canContinue && $.nextBtnPress,
          ]}
        >
          <LinearGradient
            colors={canContinue ? (Colors.gradientPrimary as [string, string]) : (['#D1D1D6', '#D1D1D6'] as [string, string])}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={$.nextInner}
          >
            <Text style={[$.nextLabel, !canContinue && $.nextLabelOff]}>
              {idx === steps.length - 1 ? 'See my results' : 'Continue'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Help bottom sheet */}
      <Modal visible={showHelp} transparent animationType="slide" onRequestClose={() => setShowHelp(false)}>
        <Pressable style={$.sheetOverlay} onPress={() => setShowHelp(false)}>
          <Pressable style={$.sheet} onPress={e => e.stopPropagation()}>
            <View style={$.sheetHandle} />
            <View style={$.sheetHeader}>
              <Text style={$.sheetTitle}>{step.helpTitle}</Text>
              <Pressable onPress={() => setShowHelp(false)} hitSlop={12}>
                <Text style={$.sheetClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={$.sheetBody}>{step.helpBody}</Text>

              {/* Visual guide for curl step */}
              {step.id === 'curl' && (
                <View style={$.guideSection}>
                  <Text style={$.guideTitle}>Visual guide</Text>
                  {[
                    { type: '1', name: 'Type 1 — Straight', desc: 'Falls flat with no curl' },
                    { type: '2', name: 'Type 2 — Wavy', desc: 'S-shaped bends and flowing curves' },
                    { type: '3', name: 'Type 3 — Curly', desc: 'Defined spirals that bounce back' },
                    { type: '4', name: 'Type 4 — Coily', desc: 'Tight coils or zig-zag pattern' },
                  ].map(g => (
                    <View key={g.type} style={$.guideRow}>
                      <View style={$.guidePatternBox}>
                        <CurlPattern type={g.type} size={50} color={Colors.violet} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={$.guideName}>{g.name}</Text>
                        <Text style={$.guideDesc}>{g.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const $ = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  // Nav
  nav: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingHorizontal: 20, paddingBottom: 14, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 26, color: Colors.ink, marginTop: -2 },
  progressTrack: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepNum: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.muted, minWidth: 28, textAlign: 'right' },

  // Content
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },

  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  question: { fontFamily: Fonts.heading, fontSize: 21, color: Colors.ink, letterSpacing: -0.3, lineHeight: 27 },
  qSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 19, marginTop: 5 },

  helpBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.violetBg, borderWidth: 1.5, borderColor: Colors.violetBg2,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  helpBtnText: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.violet },

  // Pro tip
  tip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 13, borderRadius: 12,
    backgroundColor: 'rgba(217,255,0,0.05)',
    borderWidth: 1, borderColor: 'rgba(217,255,0,0.12)',
    marginBottom: 18,
  },
  tipBadge: {
    backgroundColor: 'rgba(217,255,0,0.2)',
    paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8, marginTop: 1,
  },
  tipBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 8, color: '#5a6b00', letterSpacing: 0.8 },
  tipText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.ink, lineHeight: 18, flex: 1, opacity: 0.65 },

  multiLabel: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.violet, marginBottom: 10 },

  // Subtype chart
  chartRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 10,
    padding: 14, marginBottom: 18, borderRadius: 14,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  chartItem: {
    flex: 1, alignItems: 'center', gap: 6, padding: 10, borderRadius: 12,
    borderWidth: 2, borderColor: 'transparent',
  },
  chartItemActive: {
    borderColor: Colors.violet, backgroundColor: Colors.white,
    shadowColor: Colors.violet, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  chartPatternBox: {
    width: 50, height: 64, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7F5FB', borderRadius: 10,
  },
  chartPatternBoxActive: { backgroundColor: '#F0EBFA' },
  chartLabel: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.muted },
  chartLabelActive: { color: Colors.violet },
  chartDesc: { fontFamily: Fonts.body, fontSize: 9, color: Colors.muted, textAlign: 'center', lineHeight: 13 },
  chartDescActive: { color: Colors.ink },

  // Options
  opts: { gap: 10 },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.lg, backgroundColor: Colors.white,
  },
  optSel: {
    borderColor: Colors.violet,
    backgroundColor: Colors.white,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  // Curl strand illustration in option
  optStrand: {
    width: 50, height: 64, borderRadius: 12,
    backgroundColor: '#F7F5FB',
    alignItems: 'center', justifyContent: 'center',
  },
  optStrandSel: { backgroundColor: '#F0EBFA' },

  // Selection indicator
  indicator: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  indicatorOn: {
    borderColor: 'transparent',
    backgroundColor: Colors.violet,
  },
  indicatorCheck: { color: Colors.white, fontSize: 13, fontWeight: '700', marginTop: -1 },

  optBody: { flex: 1, gap: 3 },
  optLabel: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink },
  optLabelSel: { color: Colors.violet },
  optDesc: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, lineHeight: 16 },

  // Footer
  footer: {
    paddingHorizontal: 20, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.porcelain,
  },
  nextBtn: {
    borderRadius: Radius.lg, overflow: 'hidden',
    shadowColor: Colors.violet, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  nextBtnOff: { shadowOpacity: 0 },
  nextBtnPress: { transform: [{ scale: 0.985 }] },
  nextInner: { paddingVertical: 17, alignItems: 'center' },
  nextLabel: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.white },
  nextLabelOff: { color: '#999' },

  // Help sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(18,11,46,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.porcelain, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 42 : 28,
    maxHeight: '85%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: Fonts.heading, fontSize: 19, color: Colors.ink },
  sheetClose: { fontSize: 20, color: Colors.muted, padding: 4 },
  sheetBody: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 23, color: Colors.ink, opacity: 0.7, marginBottom: 12 },

  // Visual guide
  guideSection: { marginTop: 8 },
  guideTitle: { fontFamily: Fonts.headingSemi, fontSize: 14, color: Colors.ink, marginBottom: 12 },
  guideRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 12, borderRadius: 12, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  guidePatternBox: {
    width: 50, height: 60, borderRadius: 12, backgroundColor: '#F7F5FB',
    alignItems: 'center', justifyContent: 'center',
  },
  guideName: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.ink },
  guideDesc: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, lineHeight: 16 },
});