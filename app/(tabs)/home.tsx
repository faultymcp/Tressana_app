import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Dimensions, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };

// ─── Weekly Routines (realistic, varies by day + hair type) ──────
type Step = { id: string; name: string; desc: string };
type DayPlan = { label: string; steps: Step[] };

function buildWeek(typeGroup: string): Record<string, DayPlan> {
  const protect: Step = { id: 'protect', name: 'Night protection', desc: 'Satin bonnet or pillowcase, pineapple for curls' };
  const refresh: Step = { id: 'refresh', name: 'Refresh', desc: 'Spritz with water + leave-in mix, reshape any flat sections' };
  const moisturise: Step = { id: 'moisturise', name: 'Moisturise', desc: 'Apply a light leave-in or water-based spray to dry ends' };
  const scalpMassage: Step = { id: 'scalp', name: 'Scalp massage', desc: '3-5 min with fingertips to stimulate blood flow' };
  const detangle: Step = { id: 'detangle', name: 'Detangle', desc: 'Section hair, use wide-tooth comb with conditioner' };

  if (typeGroup === '1') {
    return {
      Mon: { label: 'Wash day', steps: [
        { id: 'cleanse', name: 'Cleanse', desc: 'Gentle shampoo, focus on roots and scalp' },
        { id: 'condition', name: 'Condition', desc: 'Lightweight conditioner on mid-lengths and ends' },
        { id: 'style', name: 'Style', desc: 'Volumising mousse or serum on towel-dried hair' },
        protect,
      ]},
      Tue: { label: 'Maintain', steps: [protect] },
      Wed: { label: 'Rest day', steps: [
        { id: 'drysham', name: 'Dry shampoo', desc: 'Apply at roots to absorb oil and add volume' },
        protect,
      ]},
      Thu: { label: 'Wash day', steps: [
        { id: 'cleanse', name: 'Cleanse', desc: 'Gentle shampoo, focus on roots and scalp' },
        { id: 'condition', name: 'Condition', desc: 'Lightweight conditioner, rinse fully' },
        { id: 'style', name: 'Style', desc: 'Blow-dry for volume or air-dry with serum' },
        protect,
      ]},
      Fri: { label: 'Maintain', steps: [protect] },
      Sat: { label: 'Treatment day', steps: [
        scalpMassage,
        { id: 'mask', name: 'Hair mask', desc: 'Lightweight protein or moisture mask, 10 min' },
        protect,
      ]},
      Sun: { label: 'Rest day', steps: [protect] },
    };
  }

  if (typeGroup === '2') {
    return {
      Mon: { label: 'Wash day', steps: [
        { id: 'cleanse', name: 'Cleanse', desc: 'Sulfate-free shampoo on scalp, let suds run down' },
        { id: 'condition', name: 'Condition', desc: 'Detangling conditioner, wide-tooth comb through' },
        { id: 'style', name: 'Style', desc: 'Scrunch in curl cream on damp hair, diffuse or air-dry' },
        protect,
      ]},
      Tue: { label: 'Day 2 refresh', steps: [refresh, protect] },
      Wed: { label: 'Day 3 refresh', steps: [refresh, moisturise, protect] },
      Thu: { label: 'Wash day', steps: [
        { id: 'cleanse', name: 'Cleanse', desc: 'Co-wash or gentle shampoo' },
        { id: 'condition', name: 'Condition', desc: 'Hydrating conditioner, focus on ends' },
        { id: 'style', name: 'Style', desc: 'Mousse + diffuse for defined waves' },
        protect,
      ]},
      Fri: { label: 'Day 2 refresh', steps: [refresh, protect] },
      Sat: { label: 'Treatment day', steps: [
        scalpMassage,
        { id: 'deep', name: 'Deep condition', desc: 'Moisture mask under cap for 20 min' },
        protect,
      ]},
      Sun: { label: 'Rest day', steps: [moisturise, protect] },
    };
  }

  if (typeGroup === '3') {
    return {
      Mon: { label: 'Day 2 refresh', steps: [refresh, protect] },
      Tue: { label: 'Day 3 maintain', steps: [moisturise, protect] },
      Wed: { label: 'Mid-week refresh', steps: [
        refresh,
        { id: 'restyle', name: 'Restyle sections', desc: 'Re-twist or re-coil any flat or frizzy areas' },
        protect,
      ]},
      Thu: { label: 'Day 5 maintain', steps: [moisturise, protect] },
      Fri: { label: 'Pre-wash prep', steps: [
        { id: 'prepoo', name: 'Pre-poo treatment', desc: 'Apply oil to dry hair, focus on ends. Leave 30+ min.' },
        protect,
      ]},
      Sat: { label: 'Wash day', steps: [
        { id: 'cleanse', name: 'Cleanse', desc: 'Sulfate-free shampoo on scalp only' },
        detangle,
        { id: 'deep', name: 'Deep condition', desc: '20-30 min under cap with heat if possible' },
        { id: 'leavein', name: 'Leave-in + oil', desc: 'Apply leave-in to soaking wet hair, seal with oil' },
        { id: 'style', name: 'Style', desc: 'Gel or custard for definition. Diffuse or air-dry fully.' },
        protect,
      ]},
      Sun: { label: 'Day 1 — hands off', steps: [protect] },
    };
  }

  // Type 4
  return {
    Mon: { label: 'Day 2 maintain', steps: [moisturise, protect] },
    Tue: { label: 'Day 3 maintain', steps: [moisturise, protect] },
    Wed: { label: 'Mid-week moisture', steps: [
      { id: 'spritz', name: 'Spritz + seal', desc: 'Water-based spray then oil to re-moisturise' },
      scalpMassage,
      protect,
    ]},
    Thu: { label: 'Day 5 maintain', steps: [moisturise, protect] },
    Fri: { label: 'Day 6 maintain', steps: [moisturise, protect] },
    Sat: { label: 'Pre-wash + wash day', steps: [
      { id: 'prepoo', name: 'Pre-poo treatment', desc: 'Coconut or olive oil on dry hair, 1 hour minimum' },
      { id: 'cleanse', name: 'Cleanse', desc: 'Co-wash or sulfate-free shampoo. Scalp only.' },
      detangle,
      { id: 'deep', name: 'Deep condition', desc: '30 min under plastic cap. Alternate protein and moisture.' },
      { id: 'loc', name: 'LOC method', desc: 'Leave-in, then oil, then cream. Apply to soaking wet hair.' },
      { id: 'style', name: 'Style + set', desc: 'Twists, braids, or coils. Let dry completely.' },
      protect,
    ]},
    Sun: { label: 'Takedown + set', steps: [
      { id: 'takedown', name: 'Take down style', desc: 'Unravel twists/braids gently, fluff with pick' },
      { id: 'shape', name: 'Shape + seal', desc: 'Light oil on hands, shape and separate curls' },
      protect,
    ]},
  };
}

// ─── Progress Ring ───────────────────────────────────────────────
function ProgressRing({ progress, size = 80, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={Colors.border} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={progress === 100 ? '#8AB800' : Colors.violet} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${c}`} strokeDashoffset={offset} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontFamily: Fonts.heading, fontSize: 20, color: Colors.ink }}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [selectedDay, setSelectedDay] = useState(todayIdx());
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [weekPlan, setWeekPlan] = useState<Record<string, DayPlan>>({});
  const [hairType, setHairType] = useState('');
  const [streak, setStreak] = useState(0);
  const [products, setProducts] = useState<any[]>([]);

  const typeGroup = hairType.charAt(0) || '3';
  const dayKey = DAYS[selectedDay];
  const dayPlan = weekPlan[dayKey] || { label: '', steps: [] };
  const dayChecks = checks[dayKey] || {};
  const checkedCount = dayPlan.steps.filter(s => dayChecks[s.id]).length;
  const totalSteps = dayPlan.steps.length;
  const pct = totalSteps > 0 ? Math.round((checkedCount / totalSteps) * 100) : 0;

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) {
        const data = JSON.parse(raw);
        const ht = data.hairType || '3A';
        setHairType(ht);
        setWeekPlan(buildWeek(ht.charAt(0)));
        supabase.from('products').select('*').contains('hair_types', [ht.charAt(0)]).then(({ data: prods }) => {
          if (prods) setProducts(prods);
        });
      } else {
        setWeekPlan(buildWeek('3'));
        supabase.from('products').select('*').contains('hair_types', ['3']).then(({ data: prods }) => {
          if (prods) setProducts(prods);
        });
      }
    });
    AsyncStorage.getItem('tressana_checks').then(raw => {
      if (raw) setChecks(JSON.parse(raw));
    });
  }, []);

  useEffect(() => {
    let s = 0;
    for (let i = todayIdx(); i >= 0; i--) {
      const dp = weekPlan[DAYS[i]];
      if (!dp) break;
      const dc = checks[DAYS[i]] || {};
      const done = dp.steps.filter(r => dc[r.id]).length;
      if (done === dp.steps.length && dp.steps.length > 0) s++;
      else break;
    }
    setStreak(s);
  }, [checks, weekPlan]);

  const toggleCheck = useCallback((stepId: string) => {
    setChecks(prev => {
      const updated = { ...prev, [dayKey]: { ...prev[dayKey], [stepId]: !prev[dayKey]?.[stepId] } };
      AsyncStorage.setItem('tressana_checks', JSON.stringify(updated));
      return updated;
    });
  }, [dayKey]);

  return (
    <ScrollView style={st.container} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={st.greeting}>{greeting}</Text>
          <Text style={st.title}>Your hair dashboard</Text>
        </View>
        {streak > 0 && (
          <View style={st.streakBadge}>
            <Text style={st.streakLabel}>streak</Text>
            <Text style={st.streakNum}>{streak}</Text>
          </View>
        )}
      </View>

      {/* ── Try a Hairstyle Card ── */}
      <Animated.View entering={FadeInUp.duration(400)}>
        <Pressable onPress={() => router.push('/hairtransfer')} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
          <LinearGradient colors={['#7643AC', '#9B59D0', '#F484B9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.tryCard}>
            <View style={st.tryContent}>
              <Text style={st.tryTitle}>Try a new hairstyle</Text>
              <Text style={st.tryDesc}>Upload your selfie and a reference photo to see yourself with a new look.</Text>
              <View style={st.tryBtn}>
                <Text style={st.tryBtnText}>Try now</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#7643AC" strokeWidth={2.5} strokeLinecap="round"><Path d="M5 12h14M12 5l7 7-7 7" /></Svg>
              </View>
            </View>
            {/* Decorative curl SVG */}
            <View style={st.tryDecor}>
              <Svg width={60} height={80} viewBox="0 0 50 70" opacity={0.2}>
                <Path d="M25 2 C36 5, 36 16, 25 18 C14 20, 14 31, 25 33 C36 35, 36 46, 25 48 C14 50, 14 61, 25 63 L25 68" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
              </Svg>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Tracker */}
      <Animated.View entering={FadeInUp.delay(50).duration(400)} style={st.tracker}>
        <LinearGradient colors={['#FDFCFF', '#F9F7FE']} style={st.trackerInner}>
          <View style={st.trackerTop}>
            <ProgressRing progress={pct} size={86} strokeWidth={7} />
            <View style={st.trackerInfo}>
              <Text style={st.trackerDay}>{DAYS[selectedDay]}</Text>
              <Text style={st.trackerLabel}>{dayPlan.label}</Text>
              <Text style={st.trackerSub}>{checkedCount}/{totalSteps} steps</Text>
              {pct === 100 && <View style={st.doneBadge}><Text style={st.doneText}>Complete</Text></View>}
            </View>
          </View>

          <View style={st.weekRow}>
            {DAYS.map((d, i) => {
              const active = i === selectedDay;
              const dp = weekPlan[d];
              const dc = checks[d] || {};
              const done = dp ? dp.steps.filter(s => dc[s.id]).length : 0;
              const total = dp ? dp.steps.length : 0;
              const allDone = done === total && total > 0;
              const partial = done > 0 && !allDone;
              const isToday = i === todayIdx();
              return (
                <Pressable key={d} onPress={() => setSelectedDay(i)} style={[st.dayCol, active && st.dayColActive]}>
                  <Text style={[st.dayText, active && st.dayTextActive]}>{d}</Text>
                  <View style={[st.dayDot, allDone && st.dayDotDone, partial && st.dayDotPartial, isToday && !active && st.dayDotToday]} />
                </Pressable>
              );
            })}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Steps */}
      <Animated.View entering={FadeInUp.delay(100).duration(400)}>
        <Text style={st.section}>{dayPlan.label || "Today's steps"}</Text>
        <View style={st.steps}>
          {dayPlan.steps.map((step, i) => {
            const done = dayChecks[step.id];
            return (
              <Pressable key={`${dayKey}-${step.id}`} onPress={() => toggleCheck(step.id)} style={[st.step, done && st.stepDone]}>
                <View style={[st.stepNum, done && st.stepNumDone]}>
                  {done
                    ? <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round"><Path d="M20 6L9 17l-5-5" /></Svg>
                    : <Text style={st.stepNumText}>{i + 1}</Text>
                  }
                </View>
                <View style={st.stepBody}>
                  <Text style={[st.stepName, done && st.stepNameDone]}>{step.name}</Text>
                  <Text style={st.stepDesc}>{step.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Products from Supabase */}
      {products.length > 0 && (
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Text style={st.section}>Recommended for you</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.prodRow}>
            {products.map((p) => (
              <Pressable key={p.id} onPress={() => Linking.openURL(p.url)} style={st.prodCard}>
                <View style={st.prodTop}>
                  <Text style={st.prodBrand}>{p.brand}</Text>
                  <Text style={st.prodPrice}>{p.price}</Text>
                </View>
                <Text style={st.prodName}>{p.name}</Text>
                <Text style={st.prodWhy}>{p.why_it_works}</Text>
                <View style={st.prodFooter}>
                  <Text style={st.prodRetailer}>{p.retailer}</Text>
                  <Text style={st.prodLink}>View product</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Tip */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)}>
        <LinearGradient colors={['#120B2E', '#332463']} style={st.tip}>
          <View style={st.tipBadge}><Text style={st.tipBadgeText}>TIP</Text></View>
          <Text style={st.tipTitle}>
            {typeGroup === '4' ? 'Moisture is everything' : typeGroup === '3' ? 'Deep condition weekly' : typeGroup === '2' ? "Scrunch, don't rub" : 'Skip heavy oils'}
          </Text>
          <Text style={st.tipBody}>
            {typeGroup === '4' ? 'The LOC method seals in hydration for coily hair. Apply to soaking wet hair for best results.'
              : typeGroup === '3' ? 'Curls lose moisture fast. A weekly mask keeps them bouncy and defined.'
              : typeGroup === '2' ? 'Scrunching with a microfibre towel encourages wave pattern. Rubbing creates frizz.'
              : 'Straight hair gets weighed down fast. Use lightweight serums and spray-in conditioners.'}
          </Text>
        </LinearGradient>
      </Animated.View>

    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  scroll: { paddingTop: Platform.OS === 'ios' ? 62 : 48, paddingBottom: 110 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginBottom: 2 },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.ink, letterSpacing: -0.5 },
  streakBadge: { alignItems: 'center', backgroundColor: 'rgba(118,67,172,0.08)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
  streakLabel: { fontFamily: Fonts.body, fontSize: 9, color: Colors.violet, textTransform: 'uppercase', letterSpacing: 1 },
  streakNum: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.violet },

  // Try a hairstyle card
  tryCard: { marginHorizontal: 20, borderRadius: 20, padding: 22, marginBottom: 20, flexDirection: 'row', overflow: 'hidden' },
  tryContent: { flex: 1 },
  tryTitle: { fontFamily: Fonts.heading, fontSize: 18, color: '#fff', marginBottom: 6 },
  tryDesc: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18, marginBottom: 14, maxWidth: 220 },
  tryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, alignSelf: 'flex-start' },
  tryBtnText: { fontFamily: Fonts.bodySemi, fontSize: 13, color: '#7643AC' },
  tryDecor: { position: 'absolute', right: 16, top: 10, opacity: 0.4 },

  tracker: { marginHorizontal: 20, marginBottom: 24, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden' },
  trackerInner: { padding: 20 },
  trackerTop: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  trackerInfo: { flex: 1 },
  trackerDay: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.ink },
  trackerLabel: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.violet, marginTop: 2 },
  trackerSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 4 },
  doneBadge: { marginTop: 8, backgroundColor: 'rgba(138,184,0,0.12)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  doneText: { fontFamily: Fonts.bodySemi, fontSize: 11, color: '#5a6b00' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12 },
  dayColActive: { backgroundColor: 'rgba(118,67,172,0.08)' },
  dayText: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.muted },
  dayTextActive: { color: Colors.violet, fontFamily: Fonts.bodySemi },
  dayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dayDotDone: { backgroundColor: '#8AB800', width: 8, height: 8, borderRadius: 4 },
  dayDotPartial: { backgroundColor: Colors.lavender },
  dayDotToday: { borderWidth: 1.5, borderColor: Colors.violet, backgroundColor: 'transparent' },

  section: { fontFamily: Fonts.headingSemi, fontSize: 17, color: Colors.ink, paddingHorizontal: 20, marginBottom: 12 },

  steps: { paddingHorizontal: 20, gap: 8, marginBottom: 28 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border },
  stepDone: { borderColor: 'rgba(138,184,0,0.25)', backgroundColor: 'rgba(138,184,0,0.03)' },
  stepNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center' },
  stepNumDone: { backgroundColor: Colors.violet },
  stepNumText: { fontFamily: Fonts.headingSemi, fontSize: 14, color: Colors.violet },
  stepBody: { flex: 1 },
  stepName: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink, marginBottom: 2 },
  stepNameDone: { textDecorationLine: 'line-through', opacity: 0.4 },
  stepDesc: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, lineHeight: 16 },

  prodRow: { paddingHorizontal: 20, gap: 12, paddingBottom: 4, marginBottom: 24 },
  prodCard: { width: width * 0.62, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, borderWidth: 1.5, borderColor: Colors.border },
  prodTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prodBrand: { fontFamily: Fonts.body, fontSize: 10, color: Colors.violet, textTransform: 'uppercase', letterSpacing: 0.5 },
  prodPrice: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.ink },
  prodName: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.ink, marginBottom: 6, lineHeight: 20 },
  prodWhy: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, lineHeight: 16, marginBottom: 12 },
  prodFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prodRetailer: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  prodLink: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.violet },

  tip: { marginHorizontal: 20, borderRadius: 20, padding: 22, marginBottom: 20 },
  tipBadge: { backgroundColor: 'rgba(217,255,0,0.15)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  tipBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.lime, letterSpacing: 0.8, textTransform: 'uppercase' },
  tipTitle: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.porcelain, marginBottom: 6 },
  tipBody: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
});