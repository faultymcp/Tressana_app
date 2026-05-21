// components/ProGate.tsx
// Wraps any feature that requires Pro/Pro+ subscription.
// Shows the content if user has the required tier, shows upgrade prompt if not.
//
// Usage:
//   <ProGate requiredTier="pro" feature="AI try-on">
//     <TryOnScreen />
//   </ProGate>

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

const IC = {
  Lock: () => <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" /><Path d="M7 11V7a5 5 0 0110 0v4" /></Svg>,
  Zap: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill={Colors.violet} stroke="none"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg>,
};

const TIER_RANK = { free: 0, pro: 1, pro_plus: 2 };

type ProGateProps = {
  requiredTier: 'pro' | 'pro_plus';
  currentTier: 'free' | 'pro' | 'pro_plus';
  feature: string;
  children: React.ReactNode;
  compact?: boolean; // inline banner vs full-screen gate
};

export default function ProGate({ requiredTier, currentTier, feature, children, compact }: ProGateProps) {
  const router = useRouter();
  const hasAccess = TIER_RANK[currentTier] >= TIER_RANK[requiredTier];

  if (hasAccess) return <>{children}</>;

  const tierLabel = requiredTier === 'pro_plus' ? 'Tressie Pro+' : 'Tressie Pro';
  const price = requiredTier === 'pro_plus' ? '£12.99/mo' : '£6.99/mo';

  if (compact) {
    return (
      <Pressable onPress={() => router.push('/subscription')} style={st.banner}>
        <IC.Zap />
        <Text style={st.bannerText}>{feature} requires {tierLabel}</Text>
        <Text style={st.bannerLink}>Upgrade</Text>
      </Pressable>
    );
  }

  return (
    <View style={st.gate}>
      <View style={st.iconWrap}><IC.Lock /></View>
      <Text style={st.title}>Unlock {feature}</Text>
      <Text style={st.subtitle}>
        This feature is available on {tierLabel}. Upgrade to get {feature.toLowerCase()}, plus all other {tierLabel} benefits.
      </Text>
      <View style={st.priceRow}>
        <Text style={st.price}>{price}</Text>
        <Text style={st.priceNote}>Cancel anytime</Text>
      </View>
      <Pressable onPress={() => router.push('/subscription')} style={({ pressed }) => [st.btn, pressed && { opacity: 0.85 }]}>
        <Text style={st.btnText}>View plans</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={st.dismissBtn}>
        <Text style={st.dismissText}>Not now</Text>
      </Pressable>
    </View>
  );
}

/**
 * Hook to check feature access.
 * Usage: const canUse = useFeatureAccess('pro', userTier);
 */
export function checkFeatureAccess(
  requiredTier: 'pro' | 'pro_plus',
  currentTier: 'free' | 'pro' | 'pro_plus',
): boolean {
  return TIER_RANK[currentTier] >= TIER_RANK[requiredTier];
}

/**
 * Feature → tier mapping.
 * Central registry of what requires what.
 */
export const FEATURE_TIERS: Record<string, 'free' | 'pro' | 'pro_plus'> = {
  // Free
  'basic_quiz': 'free',
  'basic_routine': 'free',
  'limited_chat': 'free',

  // Pro
  'full_routine': 'pro',
  'unlimited_chat': 'pro',
  'ingredient_scanner': 'pro',
  'product_recs': 'pro',
  'wash_day_scheduler': 'pro',
  'ai_tryon_5': 'pro',

  // Pro+
  'ai_tryon_15': 'pro_plus',
  'vision_board': 'pro_plus',
  'creator_feed': 'pro_plus',
  'priority_support': 'pro_plus',
};

const st = StyleSheet.create({
  // Full gate
  gate: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, backgroundColor: Colors.porcelain },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F0EBFA', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.ink, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 20, maxWidth: 300 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 24 },
  price: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.violet },
  priceNote: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  btn: {
    width: '100%', paddingVertical: 16, borderRadius: 16,
    backgroundColor: Colors.violet, alignItems: 'center',
  },
  btnText: { fontFamily: Fonts.headingSemi, fontSize: 16, color: '#fff' },
  dismissBtn: { marginTop: 14, paddingVertical: 8 },
  dismissText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },

  // Compact banner
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginVertical: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#F7F5FB', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(118,67,172,0.15)',
  },
  bannerText: { flex: 1, fontFamily: Fonts.body, fontSize: 12, color: Colors.ink },
  bannerLink: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.violet },
});
