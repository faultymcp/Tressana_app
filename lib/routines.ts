// lib/routines.ts
// Builds personalised weekly routines from routine_templates
// based on user's goals and segments (braids, extensions, transplant, etc.)
//
// This file has two layers:
//
//   1. TEMPLATE LAYER (original)
//      - fetchRoutineFromDB() / fetchExtrasFromDB()
//      - Reads directly from routine_templates and builds a weekly plan in memory.
//      - No user-owned rows. Pure read.
//
//   2. USER LAYER (added for customisation)
//      - bootstrapUserRoutine() / getUserRoutineSteps() / markStepComplete() / ...
//      - Copies relevant routine_templates rows into per-user user_routine_steps
//        so the user can edit, skip, add custom steps, and track completions.
//      - Writes to: user_routines, user_routine_steps, routine_completions.
//      - AsyncStorage write-through cache for instant reads + offline support.
//      - Graceful: every function falls back silently if the user is not
//        authenticated or Supabase is unreachable.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { awardXp } from './xp';

export type RoutineStep = {
  id: string;
  name: string;
  desc: string;
  frequency: string;
  xp: number;
  pro_tip?: string;
  recommended_categories?: string[];
  // Populated when the step comes from the user layer (getUserRoutineSteps).
  // Needed so the UI can call markStepComplete(userId, routine_id, step_id).
  // Optional because the template layer (fetchRoutineFromDB) doesn't have it.
  routine_id?: string;
};

export type DayPlan = {
  label: string;
  steps: RoutineStep[];
};

export type WeekPlan = Record<string, DayPlan>;

// ── Frequency → day mapping ──────────────────────────────────────
// Maps routine_templates.frequency to which days of the week they appear
const FREQ_DAYS: Record<string, string[]> = {
  daily: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  every_other_day: ['Mon', 'Wed', 'Fri', 'Sun'],
  twice_weekly: ['Tue', 'Fri'],
  weekly: ['Sat'],
  biweekly: ['Sat'], // show every week, but mark as biweekly in description
  monthly: ['Sat'],  // show on Sat, but only first week
  as_needed: [],     // shown in "extras" section, not scheduled
};

const DAY_LABELS: Record<string, Record<string, string>> = {
  Mon: { daily: 'Maintain', weekly: 'Maintain' },
  Tue: { daily: 'Maintain', weekly: 'Maintain' },
  Wed: { daily: 'Mid-week care', weekly: 'Mid-week care' },
  Thu: { daily: 'Maintain', weekly: 'Maintain' },
  Fri: { daily: 'Pre-wash prep', weekly: 'Pre-wash prep' },
  Sat: { daily: 'Wash day', weekly: 'Wash day' },
  Sun: { daily: 'Rest day', weekly: 'Rest & style' },
};

/**
 * Fetch personalised routine from Supabase routine_templates
 * based on user's goals and segments.
 *
 * Falls back to null if tables don't exist or no templates found.
 */
export async function fetchRoutineFromDB(
  goals: string[],
  segments: string[],
): Promise<WeekPlan | null> {
  try {
    if (!goals || goals.length === 0) return null;

    // Map quiz goal keys to database goal enum values
    const goalMap: Record<string, string> = {
      moisture: 'retain_moisture',
      growth: 'grow_hair',
      definition: 'define_curls',
      frizz: 'reduce_breakage',
      scalp_goal: 'scalp_health',
      damage: 'heat_damage_recovery',
      // Direct matches
      grow_hair: 'grow_hair',
      retain_moisture: 'retain_moisture',
      reduce_breakage: 'reduce_breakage',
      scalp_health: 'scalp_health',
      define_curls: 'define_curls',
      protective_styling: 'protective_styling',
      heat_damage_recovery: 'heat_damage_recovery',
      transplant_recovery: 'transplant_recovery',
      postpartum_recovery: 'postpartum_recovery',
      transition_natural: 'transition_natural',
      maintain_colour: 'maintain_colour',
      thicken_hair: 'thicken_hair',
    };

    const dbGoals = goals.map(g => goalMap[g] || g).filter(Boolean);
    if (dbGoals.length === 0) return null;

    // Fetch templates matching user's goals
    // Get both general (segment=null) and segment-specific templates
    const { data: templates, error } = await supabase
      .from('routine_templates')
      .select('*')
      .in('goal', dbGoals)
      .order('goal')
      .order('step_order');

    if (error || !templates || templates.length === 0) return null;

    // Filter: keep general templates (segment=null) and segment-specific ones
    const relevant = templates.filter(t => {
      if (!t.segment) return true; // General template, always include
      return segments.includes(t.segment); // Only include if user has this segment
    });

    // Deduplicate: if a segment-specific template exists for the same goal+step_order,
    // prefer it over the general one
    const deduped: typeof relevant = [];
    const seen = new Set<string>();

    // First pass: add segment-specific
    for (const t of relevant) {
      if (t.segment) {
        const key = `${t.goal}-${t.step_order}`;
        seen.add(key);
        deduped.push(t);
      }
    }
    // Second pass: add general where no segment-specific exists
    for (const t of relevant) {
      if (!t.segment) {
        const key = `${t.goal}-${t.step_order}`;
        if (!seen.has(key)) {
          deduped.push(t);
        }
      }
    }

    if (deduped.length === 0) return null;

    // Build weekly plan
    const week: WeekPlan = {};
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (const day of DAYS) {
      const daySteps: RoutineStep[] = [];

      for (const template of deduped) {
        const freq = template.frequency as string;
        const scheduledDays = FREQ_DAYS[freq] || [];

        if (scheduledDays.includes(day)) {
          daySteps.push({
            id: template.id,
            name: template.step_name,
            desc: template.step_description || '',
            frequency: freq,
            xp: 10,
            pro_tip: template.pro_tip,
            recommended_categories: template.recommended_categories,
          });
        }
      }

      // Always add night protection on every day
      if (!daySteps.find(s => s.name.toLowerCase().includes('night') || s.name.toLowerCase().includes('satin') || s.name.toLowerCase().includes('bonnet'))) {
        daySteps.push({
          id: `protect-${day}`,
          name: 'Night protection',
          desc: 'Satin bonnet or pillowcase to protect hair while sleeping',
          frequency: 'daily',
          xp: 10,
        });
      }

      const label = daySteps.length > 3 ? 'Wash day'
        : daySteps.length > 1 ? DAY_LABELS[day]?.daily || 'Maintain'
        : 'Rest day';

      week[day] = { label, steps: daySteps };
    }

    return week;
  } catch (e) {
    console.log('Failed to fetch routines from DB:', e);
    return null;
  }
}

/**
 * Get the "as needed" steps (not scheduled to specific days)
 * These show in a separate section like "Extras" or "When needed"
 */
export async function fetchExtrasFromDB(goals: string[], segments: string[]): Promise<RoutineStep[]> {
  try {
    const goalMap: Record<string, string> = {
      moisture: 'retain_moisture', growth: 'grow_hair', definition: 'define_curls',
      frizz: 'reduce_breakage', scalp_goal: 'scalp_health', damage: 'heat_damage_recovery',
    };

    const dbGoals = goals.map(g => goalMap[g] || g).filter(Boolean);
    if (dbGoals.length === 0) return [];

    const { data, error } = await supabase
      .from('routine_templates')
      .select('*')
      .in('goal', dbGoals)
      .eq('frequency', 'as_needed')
      .order('step_order');

    if (error || !data) return [];

    return data
      .filter(t => !t.segment || segments.includes(t.segment))
      .map(t => ({
        id: t.id,
        name: t.step_name,
        desc: t.step_description || '',
        frequency: 'as_needed',
        xp: 10,
        pro_tip: t.pro_tip,
      }));
  } catch (e) {
    return [];
  }
}
// ════════════════════════════════════════════════════════════════════
// USER LAYER — per-user routine instances, customisation, completions
// ════════════════════════════════════════════════════════════════════

// ── Goal key normaliser (shared between bootstrap + caches) ─────────
// Quiz emits short keys (moisture, growth, ...); DB uses long enum
// values (retain_moisture, grow_hair, ...). Single source of truth.
const GOAL_MAP: Record<string, string> = {
  moisture: 'retain_moisture',
  growth: 'grow_hair',
  definition: 'define_curls',
  frizz: 'reduce_breakage',
  scalp_goal: 'scalp_health',
  damage: 'heat_damage_recovery',
  grow_hair: 'grow_hair',
  retain_moisture: 'retain_moisture',
  reduce_breakage: 'reduce_breakage',
  scalp_health: 'scalp_health',
  define_curls: 'define_curls',
  protective_styling: 'protective_styling',
  heat_damage_recovery: 'heat_damage_recovery',
  transplant_recovery: 'transplant_recovery',
  postpartum_recovery: 'postpartum_recovery',
  transition_natural: 'transition_natural',
  maintain_colour: 'maintain_colour',
  thicken_hair: 'thicken_hair',
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function normaliseGoals(goals: string[]): string[] {
  return (goals || []).map(g => GOAL_MAP[g] || g).filter(Boolean);
}

function todayISO(): string {
  // YYYY-MM-DD in local time (matches how user thinks about "today").
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateNDaysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Cache keys ──────────────────────────────────────────────────────
// Per-user cache so multiple test accounts on one device don't collide.
const CACHE_WEEK = (userId: string) => `tressana_user_routine_v1:${userId}`;
const CACHE_COMPLETIONS_TODAY = (userId: string) => `tressana_completions_today_v1:${userId}`;
const CACHE_COMPLETIONS_WEEK = (userId: string) => `tressana_completions_week_v1:${userId}`;

// ── Types for the user layer ────────────────────────────────────────
export type UserRoutineStep = RoutineStep & {
  routine_id: string;   // user_routines.id this step belongs to
  goal: string;          // db enum, useful for grouping later
  step_order: number;
  is_custom: boolean;    // true when template_step_id is null
  active: boolean;       // currently always true; will be backed by an
                         // is_active column on user_routine_steps when
                         // the skip/remove UI ships next session.
};

export type CompletionRecord = {
  routine_id: string;
  step_id: string;
  completed_at: string;  // ISO date YYYY-MM-DD
};

// ════════════════════════════════════════════════════════════════════
// bootstrapUserRoutine
// ════════════════════════════════════════════════════════════════════
//
// Idempotent. For each goal in `goals`:
//   1. Ensure a row in `user_routines` exists for (user_id, goal).
//   2. If user_routine_steps is empty for that routine, copy the
//      relevant routine_templates rows (matched by goal + segments)
//      into user_routine_steps.
//   3. Also insert a single "Night protection" custom step (daily,
//      template_step_id = null) per routine — but only into the FIRST
//      bootstrapped routine to avoid duplicating it across goals.
//
// Returns true on success, false on auth/db failure. Never throws.
//
// NOTE on schema assumptions (from session handoff doc — please verify
// against your actual Supabase tables when wiring this in):
//   user_routines:        (id PK, user_id FK, goal, active, created_at)
//   user_routine_steps:   (id PK, user_routine_id FK, template_step_id
//                          nullable FK, step_order, step_name,
//                          step_description, frequency, pro_tip,
//                          recommended_categories, active, created_at)
// If column names differ, Supabase will return a clear error and only
// this function needs patching.
//
export async function bootstrapUserRoutine(
  userId: string,
  goals: string[],
  segments: string[],
): Promise<boolean> {
  try {
    if (!userId) return false;
    const dbGoals = normaliseGoals(goals);
    if (dbGoals.length === 0) return false;

    // Check which user_routines already exist for this user.
    const { data: existing, error: existingErr } = await supabase
      .from('user_routines')
      .select('id, goal')
      .eq('user_id', userId)
      .in('goal', dbGoals);

    if (existingErr) {
      console.log('bootstrapUserRoutine: existing read failed:', existingErr.message);
      return false;
    }

    const existingGoals = new Set((existing || []).map(r => r.goal));
    const goalsToCreate = dbGoals.filter(g => !existingGoals.has(g));

    // Insert new user_routines rows for goals that don't have one yet.
    let createdRoutines: { id: string; goal: string }[] = [];
    if (goalsToCreate.length > 0) {
      const rowsToInsert = goalsToCreate.map(g => ({
        user_id: userId,
        goal: g,
        is_active: true,
      }));
      const { data: inserted, error: insErr } = await supabase
        .from('user_routines')
        .insert(rowsToInsert)
        .select('id, goal');

      if (insErr) {
        console.log('bootstrapUserRoutine: insert user_routines failed:', insErr.message);
        return false;
      }
      createdRoutines = inserted || [];
    }

    // Full set of routines we need to populate steps for.
    const allRoutines = [...(existing || []), ...createdRoutines];

    // Fetch all relevant routine_templates in one query.
    const { data: templates, error: tplErr } = await supabase
      .from('routine_templates')
      .select('*')
      .in('goal', dbGoals)
      .order('goal')
      .order('step_order');

    if (tplErr) {
      console.log('bootstrapUserRoutine: templates read failed:', tplErr.message);
      return false;
    }

    // Filter by segment: keep general (segment=null) + matching segment rows.
    const segSet = new Set(segments || ['natural']);
    const relevant = (templates || []).filter(t => !t.segment || segSet.has(t.segment));

    // Dedupe: segment-specific overrides general for same goal+step_order.
    const dedupedByGoal: Record<string, any[]> = {};
    for (const goal of dbGoals) {
      const forGoal = relevant.filter(t => t.goal === goal);
      const seen = new Set<number>();
      const out: any[] = [];
      for (const t of forGoal) {
        if (t.segment) {
          seen.add(t.step_order);
          out.push(t);
        }
      }
      for (const t of forGoal) {
        if (!t.segment && !seen.has(t.step_order)) out.push(t);
      }
      dedupedByGoal[goal] = out;
    }

    // For each routine, only insert steps if it currently has none.
    // (idempotent on re-call — won't duplicate.)
    let firstRoutineGotNightProtection = false;
    for (const routine of allRoutines) {
      const { count, error: countErr } = await supabase
        .from('user_routine_steps')
        .select('id', { count: 'exact', head: true })
        .eq('routine_id', routine.id);

      if (countErr) {
        console.log('bootstrapUserRoutine: step count failed:', countErr.message);
        continue;
      }
      if ((count ?? 0) > 0) continue; // Already populated, skip.

      const tplRows = dedupedByGoal[routine.goal] || [];
      // Note: pro_tip and recommended_categories live on routine_templates,
      // NOT on user_routine_steps. We read them via template_step_id join
      // in getUserRoutineSteps. Custom steps (template_step_id=null) won't
      // have a pro_tip, which is correct.
      const stepRows = tplRows.map(t => ({
        routine_id: routine.id,
        template_step_id: t.id,
        step_order: t.step_order,
        step_name: t.step_name,
        step_description: t.step_description || '',
        frequency: t.frequency,
      }));

      // Add Night protection as a real custom step ONCE across all routines.
      // (template_step_id = null marks it as user-created, not from a template.)
      if (!firstRoutineGotNightProtection) {
        stepRows.push({
          routine_id: routine.id,
          template_step_id: null as any,
          step_order: 999,
          step_name: 'Night protection',
          step_description: 'Satin bonnet or pillowcase to protect hair while sleeping',
          frequency: 'daily',
        });
        firstRoutineGotNightProtection = true;
      }

      if (stepRows.length > 0) {
        const { error: stepInsErr } = await supabase
          .from('user_routine_steps')
          .insert(stepRows);
        if (stepInsErr) {
          console.log('bootstrapUserRoutine: insert steps failed:', stepInsErr.message);
          // Don't bail entire bootstrap — other routines may still succeed.
        }
      }
    }

    // Invalidate cache so the next read pulls fresh.
    await AsyncStorage.removeItem(CACHE_WEEK(userId)).catch(() => {});
    return true;
  } catch (e) {
    console.log('bootstrapUserRoutine threw:', e);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// getUserRoutineSteps
// ════════════════════════════════════════════════════════════════════
//
// Reads all active user_routines for the user, joins their active
// user_routine_steps, fans them out into a WeekPlan in the same shape
// the home/routine screens already consume.
//
// Multi-goal merge strategy: collect every step across every routine,
// dedupe by step_name (case-insensitive) so two goals don't both add
// "Hydrate scalp", then fan out by frequency the same way the template
// layer does.
//
// Uses AsyncStorage write-through cache: returns cached value
// immediately if present, then refreshes from DB and updates cache.
// Callers that want guaranteed-fresh data can pass { skipCache: true }.
//
export async function getUserRoutineSteps(
  userId: string,
  opts: { skipCache?: boolean } = {},
): Promise<WeekPlan | null> {
  try {
    if (!userId) return null;

    // Cache read (fast path).
    if (!opts.skipCache) {
      const cached = await AsyncStorage.getItem(CACHE_WEEK(userId)).catch(() => null);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as WeekPlan;
          // Kick off a background refresh, don't await.
          getUserRoutineSteps(userId, { skipCache: true }).catch(() => {});
          return parsed;
        } catch {
          // fall through to fresh read
        }
      }
    }

    // Fresh read: join user_routines → user_routine_steps → routine_templates.
    // The nested template join pulls pro_tip and recommended_categories,
    // which live on the template, not on the user step copy.
    const { data: routines, error: rErr } = await supabase
      .from('user_routines')
      .select(`
        id,
        goal,
        is_active,
        user_routine_steps (
          id,
          step_name,
          step_description,
          step_order,
          frequency,
          template_step_id,
          routine_templates:template_step_id (
            pro_tip,
            recommended_categories
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (rErr) {
      console.log('getUserRoutineSteps: read failed:', rErr.message);
      return null;
    }
    if (!routines || routines.length === 0) return null;

    // Flatten into UserRoutineStep array.
    const allSteps: UserRoutineStep[] = [];
    for (const r of routines as any[]) {
      const stepRows = (r.user_routine_steps || []) as any[];
      for (const s of stepRows) {
        // No is_active column on user_routine_steps yet — skip filter.
        // (Add this when the skip/remove customisation UI ships next session.)
        const tpl = s.routine_templates || null;
        allSteps.push({
          id: s.id,
          name: s.step_name,
          desc: s.step_description || '',
          frequency: s.frequency,
          xp: 10,
          pro_tip: tpl?.pro_tip || undefined,
          recommended_categories: tpl?.recommended_categories || undefined,
          routine_id: r.id,
          goal: r.goal,
          step_order: s.step_order,
          is_custom: s.template_step_id == null,
          active: true,
        });
      }
    }

    // Dedupe by lowercase step_name — keep the first one encountered
    // (which, after sorting below, will be the lowest step_order).
    allSteps.sort((a, b) => a.step_order - b.step_order);
    const seenNames = new Set<string>();
    const uniqueSteps = allSteps.filter(s => {
      const key = s.name.trim().toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    // Fan out by frequency.
    const week: WeekPlan = {};
    for (const day of DAYS_OF_WEEK) {
      const daySteps: RoutineStep[] = [];
      for (const s of uniqueSteps) {
        const scheduled = FREQ_DAYS[s.frequency] || [];
        if (scheduled.includes(day)) {
          // Note: id is the user_routine_steps.id (real DB id), not the
          // template id. Completions reference this id.
          daySteps.push({
            id: s.id,
            name: s.name,
            desc: s.desc,
            frequency: s.frequency,
            xp: s.xp,
            pro_tip: s.pro_tip,
            recommended_categories: s.recommended_categories,
            routine_id: s.routine_id,
          });
        }
      }
      // Label by the day's identity, not by step count. Wash day is
      // wherever the weekly/biweekly wash steps land (Sat by FREQ_DAYS).
      // Other days use their DAY_LABELS name; empty days are rest days.
      const hasWashStep = daySteps.some(s =>
        s.frequency === 'weekly' || s.frequency === 'biweekly');
      const label = daySteps.length === 0 ? 'Rest day'
        : hasWashStep ? (DAY_LABELS[day]?.weekly || 'Wash day')
        : (DAY_LABELS[day]?.daily || 'Maintain');
      week[day] = { label, steps: daySteps };
    }

    // Write-through cache.
    await AsyncStorage.setItem(CACHE_WEEK(userId), JSON.stringify(week)).catch(() => {});
    return week;
  } catch (e) {
    console.log('getUserRoutineSteps threw:', e);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// markStepComplete
// ════════════════════════════════════════════════════════════════════
//
// Toggle completion for a step on a given date (default: today).
// - completed = true  → insert routine_completions row (or do nothing
//                       if already present for that date). Awards XP
//                       via the 'complete_routine_step' action, but
//                       only if no XP has already been awarded for this
//                       (user, step, day) — see dedup note below.
// - completed = false → delete the routine_completions row for that
//                       step on that date. (Does NOT refund XP — the
//                       xp_ledger is append-only. If a user unchecks-
//                       then-rechecks, no new XP is awarded because
//                       our app-side dedup catches it.)
//
// Dedup note: the award_xp DB function does NOT dedup by reference_id;
// it only enforces a daily_cap on row count. So this function checks
// xp_ledger itself for a same-day same-step row before awarding.
//
// Returns: number of XP awarded by this call (0 if uncheck, already-
// awarded-today, daily-capped, or auth failure). Returns -1 on DB
// error so callers can distinguish "no XP awarded" from "toggle failed".
//
// All three NOT NULL ids (user_id, routine_id, step_id) are supplied.
//
export async function markStepComplete(
  userId: string,
  routineId: string,
  stepId: string,
  completed: boolean,
  dateISO?: string,
): Promise<number> {
  try {
    if (!userId || !routineId || !stepId) return -1;
    const dateStr = dateISO || todayISO();

    if (completed) {
      // Idempotent insert: check first, then insert if absent.
      // (Avoids relying on a unique constraint that may or may not exist.)
      const { data: existing, error: chkErr } = await supabase
        .from('routine_completions')
        .select('id')
        .eq('user_id', userId)
        .eq('routine_id', routineId)
        .eq('step_id', stepId)
        .gte('completed_at', `${dateStr}T00:00:00`)
        .lte('completed_at', `${dateStr}T23:59:59`)
        .limit(1);

      if (chkErr) {
        console.log('markStepComplete: check failed:', chkErr.message);
        return -1;
      }
      if (existing && existing.length > 0) {
        return 0; // already complete, no new XP
      }

      const { error: insErr } = await supabase
        .from('routine_completions')
        .insert({
          user_id: userId,
          routine_id: routineId,
          step_id: stepId,
          completed_at: new Date().toISOString(),
        });
      if (insErr) {
        console.log('markStepComplete: insert failed:', insErr.message);
        return -1;
      }

      // Award XP — but first dedup ourselves.
      //
      // Important: award_xp (the DB function) does NOT dedup by reference_id.
      // It only enforces a daily_cap on row count. Without our own check,
      // toggling a step on → off → on would award XP twice (consuming
      // the daily cap). p_reference_id is also typed `uuid`, so the
      // raw stepId goes in unchanged — no composite keys.
      //
      // Dedup rule: one XP award per (user, step, day). Implemented by
      // checking xp_ledger for an existing row with this reference_id
      // dated today before calling award_xp.
      let xp = 0;
      const dayStart = `${dateStr}T00:00:00`;
      const dayEnd = `${dateStr}T23:59:59`;
      const { data: priorLedger, error: ledgerErr } = await supabase
        .from('xp_ledger')
        .select('id')
        .eq('user_id', userId)
        .eq('action', 'complete_routine_step')
        .eq('reference_id', stepId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .limit(1);

      if (ledgerErr) {
        // Ledger read failed — log but don't fail the toggle. Worst case
        // is we skip XP award; the completion row is still saved.
        console.log('markStepComplete: ledger check failed:', ledgerErr.message);
      } else if (!priorLedger || priorLedger.length === 0) {
        xp = await awardXp('complete_routine_step', stepId, 'Completed routine step');
      }
      // else: already awarded today, xp stays 0.

      // Invalidate completion caches so next read is fresh.
      await AsyncStorage.removeItem(CACHE_COMPLETIONS_TODAY(userId)).catch(() => {});
      await AsyncStorage.removeItem(CACHE_COMPLETIONS_WEEK(userId)).catch(() => {});
      return xp;
    } else {
      const { error: delErr } = await supabase
        .from('routine_completions')
        .delete()
        .eq('user_id', userId)
        .eq('routine_id', routineId)
        .eq('step_id', stepId)
        .gte('completed_at', `${dateStr}T00:00:00`)
        .lte('completed_at', `${dateStr}T23:59:59`);
      if (delErr) {
        console.log('markStepComplete: delete failed:', delErr.message);
        return -1;
      }

      // Invalidate completion caches so next read is fresh.
      await AsyncStorage.removeItem(CACHE_COMPLETIONS_TODAY(userId)).catch(() => {});
      await AsyncStorage.removeItem(CACHE_COMPLETIONS_WEEK(userId)).catch(() => {});
      return 0;
    }
  } catch (e) {
    console.log('markStepComplete threw:', e);
    return -1;
  }
}

// ════════════════════════════════════════════════════════════════════
// getTodayCompletions
// ════════════════════════════════════════════════════════════════════
//
// Reads all routine_completions for the user from today (local date).
// Returns an array of CompletionRecord (small, cheap to cache).
//
export async function getTodayCompletions(
  userId: string,
  opts: { skipCache?: boolean } = {},
): Promise<CompletionRecord[]> {
  try {
    if (!userId) return [];

    if (!opts.skipCache) {
      const cached = await AsyncStorage.getItem(CACHE_COMPLETIONS_TODAY(userId)).catch(() => null);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { date: string; rows: CompletionRecord[] };
          if (parsed.date === todayISO()) {
            getTodayCompletions(userId, { skipCache: true }).catch(() => {});
            return parsed.rows;
          }
          // Stale day → fall through to fresh read.
        } catch {
          // fall through
        }
      }
    }

    const dateStr = todayISO();
    const { data, error } = await supabase
      .from('routine_completions')
      .select('routine_id, step_id, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', `${dateStr}T00:00:00`)
      .lte('completed_at', `${dateStr}T23:59:59`);

    if (error) {
      console.log('getTodayCompletions: read failed:', error.message);
      return [];
    }

    const rows: CompletionRecord[] = (data || []).map(r => ({
      routine_id: r.routine_id,
      step_id: r.step_id,
      completed_at: dateStr,
    }));

    await AsyncStorage.setItem(
      CACHE_COMPLETIONS_TODAY(userId),
      JSON.stringify({ date: dateStr, rows }),
    ).catch(() => {});
    return rows;
  } catch (e) {
    console.log('getTodayCompletions threw:', e);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════
// getWeekCompletions
// ════════════════════════════════════════════════════════════════════
//
// Reads routine_completions for the last 7 days (inclusive of today).
// Returns CompletionRecord[] with completed_at as YYYY-MM-DD.
//
export async function getWeekCompletions(
  userId: string,
  opts: { skipCache?: boolean } = {},
): Promise<CompletionRecord[]> {
  try {
    if (!userId) return [];

    const fromDate = dateNDaysAgoISO(6);
    const toDate = todayISO();
    const windowKey = `${fromDate}_${toDate}`;

    if (!opts.skipCache) {
      const cached = await AsyncStorage.getItem(CACHE_COMPLETIONS_WEEK(userId)).catch(() => null);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { window: string; rows: CompletionRecord[] };
          if (parsed.window === windowKey) {
            getWeekCompletions(userId, { skipCache: true }).catch(() => {});
            return parsed.rows;
          }
        } catch {
          // fall through
        }
      }
    }

    const { data, error } = await supabase
      .from('routine_completions')
      .select('routine_id, step_id, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', `${fromDate}T00:00:00`)
      .lte('completed_at', `${toDate}T23:59:59`);

    if (error) {
      console.log('getWeekCompletions: read failed:', error.message);
      return [];
    }

    const rows: CompletionRecord[] = (data || []).map(r => ({
      routine_id: r.routine_id,
      step_id: r.step_id,
      // Truncate timestamp to YYYY-MM-DD.
      completed_at: typeof r.completed_at === 'string'
        ? r.completed_at.slice(0, 10)
        : new Date(r.completed_at).toISOString().slice(0, 10),
    }));

    await AsyncStorage.setItem(
      CACHE_COMPLETIONS_WEEK(userId),
      JSON.stringify({ window: windowKey, rows }),
    ).catch(() => {});
    return rows;
  } catch (e) {
    console.log('getWeekCompletions threw:', e);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════
// getCurrentUserId — small helper, used by screens
// ════════════════════════════════════════════════════════════════════
//
// Returns the current authenticated user id, or null if not signed in.
// Centralised so callers don't have to repeat the supabase.auth.getUser()
// boilerplate (and so we can swap auth providers later in one place).
//
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}