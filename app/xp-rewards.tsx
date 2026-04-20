import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { redeemXpForDiscount, redeemXpForTryOns, getXpRedemptionRates } from '@/lib/payments';
import Animated, { FadeInUp } from 'react-native-reanimated';

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Flame: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill={Colors.violet} stroke="none"><Path d="M12 2c1 4-2 6-2 10a4 4 0 008 0c0-2-1-3-2-4 0 2-1 3-2 3s-2-1-2-3c0-1 .5-2 1-3-1 0-1.5 1-1.5 1S10 4 12 2z" /></Svg>,
  Zap: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.8} strokeLinecap="round"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg>,
  Gift: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M20 12v10H4V12" /><Path d="M2 7h20v5H2z" /><Path d="M12 22V7" /><Path d="M12 7H7.5a2.5 2.5 0 010-5C11 3 12 7 12 7z" /><Path d="M12 7h4.5a2.5 2.5 0 000-5C13 3 12 7 12 7z" /></Svg>,
  Camera: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><Circle cx="12" cy="13" r="4" /></Svg>,
  Tag: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><Circle cx="7" cy="7" r="1" fill={Colors.violet} /></Svg>,
};

const ACTION_LABELS: Record<string, string> = {
  daily_login: 'Daily login',
  complete_routine_step: 'Routine step',
  complete_full_routine: 'Full routine bonus',
  ai_try_on: 'AI try-on used',
  rate_product: 'Product rated',
  referral_converted: 'Referral converted',
  complete_quiz: 'Quiz completed',
  weekly_streak: '7-day streak',
  monthly_streak: '30-day streak',
  bonus: 'Bonus',
};

export default function XpRewardsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [xpRes, histRes, ratesRes] = await Promise.all([
      supabase.from('xp_balances').select('*').eq('user_id', user.id).single(),
      supabase.from('xp_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      getXpRedemptionRates(),
    ]);

    setBalance(xpRes.data?.current_balance || 0);
    setStreak(xpRes.data?.current_daily_streak || 0);
    setTotalEarned(xpRes.data?.total_earned || 0);
    setHistory(histRes.data || []);
    setRates(ratesRes.rates);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleRedeem = async (rate: any) => {
    if (balance < rate.xp_cost) {
      Alert.alert('Insufficient XP', `You need ${rate.xp_cost.toLocaleString()} XP but only have ${balance.toLocaleString()}.`);
      return;
    }

    Alert.alert('Redeem XP', `Spend ${rate.xp_cost.toLocaleString()} XP for ${rate.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redeem', onPress: async () => {
        let result;
        if (rate.redemption_type === 'ai_try_on_pack') {
          result = await redeemXpForTryOns(rate.id);
        } else {
          result = await redeemXpForDiscount(rate.id);
        }
        if (result.success) {
          Alert.alert('Redeemed', rate.redemption_type === 'appointment_discount'
            ? `Your discount code is ready. Check your profile for the code.`
            : `${rate.label} added to your account.`);
          fetchData();
        } else {
          Alert.alert('Error', result.error || 'Something went wrong');
        }
      }},
    ]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>;
  }

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>XP & Rewards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <View style={st.balanceCard}>
            <View style={st.balanceTop}>
              <View>
                <Text style={st.balanceLabel}>Available XP</Text>
                <Text style={st.balanceValue}>{balance.toLocaleString()}</Text>
              </View>
              <View style={st.streakPill}>
                <IC.Flame />
                <Text style={st.streakText}>{streak} day streak</Text>
              </View>
            </View>
            <View style={st.balanceStats}>
              <View style={st.balanceStat}>
                <Text style={st.bStatValue}>{totalEarned.toLocaleString()}</Text>
                <Text style={st.bStatLabel}>Total earned</Text>
              </View>
              <View style={st.bStatDivider} />
              <View style={st.balanceStat}>
                <Text style={st.bStatValue}>{(totalEarned - balance).toLocaleString()}</Text>
                <Text style={st.bStatLabel}>Total spent</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* How to earn */}
        <Animated.View entering={FadeInUp.delay(50).duration(300)}>
          <Text style={st.sectionLabel}>How to earn XP</Text>
          <View style={st.earnCard}>
            {[
              { action: 'Open the app daily', xp: '+5' },
              { action: 'Complete a routine step', xp: '+10' },
              { action: 'Complete full daily routine', xp: '+25' },
              { action: 'Use AI try-on', xp: '+15' },
              { action: 'Rate a product', xp: '+5' },
              { action: 'Refer a friend', xp: '+200' },
              { action: '7-day streak', xp: '+75' },
              { action: '30-day streak', xp: '+500' },
            ].map((item, i, arr) => (
              <View key={item.action} style={[st.earnRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={st.earnDot} />
                <Text style={st.earnAction}>{item.action}</Text>
                <Text style={st.earnXp}>{item.xp}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Redeem */}
        <Animated.View entering={FadeInUp.delay(100).duration(300)}>
          <Text style={st.sectionLabel}>Redeem</Text>
          <View style={st.redeemGrid}>
            {rates.map(r => {
              const canAfford = balance >= r.xp_cost;
              const icon = r.redemption_type === 'ai_try_on_pack' ? <IC.Camera /> :
                           r.redemption_type === 'appointment_discount' ? <IC.Tag /> : <IC.Gift />;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => handleRedeem(r)}
                  style={({ pressed }) => [st.redeemCard, !canAfford && st.redeemDisabled, pressed && canAfford && { opacity: 0.85 }]}
                >
                  <View style={st.redeemIcon}>{icon}</View>
                  <Text style={st.redeemLabel} numberOfLines={2}>{r.label}</Text>
                  <View style={[st.redeemCost, canAfford && st.redeemCostAffordable]}>
                    <IC.Zap />
                    <Text style={[st.redeemCostText, canAfford && { color: Colors.violet }]}>{r.xp_cost.toLocaleString()}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* History */}
        <Animated.View entering={FadeInUp.delay(150).duration(300)}>
          <Text style={st.sectionLabel}>Recent activity</Text>
          {history.length === 0 ? (
            <View style={st.emptyCard}>
              <Text style={st.emptyText}>No XP earned yet. Start using the app to earn points.</Text>
            </View>
          ) : (
            <View style={st.historyCard}>
              {history.map((h, i) => (
                <View key={h.id} style={[st.historyRow, i === history.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={st.historyDot} />
                  <View style={st.historyBody}>
                    <Text style={st.historyAction}>{h.description || ACTION_LABELS[h.action] || h.action}</Text>
                    <Text style={st.historyDate}>{formatDate(h.created_at)}</Text>
                  </View>
                  <Text style={st.historyXp}>+{h.xp_earned}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.porcelain },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },
  scroll: { paddingBottom: 40 },

  // Balance
  balanceCard: { marginHorizontal: 20, marginBottom: 24, padding: 24, backgroundColor: Colors.ink, borderRadius: 20 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  balanceLabel: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  balanceValue: { fontFamily: Fonts.heading, fontSize: 36, color: '#fff' },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(118,67,172,0.3)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  streakText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.lavender },
  balanceStats: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 16 },
  balanceStat: { flex: 1, alignItems: 'center' },
  bStatValue: { fontFamily: Fonts.headingSemi, fontSize: 16, color: '#fff', marginBottom: 2 },
  bStatLabel: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  bStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 10, marginTop: 4,
  },

  // Earn
  earnCard: {
    marginHorizontal: 20, marginBottom: 24, backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  earnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  earnDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.violet },
  earnAction: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.ink },
  earnXp: { fontFamily: Fonts.headingSemi, fontSize: 14, color: Colors.violet },

  // Redeem
  redeemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  redeemCard: {
    width: '48%', backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  redeemDisabled: { opacity: 0.5 },
  redeemIcon: { marginBottom: 10 },
  redeemLabel: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.ink, marginBottom: 10, lineHeight: 18 },
  redeemCost: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#F7F5FB',
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
  },
  redeemCostAffordable: { backgroundColor: '#EDE8F5' },
  redeemCostText: { fontFamily: Fonts.headingSemi, fontSize: 12, color: Colors.muted },

  // History
  emptyCard: {
    marginHorizontal: 20, padding: 24, alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  historyCard: {
    marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  historyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8AB800' },
  historyBody: { flex: 1 },
  historyAction: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.ink },
  historyDate: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 1 },
  historyXp: { fontFamily: Fonts.headingSemi, fontSize: 14, color: Colors.violet },
});
