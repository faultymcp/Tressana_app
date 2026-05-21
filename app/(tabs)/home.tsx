import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Dimensions, Linking, Animated as RNAnimated,
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

// ─── Types ───────────────────────────────────────────────────────
type Step = { id: string; name: string; desc: string; xp?: number };
type DayPlan = { label: string; steps: Step[] };

// ─── Icons ───────────────────────────────────────────────────────
function IconArrow() {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#7643AC" strokeWidth={2.5} strokeLinecap="round"><Path d="M5 12h14M12 5l7 7-7 7" /></Svg>;
}
function IconCheck() {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round"><Path d="M20 6L9 17l-5-5" /></Svg>;
}
function IconBookmark() {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.8}><Path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></Svg>;
}
function IconMapPin() {
  return <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={2} strokeLinecap="round"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><Circle cx="12" cy="10" r="3" /></Svg>;
}
function IconStar() {
  return <Svg width={12} height={12} viewBox="0 0 24 24" fill="#8AB800" stroke="none"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></Svg>;
}
function IconUsers() {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.8} strokeLinecap="round"><Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M23 21v-2a4 4 0 00-3-3.87" /><Path d="M16 3.13a4 4 0 010 7.75" /></Svg>;
}
function IconChevronRight() {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round"><Path d="M9 18l6-6-6-6" /></Svg>;
}
function IconZap() {
  return <Svg width={12} height={12} viewBox="0 0 24 24" fill={Colors.violet} stroke="none"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg>;
}

// ─── XP Toast ────────────────────────────────────────────────────
function XpToast({ amount, visible }: { amount: number; visible: boolean }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(10)).current;

  useEffect(() => {
    if (visible && amount > 0) {
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          RNAnimated.parallel([
            RNAnimated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            RNAnimated.timing(translateY, { toValue: -20, duration: 400, useNativeDriver: true }),
          ]).start();
        }, 1200);
      });
    }
  }, [visible, amount]);

  if (!visible) return null;

  return (
    <RNAnimated.View style={[st.xpToast, { opacity, transform: [{ translateY }] }]}>
      <IconZap />
      <Text style={st.xpToastText}>+{amount} XP</Text>
    </RNAnimated.View>
  );
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

// ─── Hardcoded fallback (only used if DB has no templates) ───────
function buildWeekFallback(typeGroup: string): Record<string, DayPlan> {
  const protect: Step = { id: 'protect', name: 'Night protection', desc: 'Satin bonnet or pillowcase' };
  const moisturise: Step = { id: 'moisturise', name: 'Moisturise', desc: 'Apply a light leave-in or water-based spray' };

  // Minimal fallback — just enough to not be empty
  return {
    Mon: { label: 'Maintain', steps: [moisturise, protect] },
    Tue: { label: 'Maintain', steps: [moisturise, protect] },
    Wed: { label: 'Mid-week care', steps: [moisturise, protect] },
    Thu: { label: 'Maintain', steps: [moisturise, protect] },
    Fri: { label: 'Pre-wash prep', steps: [protect] },
    Sat: { label: 'Wash day', steps: [
      { id: 'cleanse', name: 'Cleanse', desc: 'Gentle shampoo on scalp' },
      { id: 'condition', name: 'Condition', desc: 'Deep conditioner for 20 mins' },
      { id: 'style', name: 'Style', desc: 'Apply styling products to wet hair' },
      protect,
    ]},
    Sun: { label: 'Rest day', steps: [protect] },
  };
}

// ─── Build routine from DB templates ─────────────────────────────
async function buildWeekFromDB(goals: string[], segments: string[]): Promise<Record<string, DayPlan> | null> {
  try {
    // Map quiz goal keys to DB enum values
    const goalMap: Record<string, string> = {
      moisture: 'retain_moisture', growth: 'grow_hair', definition: 'define_curls',
      frizz: 'reduce_breakage', scalp_goal: 'scalp_health', damage: 'heat_damage_recovery',
      grow_hair: 'grow_hair', retain_moisture: 'retain_moisture', reduce_breakage: 'reduce_breakage',
      scalp_health: 'scalp_health', define_curls: 'define_curls', protective_styling: 'protective_styling',
      heat_damage_recovery: 'heat_damage_recovery', transplant_recovery: 'transplant_recovery',
      postpartum_recovery: 'postpartum_recovery', transition_natural: 'transition_natural',
      maintain_colour: 'maintain_colour', thicken_hair: 'thicken_hair',
    };

    const dbGoals = goals.map(g => goalMap[g] || g).filter(Boolean);
    if (dbGoals.length === 0) return null;

    const { data: templates, error } = await supabase
      .from('routine_templates')
      .select('*')
      .in('goal', dbGoals)
      .order('goal')
      .order('step_order');

    if (error || !templates || templates.length === 0) return null;

    // Filter: general (segment=null) + user's specific segments
    const relevant = templates.filter(t => !t.segment || segments.includes(t.segment));

    // Deduplicate: prefer segment-specific over general
    const deduped: typeof relevant = [];
    const seen = new Set<string>();
    for (const t of relevant) {
      if (t.segment) { seen.add(`${t.goal}-${t.step_order}`); deduped.push(t); }
    }
    for (const t of relevant) {
      if (!t.segment && !seen.has(`${t.goal}-${t.step_order}`)) { deduped.push(t); }
    }

    if (deduped.length === 0) return null;

    // Map frequency to days
    const freqDays: Record<string, string[]> = {
      daily: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      every_other_day: ['Mon', 'Wed', 'Fri', 'Sun'],
      twice_weekly: ['Tue', 'Fri'],
      weekly: ['Sat'],
      biweekly: ['Sat'],
      monthly: ['Sat'],
      as_needed: [],
    };

    const week: Record<string, DayPlan> = {};
    for (const day of DAYS) {
      const daySteps: Step[] = [];
      for (const t of deduped) {
        const scheduled = freqDays[t.frequency] || [];
        if (scheduled.includes(day)) {
          daySteps.push({
            id: t.id,
            name: t.step_name,
            desc: t.step_description || '',
            xp: 10,
          });
        }
      }
      // Always add night protection
      if (!daySteps.find(s => s.name.toLowerCase().includes('satin') || s.name.toLowerCase().includes('night'))) {
        daySteps.push({ id: `protect-${day}`, name: 'Night protection', desc: 'Satin bonnet or pillowcase to protect hair', xp: 10 });
      }

      const label = daySteps.length > 4 ? 'Wash day'
        : daySteps.length > 2 ? 'Active care'
        : daySteps.length > 1 ? 'Maintain'
        : 'Rest day';

      week[day] = { label, steps: daySteps };
    }
    return week;
  } catch (e) {
    console.log('DB routine fetch failed:', e);
    return null;
  }
}

// ─── Award XP helper ─────────────────────────────────────────────
async function doAwardXp(action: string, refId?: string, desc?: string): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: user.id, p_action: action,
      p_reference_id: refId || null, p_description: desc || null, p_override_amount: null,
    });
    if (error) { console.log('XP error:', error.message); return 0; }
    return data || 0;
  } catch (e) { return 0; }
}

// ─── Static data for social sections ─────────────────────────────
const TRENDING_CREATORS = [
  { id: '1', name: 'NaturallyTasha', handle: '@naturallytasha', followers: '142K', speciality: 'Protective styles & growth tips', hair_types: ['4A–4C'], initials: 'NT', color: '#E8DFF5' },
  { id: '2', name: 'CurlDocMia', handle: '@curldocmia', followers: '89K', speciality: 'Hair science & ingredient analysis', hair_types: ['3B–4B'], initials: 'CM', color: '#FCE4EC' },
  { id: '3', name: 'CoilQueen', handle: '@coilqueen', followers: '203K', speciality: 'LOC method & moisture routines', hair_types: ['4B–4C'], initials: 'CQ', color: '#E0F2F1' },
  { id: '4', name: 'TexturedTales', handle: '@texturedtales', followers: '67K', speciality: 'Wavy & curly transition journeys', hair_types: ['2C–3C'], initials: 'TT', color: '#FFF3E0' },
];

const TRENDING_STYLES = [
  { id: '1', name: 'Knotless Braids', saves: '12.4K', hair_types: ['4A', '4B', '4C'], time: '3–5 hrs', color: '#E8DFF5' },
  { id: '2', name: 'Twist Out on TWA', saves: '8.9K', hair_types: ['4C'], time: 'Overnight', color: '#FCE4EC' },
  { id: '3', name: 'Defined Wash & Go', saves: '15.2K', hair_types: ['3B', '3C', '4A'], time: '1 hr', color: '#E0F7FA' },
  { id: '4', name: 'Bantu Knot Out', saves: '6.7K', hair_types: ['4A', '4B', '4C'], time: 'Overnight', color: '#FFF3E0' },
];

// ═════════════════════════════════════════════════════════════════
// SCREEN
// ═════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [selectedDay, setSelectedDay] = useState(todayIdx());
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [weekPlan, setWeekPlan] = useState<Record<string, DayPlan>>({});
  const [hairType, setHairType] = useState('');
  const [userGoals, setUserGoals] = useState<string[]>([]);
  const [userSegments, setUserSegments] = useState<string[]>(['natural']);
  const [streak, setStreak] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [xpToday, setXpToday] = useState(0);
  const [xpToastAmount, setXpToastAmount] = useState(0);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [routineSource, setRoutineSource] = useState<'db' | 'fallback'>('fallback');

  const typeGroup = hairType.charAt(0) || '3';
  const dayKey = DAYS[selectedDay];
  const dayPlan = weekPlan[dayKey] || { label: '', steps: [] };
  const dayChecks = checks[dayKey] || {};
  const checkedCount = dayPlan.steps.filter(s => dayChecks[s.id]).length;
  const totalSteps = dayPlan.steps.length;
  const pct = totalSteps > 0 ? Math.round((checkedCount / totalSteps) * 100) : 0;

  // ── Show XP toast ──────────────────────────────────────────────
  const showXpToast = (amount: number) => {
    setXpToastAmount(amount);
    setXpToastVisible(false);
    setTimeout(() => setXpToastVisible(true), 50);
  };

  // ── Init ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

    // Award daily login XP (once per day)
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = await AsyncStorage.getItem('tressana_last_login_xp');
      if (lastLogin !== today) {
        const xp = await doAwardXp('daily_login', undefined, 'Daily app open');
        if (xp > 0) {
          setXpToday(prev => prev + xp);
          showXpToast(xp);
        }
        // Update streak
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await supabase.rpc('update_streak', { p_user_id: user.id });
        } catch (e) {}
        await AsyncStorage.setItem('tressana_last_login_xp', today);
      }
    })();

    // Load quiz data + build routine
    AsyncStorage.getItem('tressana_quiz').then(async raw => {
      const data = raw ? JSON.parse(raw) : null;
      const ht = data?.hairType || '3A';
      const goals = data?.goals || [];
      const segments = data?.segments || ['natural'];

      setHairType(ht);
      setUserGoals(goals);
      setUserSegments(segments);

      // Try DB-backed routine first (uses goals + segments)
      const dbPlan = await buildWeekFromDB(goals, segments);
      if (dbPlan) {
        setWeekPlan(dbPlan);
        setRoutineSource('db');
      } else {
        // Fallback to minimal hardcoded plan
        setWeekPlan(buildWeekFallback(ht.charAt(0)));
        setRoutineSource('fallback');
      }

      // Fetch products
      supabase.from('products').select('*').contains('hair_types', [ht.charAt(0)]).then(({ data: prods }) => {
        if (prods) setProducts(prods);
      });
    });

    // Load checks
    AsyncStorage.getItem('tressana_checks').then(raw => {
      if (raw) setChecks(JSON.parse(raw));
    });

    // Fetch XP status
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('xp_balances')
            .select('current_daily_streak').eq('user_id', user.id).maybeSingle();
          if (data) setStreak(data.current_daily_streak || 0);
        }
      } catch (e) {}
    })();

    // Fetch top salons
    supabase.from('salons').select('id, name, area, city, rating, review_count, hair_types')
      .order('rating', { ascending: false }).limit(3)
      .then(({ data }) => {
        if (data) setSalons(data.map((s: any) => ({
          ...s, initials: s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        })));
      });
  }, []);

  // ── Streak calc from checks ────────────────────────────────────
  useEffect(() => {
    if (Object.keys(weekPlan).length === 0) return;
    let s = 0;
    for (let i = todayIdx(); i >= 0; i--) {
      const dp = weekPlan[DAYS[i]];
      if (!dp) break;
      const dc = checks[DAYS[i]] || {};
      const done = dp.steps.filter(r => dc[r.id]).length;
      if (done === dp.steps.length && dp.steps.length > 0) s++;
      else break;
    }
    if (s > streak) setStreak(s);
  }, [checks, weekPlan]);

  // ── Toggle check + award XP ────────────────────────────────────
  const toggleCheck = useCallback(async (stepId: string) => {
    const wasChecked = checks[dayKey]?.[stepId];
    const updated = { ...checks, [dayKey]: { ...checks[dayKey], [stepId]: !wasChecked } };
    setChecks(updated);
    AsyncStorage.setItem('tressana_checks', JSON.stringify(updated));

    // Award XP only when CHECKING (not unchecking)
    if (!wasChecked) {
      const stepName = dayPlan.steps.find(s => s.id === stepId)?.name || 'Step';
      const xp = await doAwardXp('complete_routine_step', stepId, `Completed: ${stepName}`);
      if (xp > 0) {
        setXpToday(prev => prev + xp);
        showXpToast(xp);
      }

      // Check if ALL steps now complete → bonus XP
      const allDone = dayPlan.steps.every(s => s.id === stepId ? true : checks[dayKey]?.[s.id]);
      if (allDone && dayPlan.steps.length > 1) {
        setTimeout(async () => {
          const bonus = await doAwardXp('complete_full_routine', undefined, 'Full daily routine completed');
          if (bonus > 0) {
            setXpToday(prev => prev + bonus);
            showXpToast(bonus);
          }
        }, 800); // Slight delay so user sees both toasts
      }
    }
  }, [dayKey, checks, dayPlan]);

  return (
    <ScrollView style={st.container} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={st.greeting}>{greeting}</Text>
          <Text style={st.title}>Your Hair Day</Text>
        </View>
        <View style={st.headerRight}>
          {xpToday > 0 && (
            <View style={st.xpBadge}>
              <IconZap />
              <Text style={st.xpBadgeText}>+{xpToday}</Text>
            </View>
          )}
          {streak > 0 && (
            <View style={st.streakBadge}>
              <Text style={st.streakLabel}>streak</Text>
              <Text style={st.streakNum}>{streak}</Text>
            </View>
          )}
        </View>
      </View>

      {/* XP Toast (floating) */}
      <XpToast amount={xpToastAmount} visible={xpToastVisible} />

      {/* Try a Hairstyle Card */}
      <Animated.View entering={FadeInUp.duration(400)}>
        <Pressable onPress={() => router.push('/hairtransfer')} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
          <LinearGradient colors={['#7643AC', '#9B59D0', '#F484B9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.tryCard}>
            <View style={st.tryContent}>
              <Text style={st.tryTitle}>Try a new hairstyle</Text>
              <Text style={st.tryDesc}>Upload your selfie and a reference photo to see yourself with a new look.</Text>
              <View style={st.tryBtn}>
                <Text style={st.tryBtnText}>Try now</Text>
                <IconArrow />
              </View>
            </View>
            <View style={st.tryDecor}>
              <Svg width={60} height={80} viewBox="0 0 50 70" opacity={0.2}>
                <Path d="M25 2 C36 5, 36 16, 25 18 C14 20, 14 31, 25 33 C36 35, 36 46, 25 48 C14 50, 14 61, 25 63 L25 68" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
              </Svg>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Routine source indicator */}
      {routineSource === 'db' && userGoals.length > 0 && (
        <View style={st.routineTag}>
          <Text style={st.routineTagText}>
            Routine personalised for: {userGoals.map(g => {
              const labels: Record<string, string> = { moisture: 'Moisture', growth: 'Growth', definition: 'Curl definition', frizz: 'Frizz control', scalp_goal: 'Scalp health', damage: 'Damage repair', grow_hair: 'Growth', retain_moisture: 'Moisture', reduce_breakage: 'Less breakage', scalp_health: 'Scalp health', define_curls: 'Curl definition' };
              return labels[g] || g;
            }).join(' · ')}
            {userSegments.filter(s => s !== 'natural').length > 0 && ` · ${userSegments.filter(s => s !== 'natural').map(s => s.replace('_', ' ')).join(', ')}`}
          </Text>
        </View>
      )}

      {/* Tracker */}
      <Animated.View entering={FadeInUp.delay(50).duration(400)} style={st.tracker}>
        <LinearGradient colors={['#FDFCFF', '#F9F7FE']} style={st.trackerInner}>
          <View style={st.trackerTop}>
            <ProgressRing progress={pct} size={86} strokeWidth={7} />
            <View style={st.trackerInfo}>
              <Text style={st.trackerDay}>{DAYS[selectedDay]}</Text>
              <Text style={st.trackerLabel}>{dayPlan.label}</Text>
              <Text style={st.trackerSub}>{checkedCount}/{totalSteps} steps</Text>
              {pct === 100 && (
                <View style={st.doneBadge}>
                  <Text style={st.doneText}>Complete — +25 bonus XP</Text>
                </View>
              )}
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
                  {done ? <IconCheck /> : <Text style={st.stepNumText}>{i + 1}</Text>}
                </View>
                <View style={st.stepBody}>
                  <Text style={[st.stepName, done && st.stepNameDone]}>{step.name}</Text>
                  <Text style={st.stepDesc}>{step.desc}</Text>
                </View>
                <View style={st.stepXp}>
                  <IconZap />
                  <Text style={st.stepXpText}>{done ? 'Earned' : '+10'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Products */}
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

      {/* Trending Creators */}
      <Animated.View entering={FadeInUp.delay(250).duration(400)}>
        <View style={st.sectionHeader}>
          <Text style={st.section}>Trending creators</Text>
          <Pressable><Text style={st.seeAll}>See all</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.creatorScroll}>
          {TRENDING_CREATORS.map((c) => (
            <Pressable key={c.id} style={st.creatorCard}>
              <View style={[st.creatorImgArea, { backgroundColor: c.color }]}>
                <View style={st.creatorAvatar}>
                  <Text style={st.creatorInitials}>{c.initials}</Text>
                </View>
              </View>
              <View style={st.creatorInfo}>
                <Text style={st.creatorName} numberOfLines={1}>{c.name}</Text>
                <Text style={st.creatorHandle}>{c.handle}</Text>
                <Text style={st.creatorSpec} numberOfLines={2}>{c.speciality}</Text>
                <View style={st.creatorBottom}>
                  <View style={st.creatorFollowers}>
                    <IconUsers />
                    <Text style={st.creatorFollowerText}>{c.followers}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Trending Hairstyles */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)}>
        <View style={st.sectionHeader}>
          <Text style={st.section}>Trending hairstyles</Text>
          <Pressable onPress={() => router.push('/(tabs)/discover')}><Text style={st.seeAll}>See all</Text></Pressable>
        </View>
        <View style={st.styleGrid}>
          {TRENDING_STYLES.map((s) => (
            <Pressable key={s.id} style={st.styleCard}>
              <View style={[st.styleImgArea, { backgroundColor: s.color }]}>
                <Pressable style={st.styleBookmark}><IconBookmark /></Pressable>
                <View style={st.styleTimeBadge}><Text style={st.styleTimeText}>{s.time}</Text></View>
              </View>
              <View style={st.styleInfo}>
                <Text style={st.styleName} numberOfLines={1}>{s.name}</Text>
                <View style={st.styleBottom}>
                  <Text style={st.styleSaves}>{s.saves} saves</Text>
                  <View style={st.styleTags}>
                    {s.hair_types.slice(0, 2).map(t => (
                      <View key={t} style={st.typeTag}><Text style={st.typeTagText}>{t}</Text></View>
                    ))}
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Stylists near you */}
      {salons.length > 0 && (
        <Animated.View entering={FadeInUp.delay(350).duration(400)}>
          <View style={st.sectionHeader}>
            <Text style={st.section}>Stylists near you</Text>
            <Pressable onPress={() => router.push('/(tabs)/salons')}><Text style={st.seeAll}>See all</Text></Pressable>
          </View>
          <View style={st.salonList}>
            {salons.map((s: any) => (
              <Pressable key={s.id} onPress={() => router.push('/(tabs)/salons')} style={st.salonCard}>
                <View style={st.salonAvatar}><Text style={st.salonInitials}>{s.initials}</Text></View>
                <View style={st.salonBody}>
                  <Text style={st.salonName}>{s.name}</Text>
                  <View style={st.salonLocRow}><IconMapPin /><Text style={st.salonArea}>{s.area}, {s.city}</Text></View>
                  <View style={st.salonMetaRow}>
                    <View style={st.salonRating}><IconStar /><Text style={st.salonRatingText}>{s.rating}</Text><Text style={st.salonReviewCount}>({s.review_count})</Text></View>
                  </View>
                </View>
                <IconChevronRight />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Tip */}
      <Animated.View entering={FadeInUp.delay(400).duration(400)}>
        <LinearGradient colors={['#120B2E', '#332463']} style={st.tip}>
          <View style={st.tipBadge}><Text style={st.tipBadgeText}>TIP</Text></View>
          <Text style={st.tipTitle}>
            {userSegments.includes('braids') ? 'Braid care is scalp care'
              : userSegments.includes('transplant') ? 'Follow your surgeon'
              : typeGroup === '4' ? 'Moisture is everything'
              : typeGroup === '3' ? 'Deep condition weekly'
              : typeGroup === '2' ? "Scrunch, don't rub"
              : 'Skip heavy oils'}
          </Text>
          <Text style={st.tipBody}>
            {userSegments.includes('braids') ? 'Use an applicator bottle to cleanse your scalp between braids. Heavy products cause buildup and attract lint. Keep it light.'
              : userSegments.includes('transplant') ? 'Your surgeon knows your grafts better than any app. Follow their protocol exactly for the first 3 months. We handle the rest.'
              : typeGroup === '4' ? 'The LOC method seals in hydration for coily hair. Apply to soaking wet hair for best results.'
              : typeGroup === '3' ? 'Curls lose moisture fast. A weekly mask keeps them bouncy and defined.'
              : typeGroup === '2' ? 'Scrunching with a microfibre towel encourages wave pattern. Rubbing creates frizz.'
              : 'Straight hair gets weighed down fast. Use lightweight serums and spray-in conditioners.'}
          </Text>
        </LinearGradient>
      </Animated.View>

    </ScrollView>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  scroll: { paddingTop: Platform.OS === 'ios' ? 62 : 48, paddingBottom: 110 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginBottom: 2 },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.ink, letterSpacing: -0.5 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(138,184,0,0.12)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  xpBadgeText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: '#5a6b00' },
  streakBadge: { alignItems: 'center', backgroundColor: 'rgba(118,67,172,0.08)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
  streakLabel: { fontFamily: Fonts.body, fontSize: 9, color: Colors.violet, textTransform: 'uppercase', letterSpacing: 1 },
  streakNum: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.violet },

  // XP toast
  xpToast: {
    position: 'absolute', top: Platform.OS === 'ios' ? 100 : 80, alignSelf: 'center', zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.ink, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  xpToastText: { fontFamily: Fonts.headingSemi, fontSize: 16, color: '#fff' },

  // Routine tag
  routineTag: { marginHorizontal: 20, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: 'rgba(118,67,172,0.06)', borderRadius: 10 },
  routineTagText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.violet, lineHeight: 16 },

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
  stepXp: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(118,67,172,0.06)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  stepXpText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Colors.violet },

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

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  seeAll: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.violet },
  typeTag: { backgroundColor: '#F7F5FB', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  typeTagText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Colors.ink },

  creatorScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 4, marginBottom: 28 },
  creatorCard: { width: 170, backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden' },
  creatorImgArea: { height: 120, justifyContent: 'flex-end', padding: 14 },
  creatorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  creatorInitials: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.violet },
  creatorInfo: { padding: 14, paddingTop: 10 },
  creatorName: { fontFamily: Fonts.headingSemi, fontSize: 14, color: Colors.ink, marginBottom: 1 },
  creatorHandle: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginBottom: 6 },
  creatorSpec: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, lineHeight: 16, marginBottom: 10 },
  creatorBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  creatorFollowers: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorFollowerText: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.ink },

  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginBottom: 28 },
  styleCard: { width: (width - 52) / 2, backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden' },
  styleImgArea: { height: 140, position: 'relative' },
  styleBookmark: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  styleTimeBadge: { position: 'absolute', bottom: 10, left: 10, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)' },
  styleTimeText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: '#fff' },
  styleInfo: { padding: 12 },
  styleName: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.ink, marginBottom: 6 },
  styleBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  styleSaves: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  styleTags: { flexDirection: 'row', gap: 4 },

  salonList: { paddingHorizontal: 20, gap: 10, marginBottom: 28 },
  salonCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border },
  salonAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center' },
  salonInitials: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.violet },
  salonBody: { flex: 1 },
  salonName: { fontFamily: Fonts.headingSemi, fontSize: 14, color: Colors.ink, marginBottom: 3 },
  salonLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  salonArea: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  salonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  salonRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  salonRatingText: { fontFamily: Fonts.headingSemi, fontSize: 13, color: Colors.ink },
  salonReviewCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },

  tip: { marginHorizontal: 20, borderRadius: 20, padding: 22, marginBottom: 20 },
  tipBadge: { backgroundColor: 'rgba(217,255,0,0.15)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  tipBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.lime, letterSpacing: 0.8, textTransform: 'uppercase' },
  tipTitle: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.porcelain, marginBottom: 6 },
  tipBody: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
});