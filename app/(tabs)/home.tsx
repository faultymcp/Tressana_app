// app/(tabs)/home.tsx
//
// Tressana home — the daily editorial surface.
//
// Design lineage:
//   - Flo's ritual (the user returns daily for a relationship with her hair)
//   - Co-Star's editorial atmosphere (bold serif typography, atmospheric depth,
//     content written for *you* not for a segment)
//
// Layout (top to bottom):
//   1. Masthead — date in caps, greeting in Fraunces serif
//   2. TODAY — the hero card. "Wash day." / "Refresh day." / "Style day."
//              with today's actual steps as checkable rows
//   3. Today's note — one italic Fraunces line, contextual ritual fact
//   4. Your hair, in numbers — Flo-style cycle stats (day N of N, next wash)
//   5. Your full routine — collapsed "Open routine" CTA
//   6. Pick of the day — featured product OR educational content
//   7. Salons near you — 2 teaser cards, "See all in Discover" link
//   8. Closing note — small italic
//
// Voice: borrowed from the reveal voice doc. Same gold labels (Sora caps),
// same Fraunces display, same Inter body. Cream/porcelain background instead
// of deep violet because daily ≠ ceremonial.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Dimensions, Animated as RNAnimated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  bootstrapUserRoutine,
  fetchRoutineFromDB,
  getUserRoutineSteps,
  markStepComplete,
  getTodayCompletions,
  getCurrentUserId,
  type RoutineStep as LibRoutineStep,
  type WeekPlan as LibWeekPlan,
} from '@/lib/routines';

const { width } = Dimensions.get('window');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
const todayLabel = () => DAYS[todayIdx()];

// ─── Types ───────────────────────────────────────────────────────
// Types come from lib/routines.ts so that home + routine + lib all
// agree on shape. Local screen still uses `Step`/`DayPlan` names for
// readability, but they're the same objects as the lib layer.
type Step = LibRoutineStep;
type DayPlan = { label: string; steps: Step[] };

// ─── Icons (small set, reused across the screen) ──────────────────
function IconCheck({ color = '#FFFEF7' }: { color?: string }) {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5" /></Svg>;
}
function IconChev({ color = '#8A7FA0' }: { color?: string }) {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"><Path d="M9 18l6-6-6-6" /></Svg>;
}
function IconStar() {
  return <Svg width={11} height={11} viewBox="0 0 24 24" fill="#7643AC"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></Svg>;
}
function IconPin() {
  return <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#8A7FA0" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><Circle cx="12" cy="10" r="3" /></Svg>;
}

// ─── Greeting based on time ──────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late evening';
}

// ─── Date display: "TUESDAY · 24 NOV" ────────────────────────────
function dateMasthead(): string {
  const d = new Date();
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const dayNum = d.getDate();
  const month = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  return `${day} · ${dayNum} ${month}`;
}

// ─── Fallback routine ────────────────────────────────────────────
// Used only when both the user layer (Supabase per-user routine) and the
// template layer (Supabase routine_templates) fail or return nothing —
// e.g. guest mode with no network. Step shape must satisfy lib RoutineStep,
// so `frequency` and `xp` are required.
function buildWeekFallback(): Record<string, DayPlan> {
  const mk = (id: string, name: string, desc: string, frequency = 'daily'): Step =>
    ({ id, name, desc, frequency, xp: 10 });
  const refresh = mk('moisturise', 'Moisturise', 'Light leave-in or water-based spray');
  const protect = mk('protect', 'Night protection', 'Satin bonnet or pillowcase');
  const refreshDay = { label: 'Refresh day', steps: [refresh, protect] };
  const styleDay = { label: 'Style day', steps: [
    mk('moisturise-restyle', 'Moisturise + restyle', 'Refresh curls or smooth waves'),
    refresh, protect,
  ]};
  const washDay = { label: 'Wash day', steps: [
    mk('cleanse', 'Cleanse', 'Gentle shampoo on scalp', 'weekly'),
    mk('condition', 'Condition', 'Mid-length to ends, detangle', 'weekly'),
    mk('deep', 'Deep condition', 'Mask for 20 minutes', 'weekly'),
    mk('style', 'Style', 'Apply styling products to wet hair', 'weekly'),
    protect,
  ]};
  return {
    Mon: refreshDay, Tue: refreshDay, Wed: styleDay, Thu: refreshDay,
    Fri: refreshDay, Sat: washDay, Sun: refreshDay,
  };
}

// ─── Award XP ────────────────────────────────────────────────────
async function doAwardXp(action: string, refId?: string, desc?: string): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: user.id, p_action: action,
      p_reference_id: refId || null, p_description: desc || null, p_override_amount: null,
    });
    if (error) return 0;
    return data || 0;
  } catch { return 0; }
}

// ─── Daily ritual notes (templated by type/segment/cycle) ────────
// Picks one note per day based on the day of year + hair context.
// This is the "Co-Star daily horoscope" beat.
function dailyNote(hairType: string, segments: string[], porosity: string, daysSinceWash: number): string {
  const group = hairType.charAt(0);
  const notes: string[] = [];

  // Cycle-based first (most specific)
  if (daysSinceWash === 0) notes.push("Today's hair is freshly washed — let the natural oils start to do their work.");
  else if (daysSinceWash >= 3 && daysSinceWash <= 5) notes.push("Day three to five is often when hair stops cooperating. Trust the rhythm.");
  else if (daysSinceWash >= 6) notes.push("Your scalp will start letting you know it's wash time. Listen.");

  // Porosity
  if (porosity === 'low') notes.push("Low porosity hair likes warm water. Rinse on the cooler side of warm today.");
  if (porosity === 'high') notes.push("Your hair drinks fast. Apply leave-in to soaking wet hair, not damp.");

  // Type-group ritual
  if (group === '3' || group === '4') notes.push("The less you touch curls as they dry, the more defined they set.");
  if (group === '1' || group === '2') notes.push("Heat protectant on dry hair before any styling. Always. Five seconds. Three years.");

  // Segments
  if (segments.includes('postpartum')) notes.push("Postpartum shed is loudest in months three to six. It does end.");
  if (segments.includes('transitioning')) notes.push("Two textures coexisting in your hair is the whole point of transitioning.");
  if (segments.includes('transplant')) notes.push("Donor hair acts like the hair it came from. Treat it like the hair it is now.");

  // Pick one deterministically by day so it's stable across re-renders that day
  const seed = new Date().toISOString().slice(0, 10).split('-').reduce((a, b) => a + parseInt(b), 0);
  return notes[seed % notes.length] || "Your hair is its own thing today. Read it before you reach for anything.";
}

// ─── XP Toast ────────────────────────────────────────────────────
function XpToast({ amount, visible }: { amount: number; visible: boolean }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(20)).current;
  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        RNAnimated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
          RNAnimated.timing(translateY, { toValue: 20, duration: 240, useNativeDriver: true }),
        ]).start();
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [visible]);
  return (
    <RNAnimated.View style={[st.toast, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={st.toastText}>+{amount} XP</Text>
    </RNAnimated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Home screen
// ═══════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [hairType, setHairType] = useState('');
  const [porosity, setPorosity] = useState('');
  const [segments, setSegments] = useState<string[]>([]);
  const [weekPlan, setWeekPlan] = useState<Record<string, DayPlan>>({});
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [daysSinceWash, setDaysSinceWash] = useState(0);
  const [salons, setSalons] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [xpToday, setXpToday] = useState(0);
  const [toastAmount, setToastAmount] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [routineExpanded, setRoutineExpanded] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const showXpToast = (amount: number) => {
    setToastAmount(amount);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // Load all data on mount
  useEffect(() => {
    (async () => {
      // User name
      const userRaw = await AsyncStorage.getItem('tressana_user');
      const userObj = userRaw ? JSON.parse(userRaw) : null;
      setFirstName(userObj?.firstName?.trim() || '');

      // Quiz data
      const quizRaw = await AsyncStorage.getItem('tressana_quiz');
      const data = quizRaw ? JSON.parse(quizRaw) : null;
      const ht = data?.hairType || '3A';
      const goals = data?.goals || [];
      const segs = data?.segments || ['natural'];
      const por = data?.porosity || 'medium';
      setHairType(ht);
      setSegments(segs);
      setPorosity(por);

      // Build routine — try the user layer (Supabase per-user copy) first,
      // fall back to the template layer / local fallback if unauthenticated
      // or DB is unreachable.
      const userId = await getCurrentUserId();
      let dbPlan: Record<string, DayPlan> | null = null;

      // Read local checks first so server seed (below) is authoritative.
      const checksRaw = await AsyncStorage.getItem('tressana_checks');
      if (checksRaw) {
        try { setChecks(JSON.parse(checksRaw)); } catch {}
      }

      if (userId) {
        dbPlan = await getUserRoutineSteps(userId);
        // Home-open safety net: if authenticated but no routine in DB
        // (e.g. user signed in AFTER completing the quiz), bootstrap now.
        if (!dbPlan) {
          await bootstrapUserRoutine(userId, goals, segs);
          dbPlan = await getUserRoutineSteps(userId, { skipCache: true });
        }

        // Seed `checks` state from server-side completions so the UI
        // shows what's actually been done today across devices.
        const todayComps = await getTodayCompletions(userId);
        if (todayComps.length > 0) {
          const todayKey = todayLabel();
          const seeded: Record<string, boolean> = {};
          for (const c of todayComps) seeded[c.step_id] = true;
          setChecks(prev => ({ ...prev, [todayKey]: { ...(prev[todayKey] || {}), ...seeded } }));
        }
      }

      // Final fallback chain: user layer → template layer → local builder.
      if (!dbPlan) dbPlan = await fetchRoutineFromDB(goals, segs);
      setWeekPlan(dbPlan || buildWeekFallback());

      // Days since wash (rough estimate from check history)
      const lastWashRaw = await AsyncStorage.getItem('tressana_last_wash');
      if (lastWashRaw) {
        const last = new Date(lastWashRaw);
        const diff = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
        setDaysSinceWash(Math.max(0, Math.min(diff, 14)));
      }

      // Daily login XP
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = await AsyncStorage.getItem('tressana_last_login_xp');
      if (lastLogin !== today) {
        const xp = await doAwardXp('daily_login', undefined, 'Daily app open');
        if (xp > 0) { setXpToday(prev => prev + xp); showXpToast(xp); }
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await supabase.rpc('update_streak', { p_user_id: user.id });
        } catch {}
        await AsyncStorage.setItem('tressana_last_login_xp', today);
      }

      // Streak
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: sd } = await supabase.from('xp_balances')
            .select('current_daily_streak').eq('user_id', user.id).maybeSingle();
          if (sd) setStreak(sd.current_daily_streak || 0);
        }
      } catch {}

      // Products
      supabase.from('products').select('*').contains('hair_types', [ht.charAt(0)]).limit(3)
        .then(({ data: prods }) => { if (prods) setProducts(prods); });

      // Top salons
      supabase.from('salons').select('id, name, area, city, rating, review_count, hair_types')
        .order('rating', { ascending: false }).limit(2)
        .then(({ data: sds }) => {
          if (sds) setSalons(sds.map((s: any) => ({
            ...s,
            initials: s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
          })));
        });
    })();
  }, []);

  // Toggle a step done/undone.
  // Source of truth is Supabase routine_completions (via markStepComplete).
  // Local `checks` is kept in sync for instant UI feedback. Falls back to
  // AsyncStorage-only mode when the user isn't authenticated.
  const toggleStep = useCallback(async (stepId: string, stepName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const day = todayLabel();
    const dayChecks = { ...(checks[day] || {}) };
    const wasDone = !!dayChecks[stepId];
    dayChecks[stepId] = !wasDone;
    const updated = { ...checks, [day]: dayChecks };
    setChecks(updated);
    await AsyncStorage.setItem('tressana_checks', JSON.stringify(updated)).catch(() => {});

    // If wash step completed, record wash date
    if (!wasDone && (stepName.toLowerCase().includes('cleanse') || stepName.toLowerCase().includes('wash') || stepName.toLowerCase().includes('shampoo'))) {
      await AsyncStorage.setItem('tressana_last_wash', new Date().toISOString());
      setDaysSinceWash(0);
    }

    // Persist to Supabase + award XP via the lib data layer.
    // The step's routine_id is on the Step itself (carried through from
    // getUserRoutineSteps). If it's missing, the user is on the template
    // fallback and we can only update locally.
    const today = weekPlan[day];
    const step = today?.steps.find(s => s.id === stepId);
    const routineId = step?.routine_id;
    const userId = await getCurrentUserId();

    if (!wasDone && userId && routineId) {
      const xp = await markStepComplete(userId, routineId, stepId, true);
      if (xp > 0) {
        setXpToday(prev => prev + xp);
        showXpToast(xp);
        // Bonus when every step for today is done
        if (today && today.steps.every(s => updated[day]?.[s.id])) {
          const bonus = await doAwardXp('complete_full_routine', undefined, 'Full routine done');
          if (bonus > 0) {
            setTimeout(() => { setXpToday(p => p + bonus); showXpToast(bonus); }, 1000);
          }
        }
      }
    } else if (!wasDone && !userId) {
      // Local-only fallback (unauthenticated): keep old XP behaviour so
      // the UX doesn't degrade for guests.
      const xp = await doAwardXp('complete_routine_step', stepId, `Completed: ${stepName}`);
      if (xp > 0) {
        setXpToday(prev => prev + xp);
        showXpToast(xp);
        if (today && today.steps.every(s => updated[day]?.[s.id])) {
          const bonus = await doAwardXp('complete_full_routine', undefined, 'Full routine done');
          if (bonus > 0) {
            setTimeout(() => { setXpToday(p => p + bonus); showXpToast(bonus); }, 1000);
          }
        }
      }
    } else if (wasDone && userId && routineId) {
      // Uncheck — remove the completion in DB (no XP refund; ledger is append-only)
      await markStepComplete(userId, routineId, stepId, false);
    }
  }, [checks, weekPlan]);

  const today = weekPlan[todayLabel()] || { label: '', steps: [] };
  const todayChecks = checks[todayLabel()] || {};
  const completedCount = today.steps.filter(s => todayChecks[s.id]).length;
  const totalCount = today.steps.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const note = dailyNote(hairType || '3A', segments, porosity, daysSinceWash);

  // Determine next wash day
  const nextWashDay = (() => {
    const todayI = todayIdx();
    for (let i = 1; i <= 7; i++) {
      const d = DAYS[(todayI + i) % 7];
      if (weekPlan[d]?.label === 'Wash day') return d;
    }
    return null;
  })();

  return (
    <View style={st.container}>
      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. MASTHEAD ── */}
        <Animated.View entering={FadeIn.duration(400)} style={st.masthead}>
          <View style={st.mastheadTop}>
            <Text style={st.dateLabel}>{dateMasthead()}</Text>
            {streak > 0 && (
              <View style={st.streakPill}>
                <Text style={st.streakText}>{streak}</Text>
                <Text style={st.streakLabel}>day streak</Text>
              </View>
            )}
          </View>
          <Text style={st.greeting}>
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </Text>
        </Animated.View>

        {/* ── 2. TODAY (hero) ── */}
        <Animated.View entering={FadeInUp.delay(80).duration(450)} style={st.heroCard}>
          <Text style={st.editorialLabel}>TODAY</Text>
          <Text style={st.heroTitle}>{today.label || 'A quiet day.'}</Text>
          {totalCount > 0 && (
            <Text style={st.heroSubtitle}>
              {completedCount} of {totalCount} done · {Math.round(progress * 100)}%
            </Text>
          )}

          {/* Step rows */}
          <View style={st.steps}>
            {today.steps.map(step => {
              const done = !!todayChecks[step.id];
              return (
                <Pressable
                  key={step.id}
                  onPress={() => toggleStep(step.id, step.name)}
                  style={({ pressed }) => [st.stepRow, pressed && { opacity: 0.7 }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`${done ? 'Completed' : 'Mark complete'}: ${step.name}`}
                >
                  <View style={[st.stepCheck, done && st.stepCheckDone]}>
                    {done && <IconCheck />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.stepName, done && st.stepNameDone]}>{step.name}</Text>
                    <Text style={[st.stepDesc, done && st.stepDescDone]}>{step.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Progress bar at bottom */}
          {totalCount > 0 && (
            <View style={st.progressTrack}>
              <View style={[st.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          )}
        </Animated.View>

        {/* ── 3. TODAY'S NOTE ── */}
        <Animated.View entering={FadeInUp.delay(160).duration(450)} style={st.noteCard}>
          <Text style={st.noteLabel}>TODAY'S NOTE</Text>
          <Text style={st.noteText}>{note}</Text>
        </Animated.View>

        {/* ── 4. YOUR HAIR, IN NUMBERS ── */}
        <Animated.View entering={FadeInUp.delay(240).duration(450)} style={st.rhythmCard}>
          <Text style={st.editorialLabel}>YOUR RHYTHM</Text>
          <View style={st.rhythmRow}>
            <View style={st.rhythmCol}>
              <Text style={st.rhythmNum}>{daysSinceWash}</Text>
              <Text style={st.rhythmLabel}>days since wash</Text>
            </View>
            <View style={st.rhythmDivider} />
            <View style={st.rhythmCol}>
              <Text style={st.rhythmNum}>{nextWashDay || '—'}</Text>
              <Text style={st.rhythmLabel}>next wash</Text>
            </View>
            <View style={st.rhythmDivider} />
            <View style={st.rhythmCol}>
              <Text style={st.rhythmNum}>{hairType || '—'}</Text>
              <Text style={st.rhythmLabel}>your type</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Try-on entry ── */}
        <Animated.View entering={FadeInUp.delay(360).duration(450)}>
          <Pressable
            onPress={() => router.push('/hairtransfer')}
            style={st.tryOnCard}
            accessibilityRole="button"
            accessibilityLabel="Virtual hair try-on. Swap a reference hairstyle onto your photo."
          >
            <View style={st.tryOnTextCol}>
              <Text style={st.tryOnLabel}>VIRTUAL TRY-ON</Text>
              <Text style={st.tryOnTitle}>See a new style on you</Text>
              <Text style={st.tryOnSub}>Upload a selfie and a reference look — we'll swap the hairstyle onto your photo.</Text>
            </View>
            <View style={st.tryOnIconWrap}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
                <Path d="M12 2L2 7l10 5 10-5-10-5z" />
                <Path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </Svg>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── 5. YOUR FULL ROUTINE (collapsible) ── */}
        <Animated.View entering={FadeInUp.delay(320).duration(450)} style={st.routineCard}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setRoutineExpanded(!routineExpanded);
            }}
            style={st.routineHeader}
            accessibilityRole="button"
            accessibilityLabel={routineExpanded ? 'Collapse full routine' : 'Open full routine'}
          >
            <View>
              <Text style={st.editorialLabel}>YOUR FULL ROUTINE</Text>
              <Text style={st.routineTitle}>Across the week</Text>
            </View>
            <View style={[st.chevWrap, routineExpanded && st.chevWrapOpen]}>
              <IconChev color="#7643AC" />
            </View>
          </Pressable>
          {routineExpanded && (
            <View style={st.routineWeek}>
              {DAYS.map(d => {
                const plan = weekPlan[d];
                if (!plan) return null;
                const isToday = d === todayLabel();
                const isOpen = expandedDay === d;
                return (
                  <View key={d}>
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setExpandedDay(isOpen ? null : d);
                      }}
                      style={[st.dayRow, isToday && st.dayRowToday]}
                      accessibilityRole="button"
                      accessibilityLabel={`${d}, ${plan.label}, ${plan.steps.length} steps. ${isOpen ? 'Hide' : 'Show'} steps.`}
                    >
                      <Text style={[st.dayName, isToday && st.dayNameToday]}>{d}</Text>
                      <Text style={[st.dayLabel, isToday && st.dayLabelToday]}>{plan.label}</Text>
                      <Text style={st.dayStepCount}>{plan.steps.length} steps</Text>
                      <View style={[st.dayChev, isOpen && st.dayChevOpen]}>
                        <IconChev color="#8A7FA0" />
                      </View>
                    </Pressable>
                    {isOpen && (
                      <View style={st.dayStepsList}>
                        {plan.steps.map(s => (
                          <View key={s.id} style={st.dayStepItem}>
                            <View style={st.dayStepDot} />
                            <View style={{ flex: 1 }}>
                              <Text style={st.dayStepName}>{s.name}</Text>
                              {!!s.desc && <Text style={st.dayStepDesc}>{s.desc}</Text>}
                            </View>
                            <Text style={st.dayStepXp}>+{s.xp ?? 10} XP</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* ── 6. PICK OF THE DAY (product OR content) ── */}
        {products.length > 0 && (
          <Animated.View entering={FadeInUp.delay(400).duration(450)} style={st.pickCard}>
            <Text style={st.goldLabel}>PICK OF THE DAY</Text>
            <Text style={st.pickTitle}>{products[0].name}</Text>
            <Text style={st.pickBrand}>{products[0].brand || 'For your type'}</Text>
            <Text style={st.pickBody} numberOfLines={3}>
              {products[0].description || 'Selected for your hair structure today.'}
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/discover')} style={st.pickCta}>
              <Text style={st.pickCtaText}>See in Discover →</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── 7. SALONS NEAR YOU ── */}
        {salons.length > 0 && (
          <Animated.View entering={FadeInUp.delay(480).duration(450)} style={st.salonsSection}>
            <View style={st.sectionHeader}>
              <Text style={st.editorialLabel}>SALONS NEAR YOU</Text>
              <Pressable onPress={() => router.push('/(tabs)/salons')}>
                <Text style={st.seeAll}>See all →</Text>
              </Pressable>
            </View>
            {salons.map(s => (
              <Pressable
                key={s.id}
                onPress={() => router.push('/(tabs)/salons')}
                style={st.salonCard}
                accessibilityRole="button"
                accessibilityLabel={`Salon: ${s.name}`}
              >
                <View style={st.salonInitials}>
                  <Text style={st.salonInitialsText}>{s.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.salonName}>{s.name}</Text>
                  <View style={st.salonMeta}>
                    <IconPin />
                    <Text style={st.salonArea}>{s.area || s.city || 'Nearby'}</Text>
                    <Text style={st.salonDot}>·</Text>
                    <IconStar />
                    <Text style={st.salonRating}>{(s.rating || 0).toFixed(1)}</Text>
                  </View>
                </View>
                <IconChev />
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* ── 8. CLOSING NOTE ── */}
        <Animated.View entering={FadeInUp.delay(560).duration(450)} style={st.closer}>
          <Text style={st.closerText}>
            Tressana adjusts as you do — tap any step to make it yours.
          </Text>
        </Animated.View>
      </ScrollView>

      <XpToast amount={toastAmount} visible={toastVisible} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles — cream/porcelain editorial. Fraunces display, Sora caps,
// Inter body. Gold (lime) for labels only. Violet for action.
// ═══════════════════════════════════════════════════════════════

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  // ── 1. Masthead
  masthead: { marginBottom: 28 },
  mastheadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 10,
    letterSpacing: 2.5,
    color: Colors.muted,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    backgroundColor: Colors.violetBg2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 14,
    color: Colors.violet,
  },
  streakLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 0.5,
    color: Colors.violet,
  },
  greeting: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: Colors.ink,
    letterSpacing: -1.2,
    lineHeight: 40,
  },

  // ── Shared editorial label (gold caps)
  editorialLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 10,
    letterSpacing: 2.5,
    color: Colors.violet,
    marginBottom: 8,
  },
  goldLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 10,
    letterSpacing: 2.5,
    color: '#8AB800',
    marginBottom: 8,
  },

  // ── 2. Hero (today)
  heroCard: {
    backgroundColor: 'rgba(124,77,200,0.10)',
    borderRadius: Radius.lg,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,77,200,0.22)',
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  heroTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 30,
    color: Colors.ink,
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 18,
  },

  steps: { gap: 12 },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  stepCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepCheckDone: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
  },
  stepName: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 15,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  stepNameDone: {
    color: Colors.muted,
    textDecorationLine: 'line-through',
  },
  stepDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.muted,
    marginTop: 2,
  },
  stepDescDone: { opacity: 0.5 },
  moreSteps: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.violet,
    marginTop: 4,
  },

  progressTrack: {
    height: 2,
    backgroundColor: Colors.violetBg,
    borderRadius: 1,
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.violet,
  },

  // ── 3. Today's note
  noteCard: {
    backgroundColor: 'rgba(118,67,172,0.04)',
    borderRadius: Radius.lg,
    padding: 22,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.violet,
  },
  noteLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 10,
    letterSpacing: 2.5,
    color: Colors.violet,
    marginBottom: 10,
  },
  noteText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 17,
    lineHeight: 26,
    color: Colors.ink,
    letterSpacing: -0.2,
  },

  // ── Try-on hero card
  tryOnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.violet,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
  tryOnTextCol: { flex: 1 },
  tryOnLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  tryOnTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 20,
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tryOnSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
  },
  tryOnIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── 4. Your rhythm
  rhythmCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rhythmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rhythmCol: {
    flex: 1,
    alignItems: 'center',
  },
  rhythmNum: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: Colors.ink,
    letterSpacing: -1.5,
    lineHeight: 36,
  },
  rhythmLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 0.6,
    color: Colors.muted,
    marginTop: 4,
    textTransform: 'lowercase',
  },
  rhythmDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },

  // ── 5. Full routine
  routineCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: Colors.ink,
    letterSpacing: -0.4,
  },
  chevWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '0deg' }],
  },
  chevWrapOpen: {
    transform: [{ rotate: '90deg' }],
  },
  routineWeek: {
    marginTop: 18,
    gap: 2,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.violetBg,
  },
  dayRowToday: {
    backgroundColor: Colors.violetBg,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: -8,
    borderBottomWidth: 0,
  },
  dayName: {
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: Colors.muted,
    width: 44,
    letterSpacing: 0.8,
  },
  dayNameToday: { color: Colors.violet },
  dayLabel: {
    flex: 1,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 14,
    color: Colors.ink,
  },
  dayLabelToday: {
    fontFamily: 'Fraunces_700Bold',
  },
  dayStepCount: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
  },
  dayChev: {
    marginLeft: 8,
    transform: [{ rotate: '90deg' }],
  },
  dayChevOpen: {
    transform: [{ rotate: '-90deg' }],
  },
  dayStepsList: {
    paddingLeft: 44,
    paddingBottom: 10,
    gap: 10,
  },
  dayStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dayStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.lavender,
    marginTop: 6,
  },
  dayStepName: {
    fontFamily: 'Sora_500Medium',
    fontSize: 13,
    color: Colors.ink,
  },
  dayStepDesc: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 1,
  },
  dayStepXp: {
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    color: Colors.violet,
  },

  // ── 6. Pick of the day
  pickCard: {
    backgroundColor: '#FAFCE8',
    borderRadius: Radius.lg,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(138,184,0,0.18)',
  },
  pickTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: Colors.ink,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pickBrand: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: 12,
    color: '#8AB800',
    marginBottom: 12,
  },
  pickBody: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.ink,
    opacity: 0.78,
    marginBottom: 16,
  },
  pickCta: {
    alignSelf: 'flex-start',
  },
  pickCtaText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: '#7643AC',
    letterSpacing: 0.3,
  },

  // ── 7. Salons
  salonsSection: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  seeAll: {
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    color: Colors.violet,
    letterSpacing: 0.3,
  },
  salonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  salonInitials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.violetBg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salonInitialsText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 14,
    color: Colors.violet,
    letterSpacing: -0.3,
  },
  salonName: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  salonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  salonArea: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
  },
  salonDot: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
  },
  salonRating: {
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    color: Colors.ink,
  },

  // ── 8. Closer
  closer: {
    marginTop: 8,
    paddingHorizontal: 20,
  },
  closerText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.muted,
    textAlign: 'center',
  },

  // XP Toast
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.violet,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 14,
    color: Colors.white,
    letterSpacing: -0.2,
  },
});