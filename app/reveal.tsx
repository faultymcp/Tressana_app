// app/reveal.tsx
//
// The reveal. Magazine-cover energy. Seven cards, swipe or tap to advance.
// Deep violet/black base with pink + gold accents.
//
// Architecture:
//   - Data generation (buildRecognition, buildInsight, etc.) is kept from
//     the previous version. It works.
//   - Rendering is replaced: a horizontal pager with 7 cards, gesture-
//     driven, with progress dots and fade-in animations.
//
// Card sequence:
//   1. We made this for you (anticipation opener)
//   2. The Cover (magazine-style name + type)
//   3. What we know about you (facts reflected back)
//   4. The insight (one bold thing they didn't know)
//   5. What your hair does well (validation/strengths)
//   6. Your routine, in brief (teaser, not the full list)
//   7. Your hair is complex. That's the point. (validation closer + CTA)

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════
// Data generation — unchanged from previous reveal.
// Keeping all the type-aware logic for recognition, insight,
// strengths, watch-outs, and routine building.
// ═══════════════════════════════════════════════════════════════

const TYPE_NAMES: Record<string, string> = {
  '1A': 'Pin straight', '1B': 'Straight with body', '1C': 'Straight and thick',
  '2A': 'Loose waves',  '2B': 'Defined waves',     '2C': 'Deep waves',
  '3A': 'Loose curls',  '3B': 'Springy ringlets',  '3C': 'Tight corkscrews',
  '4A': 'Soft coils',   '4B': 'Z-pattern coils',   '4C': 'Tight coils',
};

const TYPE_TAGLINE: Record<string, string> = {
  '1A': 'The smooth, the simple, the sleek.',
  '1B': 'Straight with quiet body.',
  '1C': 'Straight with weight and shine.',
  '2A': 'Waves that come and go.',
  '2B': 'Waves that stay.',
  '2C': 'Almost curls — fully waves.',
  '3A': 'Spirals with a gentle hand.',
  '3B': 'Springy. Bouncy. Defined.',
  '3C': 'Corkscrews, packed and proud.',
  '4A': 'Coils that hold their shape.',
  '4B': 'Sharp angles. Strong character.',
  '4C': 'Tight, dense, deeply textured.',
};

const STRAND_LABEL: Record<string, string> = {
  fine: 'fine strands', medium: 'medium strands', coarse: 'coarse strands', unsure: 'unmeasured',
};
const DENSITY_LABEL: Record<string, string> = {
  low: 'low density', medium: 'medium density', high: 'high density', unsure: 'unmeasured',
};
const POROSITY_LABEL: Record<string, string> = {
  low: 'low porosity', medium: 'medium porosity', high: 'high porosity', unsure: 'unmeasured',
};
const WASH_LABEL: Record<string, string> = {
  daily: 'wash daily', few_days: 'wash every 2–3 days', weekly: 'wash weekly', co_wash: 'co-wash only',
};
const TIME_LABEL: Record<string, string> = {
  minimal: 'under 10 minutes a morning', short: '10 to 20 minutes a morning',
  medium: '20 to 40 minutes a morning', generous: '40+ minutes when it wants them',
};
const GOAL_LABEL: Record<string, string> = {
  moisture: 'more moisture', growth: 'length retention', definition: 'curl definition',
  frizz: 'frizz control', scalp_goal: 'scalp health', damage: 'damage repair',
  volume: 'more volume', shine: 'more shine',
};
const HISTORY_LABEL: Record<string, string> = {
  colour: 'colour-treated', relaxer: 'chemically relaxed', heat: 'regularly heat-styled',
  protective: 'often in protective styles', natural: 'fully natural', transitioning: 'currently transitioning',
};
const SEGMENT_LABEL: Record<string, string> = {
  natural: 'fully natural', braids: 'in braids', sewn_in: 'wearing a sewn-in', wig: 'wearing a wig',
  transplant: 'post-transplant', alopecia: 'with alopecia', chemo: 'going through chemo',
  postpartum: 'postpartum', transitioning: 'transitioning',
};

function buildOneInsight(data: any): { title: string; body: string } {
  const type = data.hairType || '3A';
  const group = type.charAt(0);
  const strand = data.strand_thickness;
  const porosity = data.porosity;
  const density = data.density;
  const segments = (data.segments || []) as string[];

  if (density === 'low' && (segments.includes('postpartum') || segments.includes('transplant') || segments.includes('chemo'))) {
    return {
      title: 'Your density is in a chapter, not a verdict.',
      body: 'Postpartum, transplant, and chemo recovery all run on their own timelines. Most regrowth shows real progress at the four-to-six-month mark. The hairs you have now are the scaffolding — we protect them.',
    };
  }
  if (porosity === 'low') {
    return {
      title: 'Low porosity changes the order of everything.',
      body: 'Your cuticles lie tight against the strand — water beads on top instead of soaking in. Most product advice was written for medium porosity. For you: apply to damp not soaking hair, use warmth, skip the thick butters.',
    };
  }
  if (porosity === 'high') {
    return {
      title: 'High porosity needs sealing, not just moisture.',
      body: 'Your hair drinks fast and dries fast. Adding more moisture without sealing it is why your hair feels dry an hour after conditioning. Layer: water first, oil to seal, cream to lock. Three layers, in that order.',
    };
  }
  if (strand === 'fine' && ['3', '4'].includes(group)) {
    return {
      title: 'Fine strands with strong pattern.',
      body: 'Your hair has a real curl, but each strand is light. Heavy creams will weigh the pattern down. Reach for water-based leave-ins and lightweight gels — your pattern comes out stronger with less product, not more.',
    };
  }
  if (strand === 'coarse' && ['3', '4'].includes(group)) {
    return {
      title: 'Coarse strands carry weight beautifully.',
      body: 'Butters, heavier creams, oil-based sealants — your strands handle them. Your hair is built to hold the products that would suffocate finer hair. Use that.',
    };
  }
  return {
    title: 'Your structure shapes your routine.',
    body: 'Pattern, density, and porosity together decide what your hair needs more than any single factor. Your routine is built from all three together.',
  };
}

function buildStrengths(type: string, strand: string, porosity: string): string[] {
  const group = type.charAt(0);
  const base: Record<string, string[]> = {
    '1': ['Length retention is naturally high — ends stay protected.', 'Products spread easily without resistance.'],
    '2': ['Holds styling with very little product.', 'Bounces back after sleep with a quick refresh.'],
    '3': ['Pattern is defined and visible — products work with it, not against it.', 'Shrinks less than coilier patterns; length shows even when dry.'],
    '4': ['Holds protective styles longer than any other type.', 'Versatile — stretches, defines, picks out without chemical help.'],
  };
  const out = [...(base[group] || base['3'])];
  if (strand === 'coarse') out.push('Coarse strands are structurally strong — they take colour and heat better than finer hair.');
  else if (strand === 'fine') out.push('Fine strands move and shine in a way coarser hair cannot.');
  if (porosity === 'medium') out.push('Medium porosity is the most flexible — most products work without much fuss.');
  return out.slice(0, 3);
}

function buildReadback(data: any): string[] {
  const lines: string[] = [];
  const history = (data.history || []) as string[];
  const segments = (data.segments || []) as string[];
  const goals = (data.goals || []) as string[];

  const hist = history.filter(h => h !== 'natural').map(h => HISTORY_LABEL[h]).filter(Boolean);
  if (hist.length > 0) lines.push(`Your hair has been ${hist.join(', ')}.`);
  const segs = segments.filter(s => s !== 'natural').map(s => SEGMENT_LABEL[s]).filter(Boolean);
  if (segs.length > 0) lines.push(`Right now, you're ${segs.join(', ')}.`);

  const wash = WASH_LABEL[data.wash_frequency];
  const time = TIME_LABEL[data.time_budget];
  if (wash && time) lines.push(`You ${wash}, with ${time}.`);
  else if (wash) lines.push(`You ${wash}.`);

  const labelledGoals = goals.map(g => GOAL_LABEL[g]).filter(Boolean);
  if (labelledGoals.length > 0) lines.push(`You want ${labelledGoals.join(', ')}.`);

  return lines;
}

function buildRoutineTeaser(data: any): { count: number; preview: string[] } {
  const type = data.hairType || '3A';
  const group = type.charAt(0);
  const wash = data.wash_frequency;

  const teasers: Record<string, string[]> = {
    '1': ['Gentle cleanse', 'Light condition', 'Volume styling', 'Heat protection', 'Night protect'],
    '2': ['Sulfate-free wash', 'Mid-length condition', 'Scrunch + diffuse', 'Refresh between washes', 'Satin pillow'],
    '3': ['Pre-wash oil', 'Sulfate-free cleanse', 'Layered styling', 'Seal with oil', 'Pineapple at night'],
    '4': ['Pre-wash oil', 'Co-wash or gentle cleanse', 'Deep condition weekly', 'LOC styling', 'Bonnet or satin scarf'],
  };
  const list = teasers[group] || teasers['3'];
  const count = (group === '4' ? 8 : group === '3' ? 7 : 6) + (wash !== 'daily' ? 1 : 0);
  return { count, preview: list.slice(0, 3) };
}

function generateResults(name: string, data: any) {
  const ht = data.hairType || '3A';
  const strand = data.strand_thickness;
  const porosity = data.porosity;
  const facts = [TYPE_NAMES[ht]?.toLowerCase(), STRAND_LABEL[strand], POROSITY_LABEL[porosity]]
    .filter(Boolean).join(' · ');
  return {
    name,
    hairType: ht,
    typeName: TYPE_NAMES[ht] || `Type ${ht}`,
    typeTagline: TYPE_TAGLINE[ht] || '',
    facts,
    readback: buildReadback(data),
    insight: buildOneInsight(data),
    strengths: buildStrengths(ht, strand, porosity),
    routineTeaser: buildRoutineTeaser(data),
  };
}

// ═══════════════════════════════════════════════════════════════
// Card illustrations — one distinct shape per card
// ═══════════════════════════════════════════════════════════════

function StarBurst() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id="g1" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#D9FF00" stopOpacity="1" />
          <Stop offset="100%" stopColor="#F484B9" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="60" cy="60" r="50" fill="url(#g1)" opacity="0.6" />
      <Path d="M60 20 L65 55 L100 60 L65 65 L60 100 L55 65 L20 60 L55 55 Z" fill="#F484B9" opacity="0.85" />
    </Svg>
  );
}

function CurlGlyph({ type, color = '#FFFEF7', size = 130 }: { type: string; color?: string; size?: number }) {
  let d = '';
  const cx = 25;
  let sw = 2.4;
  if (type === '1' || type === '1A') { d = `M${cx} 2 L${cx} 68`; sw = 2.2; }
  else if (type === '1B') { d = `M${cx} 2 Q${cx+3} 20, ${cx} 35 Q${cx-3} 50, ${cx} 68`; }
  else if (type === '1C') { d = `M${cx} 2 L${cx} 68`; sw = 3.5; }
  else if (type === '2A') { d = `M${cx} 2 Q${cx+10} 14, ${cx} 24 Q${cx-10} 34, ${cx} 44 Q${cx+8} 54, ${cx} 68`; sw = 2.2; }
  else if (type === '2B') { d = `M${cx} 2 Q${cx+12} 10, ${cx} 18 Q${cx-12} 26, ${cx} 34 Q${cx+12} 42, ${cx} 50 Q${cx-12} 58, ${cx} 68`; }
  else if (type === '2C') { d = `M${cx} 2 Q${cx+14} 7, ${cx} 13 Q${cx-14} 19, ${cx} 24 Q${cx+14} 29, ${cx} 35 Q${cx-14} 41, ${cx} 46 Q${cx+14} 51, ${cx} 57 Q${cx-14} 63, ${cx} 68`; }
  else if (type === '3' || type === '3A') { d = `M${cx} 2 C${cx+18} 5, ${cx+18} 16, ${cx} 18 C${cx-18} 20, ${cx-18} 31, ${cx} 33 C${cx+18} 35, ${cx+18} 46, ${cx} 48 C${cx-18} 50, ${cx-18} 61, ${cx} 63 L${cx} 68`; sw = 2; }
  else if (type === '3B') { d = `M${cx} 2 C${cx+16} 4, ${cx+16} 12, ${cx} 14 C${cx-16} 16, ${cx-16} 24, ${cx} 26 C${cx+16} 28, ${cx+16} 36, ${cx} 38 C${cx-16} 40, ${cx-16} 48, ${cx} 50 C${cx+16} 52, ${cx+16} 60, ${cx} 62 L${cx} 68`; sw = 2; }
  else if (type === '3C') { d = `M${cx} 2 C${cx+14} 3, ${cx+14} 9, ${cx} 10 C${cx-14} 11, ${cx-14} 17, ${cx} 18 C${cx+14} 19, ${cx+14} 25, ${cx} 26 C${cx-14} 27, ${cx-14} 33, ${cx} 34 C${cx+14} 35, ${cx+14} 41, ${cx} 42 C${cx-14} 43, ${cx-14} 49, ${cx} 50 C${cx+14} 51, ${cx+14} 57, ${cx} 58 C${cx-14} 59, ${cx-14} 65, ${cx} 66`; sw = 1.9; }
  else if (type === '4A') { d = `M${cx} 2 C${cx+11} 3, ${cx+11} 7, ${cx} 8 C${cx-11} 9, ${cx-11} 13, ${cx} 14 C${cx+11} 15, ${cx+11} 19, ${cx} 20 C${cx-11} 21, ${cx-11} 25, ${cx} 26 C${cx+11} 27, ${cx+11} 31, ${cx} 32 C${cx-11} 33, ${cx-11} 37, ${cx} 38 C${cx+11} 39, ${cx+11} 43, ${cx} 44 C${cx-11} 45, ${cx-11} 49, ${cx} 50 C${cx+11} 51, ${cx+11} 55, ${cx} 56 C${cx-11} 57, ${cx-11} 61, ${cx} 62 C${cx+11} 63, ${cx+11} 67, ${cx} 68`; sw = 1.7; }
  else if (type === '4B') { let y = 2; d = `M${cx} ${y}`; let left = true; while (y + 6 <= 68) { y += 6; d += ` L${left ? cx-10 : cx+10} ${y}`; left = !left; } sw = 1.7; }
  else if (type === '4C') { d = `M${cx} 2`; for (let y = 2; y + 5 <= 68; y += 5) { d += ` C${cx+9} ${y+1}, ${cx+9} ${y+4}, ${cx} ${y+5} C${cx-9} ${y+6}, ${cx-9} ${y+9}, ${cx} ${y+10}`; y += 5; } sw = 1.6; }
  if (!d) return null;
  return <Svg width={size * 0.7} height={size} viewBox="0 0 50 70"><Path d={d} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function SealRing() {
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="44" fill="none" stroke="#D9FF00" strokeWidth="1.5" opacity="0.7" />
      <Circle cx="50" cy="50" r="36" fill="none" stroke="#F484B9" strokeWidth="1" opacity="0.6" />
      <Circle cx="50" cy="50" r="28" fill="none" stroke="#D9FF00" strokeWidth="1" opacity="0.4" />
    </Svg>
  );
}

function LeafSprig() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110">
      <Path d="M55 15 Q35 40 30 70 Q40 85 55 95" stroke="#D9FF00" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M55 30 Q70 32 78 25" stroke="#D9FF00" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M48 50 Q33 50 25 42" stroke="#D9FF00" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M45 70 Q62 73 72 65" stroke="#D9FF00" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function StepRings() {
  return (
    <Svg width={130} height={70} viewBox="0 0 130 70">
      <Circle cx="20" cy="35" r="14" fill="none" stroke="#F484B9" strokeWidth="1.8" />
      <Circle cx="55" cy="35" r="14" fill="none" stroke="#C38CD9" strokeWidth="1.8" />
      <Circle cx="90" cy="35" r="14" fill="none" stroke="#7643AC" strokeWidth="1.8" />
      <Path d="M34 35 L41 35" stroke="#FFFEF7" strokeWidth="1" opacity="0.5" />
      <Path d="M69 35 L76 35" stroke="#FFFEF7" strokeWidth="1" opacity="0.5" />
    </Svg>
  );
}

function ClosingBloom() {
  return (
    <Svg width={140} height={140} viewBox="0 0 140 140">
      <Defs>
        <RadialGradient id="bloom" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#D9FF00" stopOpacity="0.9" />
          <Stop offset="50%" stopColor="#F484B9" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#7643AC" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="70" cy="70" r="60" fill="url(#bloom)" />
      <Circle cx="70" cy="70" r="3" fill="#FFFEF7" />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// Card components — one per beat of the reveal
// ═══════════════════════════════════════════════════════════════

// Small magazine-style page indicator. "01 / 07" in gold serif.
function PageNumber({ index, total }: { index: number; total: number }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <View style={st.pageNum}>
      <Text style={st.pageNumText}>{pad(index)}</Text>
      <Text style={st.pageNumSep}> / </Text>
      <Text style={st.pageNumTextDim}>{pad(total)}</Text>
    </View>
  );
}

// Card wrapper with staggered entrance: illustration first, then label,
// then headline. Creates a small editorial cascade per card.
function CardWrapper({
  index,
  total,
  children,
}: {
  index: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(420)}
      style={st.cardInner}
    >
      <PageNumber index={index} total={total} />
      {children}
    </Animated.View>
  );
}

function Card1_Opening({ name, index, total }: { name: string; index: number; total: number }) {
  return (
    <CardWrapper index={index} total={total}>
      <View style={st.illust}>
        <StarBurst />
      </View>
      <Text style={st.eyebrowGold}>WE MADE THIS FOR YOU</Text>
      <Text style={st.heroName}>{name}.</Text>
      <Text style={st.openingBody}>
        Take a breath. What comes next is your hair, read back to you.
      </Text>
    </CardWrapper>
  );
}

function Card2_Cover({ results, index, total }: { results: any; index: number; total: number }) {
  return (
    <CardWrapper index={index} total={total}>
      <Text style={st.coverIssue}>ISSUE · {results.hairType}</Text>
      <View style={st.illust}>
        <CurlGlyph type={results.hairType} size={150} />
      </View>
      <Text style={st.coverHeadline}>{results.typeName}.</Text>
      <Text style={st.coverTagline}>{results.typeTagline}</Text>
      <View style={st.divider} />
      <Text style={st.coverFacts}>{results.facts}</Text>
    </CardWrapper>
  );
}

function Card3_Readback({ results, index, total }: { results: any; index: number; total: number }) {
  return (
    <CardWrapper index={index} total={total}>
      <View style={st.illust}>
        <SealRing />
      </View>
      <Text style={st.eyebrowGold}>WHAT WE KNOW</Text>
      <View style={{ gap: 14, marginTop: 8 }}>
        {results.readback.map((line: string, i: number) => (
          <Text key={i} style={st.readbackLine}>{line}</Text>
        ))}
      </View>
    </CardWrapper>
  );
}

function Card4_Insight({ insight, index, total }: { insight: any; index: number; total: number }) {
  return (
    <CardWrapper index={index} total={total}>
      <Text style={st.eyebrowGold}>SOMETHING TO KNOW</Text>
      <Text style={st.insightTitle}>{insight.title}</Text>
      <View style={st.divider} />
      <Text style={st.insightBody}>{insight.body}</Text>
    </CardWrapper>
  );
}

function Card5_Strengths({ strengths, index, total }: { strengths: string[]; index: number; total: number }) {
  return (
    <CardWrapper index={index} total={total}>
      <View style={st.illust}>
        <LeafSprig />
      </View>
      <Text style={st.eyebrowGold}>WHAT YOUR HAIR DOES WELL</Text>
      <View style={{ gap: 16, marginTop: 12 }}>
        {strengths.map((s, i) => (
          <View key={i} style={st.strengthRow}>
            <Text style={st.strengthNum}>0{i + 1}</Text>
            <Text style={st.strengthText}>{s}</Text>
          </View>
        ))}
      </View>
    </CardWrapper>
  );
}

function Card6_Routine({ teaser, index, total }: { teaser: any; index: number; total: number }) {
  return (
    <CardWrapper index={index} total={total}>
      <View style={st.illust}>
        <StepRings />
      </View>
      <Text style={st.eyebrowGold}>YOUR ROUTINE</Text>
      <Text style={st.routineCount}>{teaser.count} steps</Text>
      <Text style={st.routineSub}>built around your hair, your time, your rhythm.</Text>
      <View style={st.divider} />
      <View style={{ gap: 10 }}>
        {teaser.preview.map((p: string, i: number) => (
          <Text key={i} style={st.routineStep}>· {p}</Text>
        ))}
        <Text style={st.routineMore}>+ the rest, waiting in your dashboard.</Text>
      </View>
    </CardWrapper>
  );
}

function Card7_Closer({ name, index, total }: { name: string; index: number; total: number }) {
  return (
    <CardWrapper index={index} total={total}>
      <View style={st.illust}>
        <ClosingBloom />
      </View>
      <Text style={st.closerTitle}>Your hair is complex.</Text>
      <Text style={st.closerTitleAccent}>That's the point.</Text>
      <Text style={st.closerBody}>
        Beautiful hair has never been simple. Yours has a structure, a history,
        a rhythm — and now, a routine that respects all of it.{'\n\n'}
        Welcome in, {name}.
      </Text>
    </CardWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════
// The reveal screen — card pager
// ═══════════════════════════════════════════════════════════════

export default function RevealScreen() {
  const router = useRouter();
  const [results, setResults] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const [userRaw, quizRaw] = await Promise.all([
        AsyncStorage.getItem('tressie_user'),
        AsyncStorage.getItem('tressie_quiz'),
      ]);
      const userObj = userRaw ? JSON.parse(userRaw) : null;
      const quizObj = quizRaw ? JSON.parse(quizRaw) : null;
      const name = userObj?.firstName?.trim() || 'You';
      if (quizObj) setResults(generateResults(name, quizObj));
    })();
  }, []);

  if (!results) {
    return (
      <View style={st.loading}>
        <LinearGradient
          colors={['#120B2E', '#2d1854', '#4a2070']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={st.loadingText}>Building your routine…</Text>
      </View>
    );
  }

  const TOTAL = 7;
  const isLast = step === TOTAL - 1;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isLast) {
      // Stronger haptic for the final transition to dashboard
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(tabs)/home');
      return;
    }
    if (!hasInteracted) setHasInteracted(true);
    const next = step + 1;
    setStep(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  };

  const onScrollEnd = (e: any) => {
    const newIdx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newIdx !== step) {
      Haptics.selectionAsync().catch(() => {});
      if (!hasInteracted) setHasInteracted(true);
      setStep(newIdx);
    }
  };

  return (
    <View style={st.container}>
      {/* Full-screen gradient background */}
      <LinearGradient
        colors={['#0c0a15', '#120B2E', '#1a1040', '#2d1854']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative glow orbs */}
      <View style={st.glow1} />
      <View style={st.glow2} />

      {/* Progress dots at top */}
      <View style={st.progressBar}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <View
            key={i}
            style={[
              st.dot,
              i === step && st.dotActive,
              i < step && st.dotPast,
            ]}
          />
        ))}
      </View>

      {/* Horizontal card pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        bounces={false}
        style={st.scrollView}
      >
        <View style={st.cardSlot} key="c1">
          <Card1_Opening name={results.name} index={1} total={TOTAL} />
        </View>
        <View style={st.cardSlot} key="c2">
          <Card2_Cover results={results} index={2} total={TOTAL} />
        </View>
        <View style={st.cardSlot} key="c3">
          <Card3_Readback results={results} index={3} total={TOTAL} />
        </View>
        <View style={st.cardSlot} key="c4">
          <Card4_Insight insight={results.insight} index={4} total={TOTAL} />
        </View>
        <View style={st.cardSlot} key="c5">
          <Card5_Strengths strengths={results.strengths} index={5} total={TOTAL} />
        </View>
        <View style={st.cardSlot} key="c6">
          <Card6_Routine teaser={results.routineTeaser} index={6} total={TOTAL} />
        </View>
        <View style={st.cardSlot} key="c7">
          <Card7_Closer name={results.name} index={7} total={TOTAL} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={st.footer}>
        <Pressable
          onPress={goNext}
          accessibilityLabel={isLast ? 'Open my dashboard' : 'Next'}
          accessibilityRole="button"
          style={({ pressed }) => [
            st.cta,
            pressed && { transform: [{ scale: 0.985 }] },
          ]}
        >
          <LinearGradient
            colors={['#F484B9', '#D9FF00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={st.ctaInner}
          >
            <Text style={st.ctaText}>
              {isLast ? 'Open my dashboard' : 'Next'}
            </Text>
          </LinearGradient>
        </Pressable>
        {!isLast && !hasInteracted && step === 0 && (
          <Text style={st.swipeHint}>Or swipe →</Text>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0a15' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  glow1: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#7643AC',
    opacity: 0.25,
  },
  glow2: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.18,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F484B9',
    opacity: 0.2,
  },

  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 12,
  },
  dot: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotPast: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: '#D9FF00',
    width: 32,
  },

  scrollView: { flex: 1 },

  cardSlot: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  cardInner: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },

  illust: {
    alignItems: 'center',
    marginBottom: 32,
  },

  // Magazine-style page indicator (top of each card)
  pageNum: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  pageNumText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: '#D9FF00',
  },
  pageNumSep: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,254,247,0.4)',
  },
  pageNumTextDim: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,254,247,0.4)',
  },

  eyebrowGold: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 3,
    color: '#D9FF00',
    marginBottom: 18,
    textAlign: 'center',
  },

  // Card 1: opening
  heroName: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 56,
    color: '#FFFEF7',
    letterSpacing: -2,
    textAlign: 'center',
    marginBottom: 24,
  },
  openingBody: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(255,254,247,0.75)',
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },

  // Card 2: cover
  coverIssue: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 4,
    color: '#D9FF00',
    textAlign: 'center',
    marginBottom: 20,
  },
  coverHeadline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 44,
    color: '#FFFEF7',
    letterSpacing: -1.5,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  coverTagline: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 17,
    color: '#F484B9',
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,254,247,0.18)',
    marginVertical: 18,
    alignSelf: 'center',
    width: 60,
  },
  coverFacts: {
    fontFamily: Fonts.body,
    fontSize: 13,
    letterSpacing: 0.5,
    color: 'rgba(255,254,247,0.7)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Card 3: readback
  readbackLine: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 22,
    lineHeight: 32,
    color: '#FFFEF7',
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  // Card 4: insight
  insightTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: '#FFFEF7',
    letterSpacing: -1,
    textAlign: 'center',
    marginVertical: 8,
  },
  insightBody: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 25,
    color: 'rgba(255,254,247,0.78)',
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },

  // Card 5: strengths
  strengthRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  strengthNum: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: '#D9FF00',
    letterSpacing: -0.5,
    minWidth: 36,
  },
  strengthText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: '#FFFEF7',
    flex: 1,
    paddingTop: 4,
  },

  // Card 6: routine teaser
  routineCount: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 64,
    color: '#FFFEF7',
    letterSpacing: -2,
    textAlign: 'center',
    marginVertical: 4,
  },
  routineSub: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: 14,
    color: 'rgba(255,254,247,0.7)',
    textAlign: 'center',
  },
  routineStep: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: '#FFFEF7',
    textAlign: 'center',
  },
  routineMore: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: 13,
    color: 'rgba(217,255,0,0.85)',
    textAlign: 'center',
    marginTop: 8,
  },

  // Card 7: closer
  closerTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 38,
    color: '#FFFEF7',
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  closerTitleAccent: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 38,
    color: '#D9FF00',
    letterSpacing: -1.2,
    textAlign: 'center',
    marginBottom: 24,
  },
  closerBody: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 26,
    color: 'rgba(255,254,247,0.8)',
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    backgroundColor: 'transparent',
  },
  cta: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaInner: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  ctaText: {
    fontFamily: Fonts.headingSemi,
    fontSize: 15,
    color: '#0c0a15',
    letterSpacing: 0.3,
  },
  swipeHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: 'rgba(255,254,247,0.4)',
    textAlign: 'center',
    marginTop: 10,
  },
});