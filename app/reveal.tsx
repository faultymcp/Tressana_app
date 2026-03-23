import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// ─── Curl Pattern SVG ────────────────────────────────────────────
function CurlPattern({ type, size = 70, color }: { type: string; size?: number; color?: string }) {
  const cx = 25; let d = '', sw = 2.2; const stroke = color || Colors.white;
  if (type === '1' || type === '1A') { d = `M${cx} 2 L${cx} 68`; sw = 2; }
  else if (type === '1B') { d = `M${cx} 2 Q${cx+3} 20, ${cx} 35 Q${cx-3} 50, ${cx} 68`; }
  else if (type === '1C') { d = `M${cx} 2 L${cx} 68`; sw = 3.2; }
  else if (type === '2' || type === '2A') { d = `M${cx} 2 Q${cx+10} 14, ${cx} 24 Q${cx-10} 34, ${cx} 44 Q${cx+8} 54, ${cx} 68`; sw = 2; }
  else if (type === '2B') { d = `M${cx} 2 Q${cx+12} 10, ${cx} 18 Q${cx-12} 26, ${cx} 34 Q${cx+12} 42, ${cx} 50 Q${cx-12} 58, ${cx} 68`; }
  else if (type === '2C') { d = `M${cx} 2 Q${cx+14} 7, ${cx} 13 Q${cx-14} 19, ${cx} 24 Q${cx+14} 29, ${cx} 35 Q${cx-14} 41, ${cx} 46 Q${cx+14} 51, ${cx} 57 Q${cx-14} 63, ${cx} 68`; }
  else if (type === '3' || type === '3A') { d = `M${cx} 2 C${cx+18} 5, ${cx+18} 16, ${cx} 18 C${cx-18} 20, ${cx-18} 31, ${cx} 33 C${cx+18} 35, ${cx+18} 46, ${cx} 48 C${cx-18} 50, ${cx-18} 61, ${cx} 63 L${cx} 68`; sw = 1.8; }
  else if (type === '3B') { d = `M${cx} 2 C${cx+16} 4, ${cx+16} 12, ${cx} 14 C${cx-16} 16, ${cx-16} 24, ${cx} 26 C${cx+16} 28, ${cx+16} 36, ${cx} 38 C${cx-16} 40, ${cx-16} 48, ${cx} 50 C${cx+16} 52, ${cx+16} 60, ${cx} 62 L${cx} 68`; sw = 1.8; }
  else if (type === '3C') { d = `M${cx} 2 C${cx+14} 3, ${cx+14} 9, ${cx} 10 C${cx-14} 11, ${cx-14} 17, ${cx} 18 C${cx+14} 19, ${cx+14} 25, ${cx} 26 C${cx-14} 27, ${cx-14} 33, ${cx} 34 C${cx+14} 35, ${cx+14} 41, ${cx} 42 C${cx-14} 43, ${cx-14} 49, ${cx} 50 C${cx+14} 51, ${cx+14} 57, ${cx} 58 C${cx-14} 59, ${cx-14} 65, ${cx} 66`; sw = 1.7; }
  else if (type === '4' || type === '4A') { d = `M${cx} 2 C${cx+11} 3, ${cx+11} 7, ${cx} 8 C${cx-11} 9, ${cx-11} 13, ${cx} 14 C${cx+11} 15, ${cx+11} 19, ${cx} 20 C${cx-11} 21, ${cx-11} 25, ${cx} 26 C${cx+11} 27, ${cx+11} 31, ${cx} 32 C${cx-11} 33, ${cx-11} 37, ${cx} 38 C${cx+11} 39, ${cx+11} 43, ${cx} 44 C${cx-11} 45, ${cx-11} 49, ${cx} 50 C${cx+11} 51, ${cx+11} 55, ${cx} 56 C${cx-11} 57, ${cx-11} 61, ${cx} 62 C${cx+11} 63, ${cx+11} 67, ${cx} 68`; sw = 1.5; }
  else if (type === '4B') { let y = 2; d = `M${cx} ${y}`; let left = true; while (y + 6 <= 68) { y += 6; d += ` L${left ? cx-10 : cx+10} ${y}`; left = !left; } sw = 1.5; }
  else if (type === '4C') { d = `M${cx} 2`; for (let y = 2; y + 5 <= 68; y += 5) { d += ` C${cx+9} ${y+1}, ${cx+9} ${y+4}, ${cx} ${y+5} C${cx-9} ${y+6}, ${cx-9} ${y+9}, ${cx} ${y+10}`; y += 5; } sw = 1.4; }
  if (!d) return null;
  return <Svg width={size * 0.7} height={size} viewBox="0 0 50 70"><Path d={d} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

// ─── Result Generation ───────────────────────────────────────────
const TYPE_NAMES: Record<string, string> = {
  '1A': 'Pin Straight', '1B': 'Straight with Body', '1C': 'Straight & Thick',
  '2A': 'Loose Waves', '2B': 'Defined Waves', '2C': 'Deep Waves',
  '3A': 'Loose Curls', '3B': 'Springy Ringlets', '3C': 'Tight Corkscrews',
  '4A': 'Coil Springs', '4B': 'Z-Pattern Coils', '4C': 'Ultra-Tight Coils',
};

const TYPE_DESC: Record<string, string> = {
  '1A': 'Your hair is naturally sleek and smooth. It resists curl but can lack volume. Focus on lightweight volumisers and avoid heavy products.',
  '1B': 'You have straight hair with a slight natural bend. It holds styles well and has natural body. A great canvas for versatile looks.',
  '1C': 'Your strands are thick and strong but straight. You may deal with frizz in humidity. Use smoothing serums and anti-frizz products.',
  '2A': 'Your waves are gentle and barely there — almost straight with a soft S-shape. Light curl enhancers will bring out your natural texture.',
  '2B': 'You have defined S-waves that start from mid-length. Your hair loves mousse and diffusing. Avoid brushing when dry.',
  '2C': 'Your deep waves border on curly — thick, defined, and full of volume. Embrace curl creams and the scrunch method.',
  '3A': 'Your curls are loose, shiny spirals about the width of a candle. They need moisture but can get weighed down — go lightweight.',
  '3B': 'Springy ringlets with tons of volume. Your curls bounce back when stretched. Deep conditioning weekly is essential.',
  '3C': 'Tight, pencil-sized corkscrews packed close together. Maximum definition but needs consistent moisture and gentle handling.',
  '4A': 'Visible coil springs with a clear S-pattern. Your curls have lots of personality. The LOC method is your best friend.',
  '4B': 'Sharp Z-bends instead of round curls. Your hair is strong but fragile at the bends. Moisture and protective styles are key.',
  '4C': 'Ultra-tight coils with maximum shrinkage. Your hair may look patternless but has incredible density. Deep moisture + patience = magic.',
};

const POROSITY_INFO: Record<string, { title: string; desc: string; tips: string[] }> = {
  low: {
    title: 'Low Porosity',
    desc: 'Your cuticles are tightly sealed. Products tend to sit on top rather than absorb.',
    tips: ['Use lightweight, water-based products', 'Apply to damp hair for better absorption', 'Use gentle heat (warm towel wrap) to open cuticles', 'Avoid heavy butters and thick oils'],
  },
  medium: {
    title: 'Medium Porosity',
    desc: 'Your hair absorbs and retains moisture well. You have the most flexible hair type for products.',
    tips: ['Most products work well for you', 'Deep condition regularly to maintain balance', 'Protein and moisture treatments in equal measure', 'Your hair holds styles well'],
  },
  high: {
    title: 'High Porosity',
    desc: 'Your cuticles are raised — moisture enters fast but escapes fast too.',
    tips: ['Layer products: LOC or LCO method', 'Use protein treatments to strengthen', 'Seal with heavier oils (castor, olive)', 'Avoid excessive heat — your hair is already porous'],
  },
  unsure: {
    title: 'Porosity Unknown',
    desc: 'No worries — try the water test. Drop a clean strand in water for 3 minutes. Where it sits tells you everything.',
    tips: ['Floats = Low porosity', 'Middle = Medium porosity', 'Sinks = High porosity', 'Test with clean, product-free hair'],
  },
};

const GOAL_TIPS: Record<string, { label: string; tip: string }> = {
  moisture: { label: 'More Moisture', tip: 'Deep condition weekly. Use the LOC method (Liquid, Oil, Cream) after wash day. Sleep on satin to prevent overnight moisture loss.' },
  growth: { label: 'Length Retention', tip: 'Handle gently. Massage scalp 3x/week for blood flow. Trim split ends every 8-10 weeks. Protective styles reduce breakage.' },
  definition: { label: 'Curl Definition', tip: 'Apply styling products to soaking wet hair. Use a Denman brush or finger coils. Diffuse on low heat or air dry completely.' },
  frizz: { label: 'Frizz Control', tip: "Don't touch hair while drying. Use microfibre towel only. Apply anti-humectant sealer in humid weather. Pineapple at night." },
  scalp_goal: { label: 'Healthier Scalp', tip: 'Clarify monthly. Use a scalp massager when shampooing. Look for tea tree, salicylic acid, or zinc pyrithione ingredients.' },
  damage: { label: 'Repair Damage', tip: 'Protein treatments every 2 weeks. No heat for at least a month. Bond-repair products (like Olaplex) rebuild internal structure.' },
};

function buildRoutine(typeGroup: string) {
  const steps: { name: string; desc: string; freq: string }[] = [];
  if (['3', '4'].includes(typeGroup)) {
    steps.push({ name: 'Pre-poo', desc: 'Apply oil or conditioner to dry hair 30 min before washing to protect strands from stripping.', freq: 'Wash day' });
  }
  steps.push({
    name: 'Cleanse',
    desc: typeGroup === '4' ? 'Sulfate-free co-wash or gentle cleanser. Focus on scalp, not lengths.' : typeGroup === '3' ? 'Sulfate-free shampoo on scalp only. Let suds run down lengths.' : 'Gentle shampoo, focus on roots. Rinse thoroughly.',
    freq: typeGroup === '4' ? 'Every 7-10 days' : typeGroup === '3' ? 'Every 5-7 days' : 'Every 2-3 days',
  });
  steps.push({ name: 'Condition', desc: 'Apply generously mid-length to ends. Detangle with fingers or wide-tooth comb while in.', freq: 'Every wash' });
  if (['2', '3', '4'].includes(typeGroup)) {
    steps.push({ name: 'Deep Condition', desc: 'Leave a moisture or protein mask on for 15-30 min under a shower cap. Alternate between moisture and protein.', freq: 'Weekly' });
  }
  steps.push({
    name: 'Style',
    desc: typeGroup === '1' ? 'Apply volumising mousse or lightweight serum to towel-dried hair.' : typeGroup === '2' ? 'Scrunch in curl cream on damp hair. Diffuse or air dry — don\'t touch.' : 'Apply leave-in, then oil, then cream (LOC). Define with gel or custard on soaking wet hair.',
    freq: 'Every wash',
  });
  if (['3', '4'].includes(typeGroup)) {
    steps.push({ name: 'Seal', desc: 'Lock everything in with a light oil (jojoba, grapeseed) or heavier butter for type 4.', freq: 'Every wash' });
  }
  steps.push({ name: 'Night Protect', desc: 'Pineapple or loose braid. Satin pillowcase or bonnet. Never sleep with hair loose on cotton.', freq: 'Every night' });
  return steps;
}

function generateResults(data: any) {
  const ht = data.hairType || '3A';
  const porosity = data.porosity || 'unsure';
  const goals = (data.goals as string[]) || [];
  const typeGroup = ht.charAt(0);

  return {
    hairType: ht,
    typeName: TYPE_NAMES[ht] || `Type ${ht}`,
    typeDesc: TYPE_DESC[ht] || '',
    porosity,
    porosityInfo: POROSITY_INFO[porosity] || POROSITY_INFO.unsure,
    goals,
    goalTips: goals.map(g => GOAL_TIPS[g]).filter(Boolean),
    routine: buildRoutine(typeGroup),
  };
}

// ─── Screen ──────────────────────────────────────────────────────
export default function RevealScreen() {
  const router = useRouter();
  const [results, setResults] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ routine: true, porosity: true });

  useEffect(() => {
    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) setResults(generateResults(JSON.parse(raw)));
    });
  }, []);

  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  if (!results) {
    return (
      <View style={[st.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.muted }}>Loading your results...</Text>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.duration(600)}>
          <LinearGradient
            colors={['#120B2E', '#332463', '#7643AC', '#F484B9']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={st.hero}
          >
            <View style={st.badgeArea}>
              <View style={st.patternGhost}>
                <CurlPattern type={results.hairType} size={90} color="rgba(255,255,255,0.12)" />
              </View>
              <View style={st.badge}>
                <Text style={st.badgeText}>{results.hairType}</Text>
              </View>
            </View>
            <Text style={st.heroTitle}>Your hair, understood.</Text>
            <Text style={st.heroTypeName}>{results.typeName}</Text>
            <Text style={st.heroDesc}>{results.typeDesc}</Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Stats bar ── */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={st.statsCard}>
          <View style={st.stat}>
            <Text style={st.statValue}>{results.hairType}</Text>
            <Text style={st.statLabel}>Type</Text>
          </View>
          <View style={st.statLine} />
          <View style={st.stat}>
            <Text style={[st.statValue, { textTransform: 'capitalize' }]}>{results.porosity}</Text>
            <Text style={st.statLabel}>Porosity</Text>
          </View>
          <View style={st.statLine} />
          <View style={st.stat}>
            <Text style={st.statValue}>{results.routine.length}</Text>
            <Text style={st.statLabel}>Steps</Text>
          </View>
        </Animated.View>

        {/* ── Porosity card ── */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)}>
          <Pressable onPress={() => toggle('porosity')} style={st.card}>
            <View style={st.cardHead}>
              <View style={[st.cardDot, { backgroundColor: Colors.violet }]} />
              <Text style={st.cardTitle}>{results.porosityInfo.title}</Text>
              <Text style={st.chevron}>{expanded.porosity ? '▲' : '▼'}</Text>
            </View>
            {expanded.porosity && (
              <View style={st.cardContent}>
                <Text style={st.cardDesc}>{results.porosityInfo.desc}</Text>
                {results.porosityInfo.tips.map((tip: string, i: number) => (
                  <View key={i} style={st.bulletRow}>
                    <View style={st.bullet} />
                    <Text style={st.bulletText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* ── Goal tips ── */}
        {results.goalTips.length > 0 && (
          <Animated.View entering={FadeInUp.delay(400).duration(500)} style={st.card}>
            <Text style={st.sectionTitle}>Your personalised tips</Text>
            {results.goalTips.map((g: any, i: number) => (
              <View key={i} style={st.goalCard}>
                <View style={st.goalHeader}>
                  <View style={[st.cardDot, { backgroundColor: i % 2 === 0 ? Colors.lime : Colors.pink }]} />
                  <Text style={st.goalLabel}>{g.label}</Text>
                </View>
                <Text style={st.goalTip}>{g.tip}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── Routine ── */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)}>
          <Pressable onPress={() => toggle('routine')} style={st.card}>
            <View style={st.cardHead}>
              <View style={[st.cardDot, { backgroundColor: Colors.lavender }]} />
              <Text style={st.cardTitle}>Your routine</Text>
              <Text style={st.chevron}>{expanded.routine ? '▲' : '▼'}</Text>
            </View>
            {expanded.routine && results.routine.map((step: any, i: number) => (
              <View key={i} style={st.routineRow}>
                <LinearGradient colors={Colors.gradientPrimary as any} style={st.routineNum}>
                  <Text style={st.routineNumText}>{i + 1}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <View style={st.routineNameRow}>
                    <Text style={st.routineName}>{step.name}</Text>
                    <View style={st.freqBadge}><Text style={st.freqText}>{step.freq}</Text></View>
                  </View>
                  <Text style={st.routineDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </Pressable>
        </Animated.View>

      </ScrollView>

      {/* CTA */}
      <View style={st.footer}>
        <Pressable
          onPress={() => router.replace('/(tabs)/home')}
          style={({ pressed }) => [st.cta, pressed && { transform: [{ scale: 0.985 }] }]}
        >
          <LinearGradient colors={Colors.gradientPrimary as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.ctaInner}>
            <Text style={st.ctaText}>Go to my dashboard</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  scroll: { paddingBottom: 110 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 54,
    paddingBottom: 36,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  badgeArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 18, height: 90 },
  patternGhost: { position: 'absolute' },
  badge: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.white },
  heroTitle: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.white, letterSpacing: -0.5, marginBottom: 6, textAlign: 'center' },
  heroTypeName: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.lime, marginBottom: 10 },
  heroDesc: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20, textAlign: 'center', maxWidth: 310 },

  // Stats
  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: -22,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingVertical: 18, paddingHorizontal: 20,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.ink },
  statLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, marginTop: 3 },
  statLine: { width: 1, height: 30, backgroundColor: Colors.border },

  // Cards
  card: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: 20, borderWidth: 1.5, borderColor: Colors.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.ink, flex: 1 },
  chevron: { fontSize: 10, color: Colors.muted },
  cardContent: { marginTop: 14 },
  cardDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: 12 },

  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.lavender, marginTop: 7 },
  bulletText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink, lineHeight: 20, flex: 1 },

  sectionTitle: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.ink, marginBottom: 16 },

  // Goal cards
  goalCard: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  goalLabel: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.violet },
  goalTip: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20, paddingLeft: 16 },

  // Routine
  routineRow: { flexDirection: 'row', gap: 14, marginTop: 16 },
  routineNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  routineNumText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.white },
  routineNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  routineName: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink },
  freqBadge: { backgroundColor: Colors.violetBg2, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
  freqText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.violet },
  routineDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 18 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    backgroundColor: Colors.porcelain, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cta: {
    borderRadius: Radius.lg, overflow: 'hidden',
    shadowColor: Colors.violet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  ctaInner: { paddingVertical: 17, alignItems: 'center' },
  ctaText: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.white },
});