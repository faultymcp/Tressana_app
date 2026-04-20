import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Plus: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"><Line x1="12" y1="5" x2="12" y2="19" /><Line x1="5" y1="12" x2="19" y2="12" /></Svg>,
  ArrowUp: () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2} strokeLinecap="round"><Path d="M12 19V5M5 12l7-7 7 7" /></Svg>,
  ArrowDown: () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.error} strokeWidth={2} strokeLinecap="round"><Path d="M12 5v14M19 12l-7 7-7-7" /></Svg>,
  Camera: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><Circle cx="12" cy="13" r="4" /></Svg>,
  WalletBig: () => <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.4} strokeLinecap="round"><Rect x="2" y="5" width="20" height="14" rx="2" /><Path d="M2 10h20" /></Svg>,
};

type Transaction = {
  id: string;
  tx_type: string;
  amount_pence: number;
  description: string;
  created_at: string;
};

const TX_LABELS: Record<string, string> = {
  top_up: 'Top up', ai_try_on_charge: 'AI Try-On', subscription_charge: 'Subscription',
  in_app_purchase: 'Purchase', refund: 'Refund', referral_credit: 'Referral bonus',
};

const TOP_UPS = [
  { label: '£5', pence: 500 },
  { label: '£10', pence: 1000 },
  { label: '£20', pence: 2000 },
];

export default function WalletScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => { loadWallet(); }, []);

  const loadWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: w } = await supabase
        .from('wallet_balances').select('balance_pence')
        .eq('user_id', user.id).maybeSingle();
      if (w) setBalance(w.balance_pence);

      const { data: tx } = await supabase
        .from('wallet_transactions').select('id, tx_type, amount_pence, description, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      if (tx) setTransactions(tx);
    } catch (e) {
      console.log('Wallet tables may not exist yet:', e);
    }
    setLoading(false);
  };

  const handleTopUp = (pence: number) => {
    Alert.alert('Top Up Wallet', `Add £${(pence / 100).toFixed(2)} to your wallet?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Top Up', onPress: async () => {
        try {
          const payments = require('@/lib/payments');
          payments.startWalletTopUp(pence, () => loadWallet(), () => {});
        } catch (e) {
          Alert.alert('Coming Soon', 'Wallet top-ups will be available once payment processing is fully configured.');
        }
      }},
    ]);
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso); const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>
      ) : (
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          {/* Balance */}
          <Animated.View entering={FadeInUp.duration(300)}>
            <View style={st.balanceCard}>
              <IC.WalletBig />
              <Text style={st.balanceLabel}>Available balance</Text>
              <Text style={st.balanceAmount}>£{(balance / 100).toFixed(2)}</Text>
              <Text style={st.balanceSub}>Use for AI try-ons and in-app purchases</Text>
            </View>
          </Animated.View>

          {/* Top up */}
          <Animated.View entering={FadeInUp.delay(50).duration(300)}>
            <Text style={st.sectionLabel}>Add funds</Text>
            <View style={st.topUpRow}>
              {TOP_UPS.map(a => (
                <Pressable key={a.pence} onPress={() => handleTopUp(a.pence)}
                  style={({ pressed }) => [st.topUpBtn, pressed && { opacity: 0.8 }]}>
                  <IC.Plus />
                  <Text style={st.topUpText}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* What you can buy */}
          <Animated.View entering={FadeInUp.delay(100).duration(300)}>
            <Text style={st.sectionLabel}>What you can buy</Text>
            <View style={st.infoCard}>
              {[
                { title: 'Single AI Try-On (4K)', sub: 'One-time use', price: '£0.69' },
                { title: '5 Try-On Pack (4K)', sub: 'Best value for regular use', price: '£2.49' },
                { title: '10 Try-On Pack (4K)', sub: 'Power user pack', price: '£3.99' },
              ].map((item, i, arr) => (
                <View key={item.title}>
                  <View style={st.infoRow}>
                    <View style={st.infoIcon}><IC.Camera /></View>
                    <View style={st.infoBody}>
                      <Text style={st.infoTitle}>{item.title}</Text>
                      <Text style={st.infoSub}>{item.sub}</Text>
                    </View>
                    <Text style={st.infoPrice}>{item.price}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={st.infoDivider} />}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Transactions */}
          <Animated.View entering={FadeInUp.delay(150).duration(300)}>
            <Text style={st.sectionLabel}>Transaction history</Text>
            {transactions.length === 0 ? (
              <View style={st.emptyCard}>
                <Text style={st.emptyTitle}>No transactions yet</Text>
                <Text style={st.emptySub}>Top up your wallet to get started</Text>
              </View>
            ) : (
              <View style={st.txCard}>
                {transactions.map((tx, i) => {
                  const isCredit = tx.amount_pence > 0;
                  return (
                    <View key={tx.id} style={[st.txRow, i === transactions.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[st.txIcon, { backgroundColor: isCredit ? '#F0FDF4' : '#FEF2F2' }]}>
                        {isCredit ? <IC.ArrowUp /> : <IC.ArrowDown />}
                      </View>
                      <View style={st.txBody}>
                        <Text style={st.txLabel}>{tx.description || TX_LABELS[tx.tx_type] || tx.tx_type}</Text>
                        <Text style={st.txDate}>{fmtDate(tx.created_at)}</Text>
                      </View>
                      <Text style={[st.txAmount, { color: isCredit ? '#16A34A' : Colors.ink }]}>
                        {isCredit ? '+' : '-'}£{(Math.abs(tx.amount_pence) / 100).toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },
  scroll: { paddingBottom: 40 },

  balanceCard: {
    marginHorizontal: 20, marginBottom: 24, padding: 28,
    backgroundColor: Colors.ink, borderRadius: 20, alignItems: 'center',
  },
  balanceLabel: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12, marginBottom: 4 },
  balanceAmount: { fontFamily: Fonts.heading, fontSize: 40, color: '#fff', marginBottom: 4 },
  balanceSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 10, marginTop: 4,
  },
  topUpRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  topUpBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.violet, borderRadius: 14, paddingVertical: 14,
  },
  topUpText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: '#fff' },

  infoCard: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center' },
  infoBody: { flex: 1 },
  infoTitle: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink, marginBottom: 1 },
  infoSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  infoPrice: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.violet },
  infoDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 18 },

  emptyCard: {
    marginHorizontal: 20, padding: 32, alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.ink, marginBottom: 4 },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  txCard: {
    marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txBody: { flex: 1 },
  txLabel: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.ink },
  txDate: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 1 },
  txAmount: { fontFamily: Fonts.headingSemi, fontSize: 15 },
});