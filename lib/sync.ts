// lib/sync.ts
// Syncs local quiz data to Supabase so it survives device switches and sign-outs.
// Call after quiz completion and on every app launch.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * Sync quiz results from AsyncStorage → Supabase user_hair_profiles.
 * Upserts so it works for both first save and updates.
 */
export async function syncQuizToSupabase(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const raw = await AsyncStorage.getItem('tressie_quiz');
    if (!raw) return false;

    const quiz = JSON.parse(raw);

    const { error } = await supabase
      .from('user_hair_profiles')
      .upsert({
        user_id: user.id,
        hair_type: quiz.hairType || null,
        curl_pattern: quiz.curl || null,
        porosity: quiz.porosity || null,
        scalp_conditions: quiz.scalp || [],
        hair_history: quiz.history || [],
        hair_goals: quiz.goals || [],
        segments: quiz.segments || ['natural'],
        quiz_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.log('Quiz sync error:', error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.log('Quiz sync failed:', e);
    return false;
  }
}

/**
 * Restore quiz data from Supabase → AsyncStorage.
 * Call on login / app launch when AsyncStorage is empty.
 * Handles device switches and reinstalls.
 */
export async function restoreQuizFromSupabase(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if local data already exists
    const local = await AsyncStorage.getItem('tressie_quiz');
    if (local) return false; // Already have local data, skip

    const { data, error } = await supabase
      .from('user_hair_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data || !data.hair_type) return false;

    const quizResults = {
      hairType: data.hair_type,
      curl: data.curl_pattern,
      subtype: data.hair_type,
      porosity: data.porosity || 'unsure',
      scalp: data.scalp_conditions || [],
      history: data.hair_history || [],
      goals: data.hair_goals || [],
      segments: data.segments || ['natural'],
    };

    await AsyncStorage.setItem('tressie_quiz', JSON.stringify(quizResults));
    return true;
  } catch (e) {
    console.log('Quiz restore failed:', e);
    return false;
  }
}

/**
 * Full sync: restore from cloud if local is empty, then push local to cloud.
 * Call on app launch after auth check.
 */
export async function fullSync(): Promise<void> {
  await restoreQuizFromSupabase();
  await syncQuizToSupabase();
}
