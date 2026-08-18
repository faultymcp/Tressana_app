// app/routine.tsx
//
// The full routine screen. Real estate dedicated to the soul of the app:
// the user's week of hair care, every day, every step, visible.
//
// Architecture:
//   1. Masthead — back arrow, "YOUR ROUTINE" centred cap
//   2. Hero summary — Fraunces title + Inter paragraph drawn from quiz
//   3. Week strip — 7 day pills, today highlighted, tap to scroll-to-day
//   4. Per-day sections — every step visible, today checkable, others read-only
//   5. Footer note — honest about what's not yet built
//
// Voice & design: follows BRAND.md.
// Visibility-only in this version. Customisation comes next session.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
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
} from '@/lib/routines';

const { width } = Dimensions.get('window');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
const todayLabel = () => DAYS[todayIdx()];

// ─── Types ───────────────────────────────────────────────────────
// Types come from lib/routines.ts so home + routine + lib agree on shape.
type Step = LibRoutineStep;
type DayPlan = { label: string; steps: Step[] };

// ─── Icons ───────────────────────────────────────────────────────
function IconBack() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}
function IconCheck({ color = '#FFFEF7' }: { color?: string }) {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5" /></Svg>;
}

// ─── Fallback routine ────────────────────────────────────────────
// Used only when both the user layer and the template layer fail —
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

// ─── Build the personalised hero paragraph from quiz data ────────
function buildHeroParagraph(data: any): string {
  if (!data) return 'Your weekly hair care, built around who you are.';
  const ht = data.hairType || '3A';
  const strand = data.strand_thickness;
  const porosity = data.porosity;
  const segments = (data.segments || []) as string[];

  const facts: string[] = [];
  facts.push(`${ht} ${ht.startsWith('1') ? 'straight' : ht.startsWith('2') ? 'waves' : ht.startsWith('3') ? 'curls' : 'coils'}`);
  if (strand && strand !== 'unsure') facts.push(`${strand} strands`);
  if (porosity && porosity !== 'unsure') facts.push(`${porosity} porosity`);

  const factLine = facts.join(', ');

  const segPart = segments.includes('postpartum') ? ' Adjusted for postpartum.'
    : segments.includes('transitioning') ? ' Built for the transition.'
    : segments.includes('transplant') ? ' Adjusted for post-transplant care.'
    : segments.includes('alopecia') ? ' Considerate of alopecia.'
    : segments.includes('chemo') ? ' Gentle for chemo recovery.'
    : '';

  return `Built around ${factLine}.${segPart} Tap any day to see what it asks of you.`;
}

// ═══════════════════════════════════════════════════════════════
// Routine screen
// ═══════════════════════════════════════════════════════════════
export default function RoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const dayPositions = useRef<Record<string, number>>({});

  const [weekPlan, setWeekPlan] = useState<Record<string, DayPlan>>({});
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [quizData, setQuizData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const quizRaw = await AsyncStorage.getItem('tressie_quiz');
      const data = quizRaw ? JSON.parse(quizRaw) : null;
      setQuizData(data);

      const goals = data?.goals || [];
      const segments = data?.segments || ['natural'];

      // Read local checks first so the server seed below is authoritative.
      const checksRaw = await AsyncStorage.getItem('tressie_checks');
      if (checksRaw) {
        try { setChecks(JSON.parse(checksRaw)); } catch {}
      }

      // Data load chain: user layer → bootstrap retry → template fallback → local.
      const userId = await getCurrentUserId();
      let dbPlan: Record<string, DayPlan> | null = null;

      if (userId) {
        dbPlan = await getUserRoutineSteps(userId);
        if (!dbPlan) {
          // Safety net: bootstrap if quiz finished while unauthenticated and
          // the user has since signed in. Idempotent — safe with home.tsx
          // also calling this concurrently.
          await bootstrapUserRoutine(userId, goals, segments);
          dbPlan = await getUserRoutineSteps(userId, { skipCache: true });
        }

        // Seed today's checks from server completions.
        const todayComps = await getTodayCompletions(userId);
        if (todayComps.length > 0) {
          const todayKey = todayLabel();
          const seeded: Record<string, boolean> = {};
          for (const c of todayComps) seeded[c.step_id] = true;
          setChecks(prev => ({ ...prev, [todayKey]: { ...(prev[todayKey] || {}), ...seeded } }));
        }
      }

      if (!dbPlan) dbPlan = await fetchRoutineFromDB(goals, segments);
      setWeekPlan(dbPlan || buildWeekFallback());
    })();
  }, []);

  // Toggle a step done/undone. Today only (no rewriting past, no future).
  // Source of truth is Supabase routine_completions via markStepComplete.
  // Local `checks` is kept in sync for instant UI feedback. Falls back to
  // AsyncStorage-only when unauthenticated.
  const toggleStep = useCallback(async (day: string, stepId: string) => {
    if (day !== todayLabel()) return; // only today is interactive
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const dayChecks = { ...(checks[day] || {}) };
    const wasDone = !!dayChecks[stepId];
    dayChecks[stepId] = !wasDone;
    const updated = { ...checks, [day]: dayChecks };
    setChecks(updated);
    await AsyncStorage.setItem('tressie_checks', JSON.stringify(updated)).catch(() => {});

    // Persist to Supabase. markStepComplete also awards XP on insert.
    // routine_id comes from the step itself (carried through from
    // getUserRoutineSteps). Missing routine_id means we're on the
    // template/local fallback — local-only is fine.
    const step = weekPlan[day]?.steps.find(s => s.id === stepId);
    const routineId = step?.routine_id;
    const userId = await getCurrentUserId();

    if (userId && routineId) {
      await markStepComplete(userId, routineId, stepId, !wasDone);
    }
    // No XP toast here — the home screen is the celebratory surface.
    // Routine screen is the planner. Keeps the surfaces distinct.
  }, [checks, weekPlan]);

  const scrollToDay = useCallback((day: string) => {
    Haptics.selectionAsync().catch(() => {});
    const y = dayPositions.current[day];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: y - 16, animated: true });
    }
  }, []);

  const heroParagraph = buildHeroParagraph(quizData);
  const today = todayLabel();
  const todayI = todayIdx();

  return (
    <View style={st.container}>
      {/* ── Masthead ── */}
      <View style={[st.masthead, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={st.backBtn}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <IconBack />
        </Pressable>
        <Text style={st.mastheadTitle}>YOUR ROUTINE</Text>
        <View style={st.backBtn} /> {/* spacer to centre title */}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View entering={FadeIn.duration(400)} style={st.hero}>
          <Text style={st.heroTitle}>Across the week.</Text>
          <Text style={st.heroBody}>{heroParagraph}</Text>
        </Animated.View>

        {/* ── Week strip ── */}
        <Animated.View entering={FadeInUp.delay(80).duration(450)} style={st.weekStrip}>
          {DAYS.map((d, i) => {
            const isToday = d === today;
            const isPast = i < todayI;
            const isFuture = i > todayI;
            const plan = weekPlan[d];
            const dayChecks = checks[d] || {};
            const hasCompleted = plan?.steps.some(s => dayChecks[s.id]);
            return (
              <Pressable
                key={d}
                onPress={() => scrollToDay(d)}
                style={[
                  st.dayPill,
                  isToday && st.dayPillToday,
                  isPast && st.dayPillPast,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Scroll to ${DAYS_FULL[i]}`}
              >
                <Text style={[
                  st.dayPillText,
                  isToday && st.dayPillTextToday,
                  isPast && st.dayPillTextPast,
                ]}>{d}</Text>
                {hasCompleted && !isToday && <View style={st.dayDotPast} />}
                {isFuture && <View style={st.dayDotFuture} />}
              </Pressable>
            );
          })}
        </Animated.View>

        {/* ── Per-day sections ── */}
        {DAYS.map((d, dayIdx) => {
          const plan = weekPlan[d];
          if (!plan) return null;
          const isToday = d === today;
          const isPast = dayIdx < todayI;
          const dayChecks = checks[d] || {};
          const completedCount = plan.steps.filter(s => dayChecks[s.id]).length;

          return (
            <View
              key={d}
              onLayout={(e) => {
                dayPositions.current[d] = e.nativeEvent.layout.y;
              }}
              style={[
                st.daySection,
                isToday && st.daySectionToday,
              ]}
            >
              {/* Day header */}
              <View style={st.dayHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={st.dayLabel}>
                    {isToday ? 'TODAY' : DAYS_FULL[dayIdx].toUpperCase()}
                  </Text>
                  <Text style={st.dayTitle}>{plan.label}</Text>
                </View>
                {isToday && plan.steps.length > 0 && (
                  <View style={st.dayStat}>
                    <Text style={st.dayStatNum}>{completedCount}/{plan.steps.length}</Text>
                    <Text style={st.dayStatLabel}>done</Text>
                  </View>
                )}
              </View>

              {/* Steps */}
              <View style={st.stepList}>
                {plan.steps.map((step, idx) => {
                  const done = !!dayChecks[step.id];
                  const interactive = isToday;
                  const Container: any = interactive ? Pressable : View;

                  return (
                    <Container
                      key={step.id}
                      onPress={interactive ? () => toggleStep(d, step.id) : undefined}
                      style={[
                        st.stepRow,
                        done && st.stepRowDone,
                        !interactive && !isPast && st.stepRowFuture,
                      ]}
                      accessibilityRole={interactive ? 'checkbox' : undefined}
                      accessibilityState={interactive ? { checked: done } : undefined}
                      accessibilityLabel={interactive ? `${done ? 'Completed' : 'Mark complete'}: ${step.name}` : step.name}
                    >
                      <View style={[
                        st.stepNum,
                        done && st.stepNumDone,
                        !interactive && !isPast && st.stepNumFuture,
                      ]}>
                        {done ? (
                          <IconCheck />
                        ) : (
                          <Text style={[
                            st.stepNumText,
                            !interactive && !isPast && st.stepNumTextFuture,
                          ]}>{idx + 1}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          st.stepName,
                          done && st.stepNameDone,
                          !interactive && !isPast && st.stepNameFuture,
                        ]}>
                          {step.name}
                        </Text>
                        {step.desc ? (
                          <Text style={[
                            st.stepDesc,
                            done && st.stepDescDone,
                            !interactive && !isPast && st.stepDescFuture,
                          ]}>
                            {step.desc}
                          </Text>
                        ) : null}
                      </View>
                    </Container>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* ── Footer note ── */}
        <View style={st.footer}>
          <Text style={st.footerText}>
            Your routine adjusts as your hair changes. Step customisation — swap, skip, edit — is coming next.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  // Masthead
  masthead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.porcelain,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mastheadTitle: {
    flex: 1,
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    letterSpacing: 2.5,
    color: Colors.violet,
    textAlign: 'center',
  },

  scroll: { paddingHorizontal: 24, paddingBottom: 80 },

  // Hero
  hero: { marginBottom: 24, marginTop: 8 },
  heroTitle: {
    fontFamily: Fonts.heading,
    fontSize: 34,
    color: Colors.ink,
    letterSpacing: -1.2,
    lineHeight: 40,
    marginBottom: 10,
  },
  heroBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink,
    opacity: 0.66,
    maxWidth: 340,
  },

  // Week strip
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 24,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  dayPillToday: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
  },
  dayPillPast: {
    backgroundColor: 'rgba(118,67,172,0.06)',
    borderColor: 'rgba(118,67,172,0.10)',
  },
  dayPillText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.ink,
  },
  dayPillTextToday: {
    color: Colors.white,
  },
  dayPillTextPast: {
    color: Colors.muted,
  },
  dayDotPast: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8AB800',
  },
  dayDotFuture: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(118,67,172,0.18)',
  },

  // Day section
  daySection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  daySectionToday: {
    backgroundColor: 'rgba(118,67,172,0.04)',
    borderColor: 'rgba(118,67,172,0.18)',
  },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dayLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.violet,
    marginBottom: 4,
  },
  dayTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.ink,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  dayStat: {
    alignItems: 'flex-end',
  },
  dayStatNum: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: Colors.violet,
    letterSpacing: -0.5,
  },
  dayStatLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 0.6,
    color: Colors.muted,
  },

  // Steps
  stepList: { gap: 10 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  stepRowDone: {
    opacity: 0.7,
  },
  stepRowFuture: {
    opacity: 0.55,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(118,67,172,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumDone: {
    backgroundColor: Colors.violet,
  },
  stepNumFuture: {
    backgroundColor: 'rgba(51,36,99,0.04)',
  },
  stepNumText: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 12,
    color: Colors.violet,
  },
  stepNumTextFuture: {
    color: Colors.muted,
  },
  stepName: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 15,
    color: Colors.ink,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  stepNameDone: {
    textDecorationLine: 'line-through',
    color: Colors.muted,
  },
  stepNameFuture: {
    color: Colors.ink,
  },
  stepDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.muted,
    marginTop: 2,
  },
  stepDescDone: { opacity: 0.6 },
  stepDescFuture: {},

  // Footer
  footer: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  footerText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.muted,
    textAlign: 'center',
  },
});