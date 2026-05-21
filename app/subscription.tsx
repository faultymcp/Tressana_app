import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { startSubscription, PRICES } from '@/lib/payments';
import Animated, { FadeInUp } from 'react-native-reanimated';

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Check: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={2.5} strokeLinecap="round"><Path d="M20 6L9 17l-5-5" /></Svg>,
  Lock: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.8} strokeLinecap="round"><Path d="M7 11V7a5 5 0 0110 0v4" /><Path d="M3 11h18v11H3z" /></Svg>,
};

type Feature = { label: string; free: boolean | string; pro: boolean | string; proPlus: boolean | string };

const FEATURES: Feature[] = [
  { label: 'Hair profile quiz', free: true, pro: true, proPlus: true },
  { label: 'Basic hair diagnosis', free: true, pro: true, proPlus: true },
  { label: 'Tressie AI chats', free: '3/mo', pro: 'Unlimited', proPlus: 'Unlimited' },
  { label: 'Ingredient scanner', free: '1/mo', pro: 'Unlimited', proPlus: 'Unlimited' },
  { label: 'Full AI diagnosis', free: false, pro: true, proPlus: true },
  { label: 'Full routine builder', free: false, pro: true, proPlus: true },
  { label: 'Wash day scheduler', free: false, pro: true, proPlus: true },
  { label: 'Product recommendations', free: false, pro: true, proPlus: true },
  { label: 'AI try-ons (4K)', free: false, pro: '5/mo', proPlus: '15/mo' },
  { label: 'Vision board', free: false, pro: true, proPlus: true },
  { label: 'Creator content feed', free: false, pro: true, proPlus: true },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<'free' | 'pro' | 'pro_plus'>('free');
  const [isAnnual, setIsAnnual] = useState(false);
  const [billingToggle, setBillingToggle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('tier, is_annual')
          .eq('user_id', data.user.id)
          .single();
        if (sub) {
          setTier(sub.tier);
          setIsAnnual(sub.is_annual);
        }
      }
      setLoading(false);
    });
  }, []);

  const handleSubscribe = (plan: 'pro' | 'pro_plus') => {
    const priceId = billingToggle === 'annual'
      ? (plan === 'pro' ? PRICES.pro_annual : PRICES.pro_plus_annual)
      : (plan === 'pro' ? PRICES.pro_monthly : PRICES.pro_plus_monthly);

    startSubscription(priceId, () => {
      // Refetch after successful subscription
      supabase.auth.getUser().then(async ({ data }) => {
        if (data.user) {
          const { data: sub } = await supabase
            .from('user_subscriptions').select('tier, is_annual')
            .eq('user_id', data.user.id).single();
          if (sub) { setTier(sub.tier); setIsAnnual(sub.is_annual); }
        }
      });
    });
  };

  if (loading) {
    return <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>;
  }

  const proPrice = billingToggle === 'annual' ? '£54.99/yr' : '£6.99/mo';
  const proPlusPrice = billingToggle === 'annual' ? '£99.99/yr' : '£12.99/mo';
  const proSavings = billingToggle === 'annual' ? 'Save £28.89' : '';
  const proPlusSavings = billingToggle === 'annual' ? 'Save £55.89' : '';

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Current plan */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <View style={st.currentCard}>
            <Text style={st.currentLabel}>Current plan</Text>
            <Text style={st.currentTier}>
              {tier === 'pro_plus' ? 'Tressie Pro+' : tier === 'pro' ? 'Tressie Pro' : 'Free'}
            </Text>
            {tier !== 'free' && (
              <Text style={st.currentBilling}>{isAnnual ? 'Annual billing' : 'Monthly billing'}</Text>
            )}
          </View>
        </Animated.View>

        {/* Billing toggle */}
        <Animated.View entering={FadeInUp.delay(50).duration(300)}>
          <View style={st.toggleWrap}>
            <Pressable
              onPress={() => setBillingToggle('monthly')}
              style={[st.toggleBtn, billingToggle === 'monthly' && st.toggleActive]}
            >
              <Text style={[st.toggleText, billingToggle === 'monthly' && st.toggleTextActive]}>Monthly</Text>
            </Pressable>
            <Pressable
              onPress={() => setBillingToggle('annual')}
              style={[st.toggleBtn, billingToggle === 'annual' && st.toggleActive]}
            >
              <Text style={[st.toggleText, billingToggle === 'annual' && st.toggleTextActive]}>Annual</Text>
              <View style={st.saveBadge}><Text style={st.saveText}>Save 34%</Text></View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Plan cards */}
        <Animated.View entering={FadeInUp.delay(100).duration(300)}>
          {/* Pro */}
          <View style={[st.planCard, tier === 'pro' && st.planCardActive]}>
            <View style={st.planHeader}>
              <View>
                <Text style={st.planName}>Tressie Pro</Text>
                <Text style={st.planPrice}>{proPrice}</Text>
                {proSavings ? <Text style={st.planSave}>{proSavings}</Text> : null}
              </View>
              {tier === 'pro' && <View style={st.activeBadge}><Text style={st.activeText}>Current</Text></View>}
            </View>
            {tier !== 'pro' && (
              <Pressable onPress={() => handleSubscribe('pro')} style={({ pressed }) => [st.planBtn, pressed && { opacity: 0.85 }]}>
                <Text style={st.planBtnText}>{tier === 'free' ? 'Subscribe' : 'Change plan'}</Text>
              </Pressable>
            )}
          </View>

          {/* Pro+ */}
          <View style={[st.planCard, tier === 'pro_plus' && st.planCardActive]}>
            <View style={st.planHeader}>
              <View>
                <Text style={st.planName}>Tressie Pro+</Text>
                <Text style={st.planPrice}>{proPlusPrice}</Text>
                {proPlusSavings ? <Text style={st.planSave}>{proPlusSavings}</Text> : null}
              </View>
              {tier === 'pro_plus' && <View style={st.activeBadge}><Text style={st.activeText}>Current</Text></View>}
            </View>
            {tier !== 'pro_plus' && (
              <Pressable onPress={() => handleSubscribe('pro_plus')} style={({ pressed }) => [st.planBtn, st.planBtnPrimary, pressed && { opacity: 0.85 }]}>
                <Text style={st.planBtnTextPrimary}>{tier === 'free' ? 'Subscribe' : 'Upgrade'}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Feature comparison */}
        <Animated.View entering={FadeInUp.delay(150).duration(300)}>
          <Text style={st.sectionLabel}>Feature comparison</Text>
          <View style={st.featureCard}>
            {/* Header */}
            <View style={[st.featureRow, st.featureHeader]}>
              <Text style={[st.featureLabel, { flex: 2 }]}>Feature</Text>
              <Text style={st.featureCol}>Free</Text>
              <Text style={st.featureCol}>Pro</Text>
              <Text style={st.featureCol}>Pro+</Text>
            </View>
            {FEATURES.map((f, i) => (
              <View key={f.label} style={[st.featureRow, i === FEATURES.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[st.featureLabel, { flex: 2 }]}>{f.label}</Text>
                {[f.free, f.pro, f.proPlus].map((val, j) => (
                  <View key={j} style={st.featureColWrap}>
                    {val === true ? <IC.Check /> : val === false ? <IC.Lock /> :
                      <Text style={st.featureText}>{val}</Text>}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Animated.View>

        {tier !== 'free' && (
          <Pressable style={st.cancelBtn}>
            <Text style={st.cancelText}>Cancel subscription</Text>
          </Pressable>
        )}
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

  currentCard: {
    marginHorizontal: 20, marginBottom: 20, padding: 24,
    backgroundColor: Colors.ink, borderRadius: 20, alignItems: 'center',
  },
  currentLabel: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  currentTier: { fontFamily: Fonts.heading, fontSize: 24, color: '#fff', marginBottom: 2 },
  currentBilling: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  toggleWrap: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: Colors.white, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  toggleActive: { backgroundColor: Colors.ink },
  toggleText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.muted },
  toggleTextActive: { color: '#fff' },
  saveBadge: { backgroundColor: '#D9FF00', paddingVertical: 1, paddingHorizontal: 8, borderRadius: 8 },
  saveText: { fontFamily: Fonts.bodySemi, fontSize: 9, color: Colors.ink },

  planCard: {
    marginHorizontal: 20, marginBottom: 12, padding: 20,
    backgroundColor: Colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  planCardActive: { borderColor: Colors.violet, borderWidth: 2 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  planName: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink, marginBottom: 2 },
  planPrice: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.ink },
  planSave: { fontFamily: Fonts.bodySemi, fontSize: 11, color: '#16A34A', marginTop: 2 },
  activeBadge: { backgroundColor: Colors.violet, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 12 },
  activeText: { fontFamily: Fonts.bodySemi, fontSize: 11, color: '#fff' },
  planBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  planBtnPrimary: { backgroundColor: Colors.violet, borderColor: Colors.violet },
  planBtnText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink },
  planBtnTextPrimary: { fontFamily: Fonts.bodySemi, fontSize: 14, color: '#fff' },

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 10, marginTop: 12,
  },
  featureCard: {
    marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  featureHeader: { backgroundColor: '#F9F8FC' },
  featureLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.ink },
  featureCol: { width: 50, fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.muted, textAlign: 'center' },
  featureColWrap: { width: 50, alignItems: 'center' },
  featureText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Colors.violet, textAlign: 'center' },

  cancelBtn: { marginHorizontal: 20, marginTop: 20, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.error },
});
