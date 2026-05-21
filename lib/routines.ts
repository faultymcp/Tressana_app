// lib/routines.ts
// Builds personalised weekly routines from routine_templates
// based on user's goals and segments (braids, extensions, transplant, etc.)

import { supabase } from './supabase';

export type RoutineStep = {
  id: string;
  name: string;
  desc: string;
  frequency: string;
  xp: number;
  pro_tip?: string;
  recommended_categories?: string[];
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