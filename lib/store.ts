// lib/store.ts
// Global state store using Zustand.
// Install: npx expo install zustand
//
// Usage in any screen:
//   import { useUserStore } from '@/lib/store';
//   const { xp, wallet, tier, streak, refresh } = useUserStore();

import { create } from 'zustand';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserState = {
  // Auth
  userId: string | null;
  email: string;
  name: string;

  // Hair profile (from AsyncStorage + Supabase)
  hairType: string;
  porosity: string;
  goals: string[];
  segments: string[];

  // Stats
  xp: number;
  streak: number;
  totalEarned: number;
  walletPence: number;
  tier: 'free' | 'pro' | 'pro_plus';

  // Counts
  totalFavourites: number;
  upcomingBookings: number;

  // Loading
  loaded: boolean;
  refreshing: boolean;

  // Actions
  refresh: () => Promise<void>;
  setXp: (xp: number) => void;
  addXp: (amount: number) => void;
  setWallet: (pence: number) => void;
};

export const useUserStore = create<UserState>((set, get) => ({
  userId: null,
  email: '',
  name: 'User',
  hairType: '',
  porosity: '',
  goals: [],
  segments: ['natural'],
  xp: 0,
  streak: 0,
  totalEarned: 0,
  walletPence: 0,
  tier: 'free',
  totalFavourites: 0,
  upcomingBookings: 0,
  loaded: false,
  refreshing: false,

  setXp: (xp: number) => set({ xp }),
  addXp: (amount: number) => set(s => ({ xp: s.xp + amount, totalEarned: s.totalEarned + amount })),
  setWallet: (pence: number) => set({ walletPence: pence }),

  refresh: async () => {
    if (get().refreshing) return;
    set({ refreshing: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loaded: true, refreshing: false, userId: null });
        return;
      }

      // Auth info
      const email = user.email || '';
      const name = user.user_metadata?.full_name || email.split('@')[0] || 'User';

      // Quiz data from AsyncStorage
      let hairType = '', porosity = '', goals: string[] = [], segments: string[] = ['natural'];
      try {
        const raw = await AsyncStorage.getItem('tressie_quiz');
        if (raw) {
          const q = JSON.parse(raw);
          hairType = q.hairType || '';
          porosity = q.porosity || '';
          goals = q.goals || [];
          segments = q.segments || ['natural'];
        }
      } catch (e) {}

      // Parallel Supabase fetches — each individually caught
      let xp = 0, streak = 0, totalEarned = 0, walletPence = 0;
      let tier: 'free' | 'pro' | 'pro_plus' = 'free';
      let totalFavourites = 0, upcomingBookings = 0;

      try {
        const { data } = await supabase.from('xp_balances').select('current_balance, current_daily_streak, total_earned').eq('user_id', user.id).maybeSingle();
        if (data) { xp = data.current_balance || 0; streak = data.current_daily_streak || 0; totalEarned = data.total_earned || 0; }
      } catch (e) {}

      try {
        const { data } = await supabase.from('wallet_balances').select('balance_pence').eq('user_id', user.id).maybeSingle();
        if (data) walletPence = data.balance_pence || 0;
      } catch (e) {}

      try {
        const { data } = await supabase.from('user_subscriptions').select('tier').eq('user_id', user.id).maybeSingle();
        if (data) tier = (data.tier || 'free') as any;
      } catch (e) {}

      try {
        const { count } = await supabase.from('favourites').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
        totalFavourites = count || 0;
      } catch (e) {}

      try {
        const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'confirmed').gte('appointment_date', new Date().toISOString().split('T')[0]);
        upcomingBookings = count || 0;
      } catch (e) {}

      set({
        userId: user.id, email, name,
        hairType, porosity, goals, segments,
        xp, streak, totalEarned, walletPence, tier,
        totalFavourites, upcomingBookings,
        loaded: true, refreshing: false,
      });
    } catch (e) {
      console.log('Store refresh error:', e);
      set({ loaded: true, refreshing: false });
    }
  },
}));
