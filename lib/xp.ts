// lib/xp.ts
// Handles all XP operations — awarding, streak tracking, balance checks

import { supabase } from './supabase';

/**
 * Award XP for a specific action.
 * Calls the award_xp database function which handles caps and deduplication.
 * Returns the XP earned (0 if capped).
 */
export async function awardXp(
  action: 'daily_login' | 'complete_routine_step' | 'complete_full_routine' | 'ai_try_on' | 'rate_product' | 'referral_converted' | 'complete_quiz' | 'weekly_streak' | 'monthly_streak' | 'bonus',
  referenceId?: string,
  description?: string,
  overrideAmount?: number,
): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_action: action,
      p_reference_id: referenceId || null,
      p_description: description || null,
      p_override_amount: overrideAmount || null,
    });

    if (error) {
      console.log('XP award error:', error.message);
      return 0;
    }

    return data || 0;
  } catch (e) {
    console.log('XP award failed:', e);
    return 0;
  }
}

/**
 * Update the user's daily streak.
 * Call this once per day on first app open.
 */
export async function updateStreak(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('update_streak', { p_user_id: user.id });
  } catch (e) {
    console.log('Streak update failed:', e);
  }
}

/**
 * Award daily login XP + update streak.
 * Call once per session (guard with AsyncStorage timestamp).
 */
export async function handleDailyLogin(): Promise<number> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = await AsyncStorage.getItem('tressana_last_login_xp');

    if (lastLogin === today) return 0; // Already awarded today

    const xp = await awardXp('daily_login', undefined, 'Daily app open');
    await updateStreak();
    await AsyncStorage.setItem('tressana_last_login_xp', today);
    return xp;
  } catch (e) {
    console.log('Daily login XP failed:', e);
    return 0;
  }
}

/**
 * Get current XP balance and streak.
 */
export async function getXpStatus(): Promise<{ balance: number; streak: number; totalEarned: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { balance: 0, streak: 0, totalEarned: 0 };

    const { data } = await supabase
      .from('xp_balances')
      .select('current_balance, current_daily_streak, total_earned')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      balance: data?.current_balance || 0,
      streak: data?.current_daily_streak || 0,
      totalEarned: data?.total_earned || 0,
    };
  } catch (e) {
    return { balance: 0, streak: 0, totalEarned: 0 };
  }
}