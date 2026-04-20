import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Share, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Copy: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Rect x="9" y="9" width="13" height="13" rx="2" /><Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></Svg>,
  Share: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round"><Circle cx="18" cy="5" r="3" /><Circle cx="6" cy="12" r="3" /><Circle cx="18" cy="19" r="3" /><Path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></Svg>,
  UserPlus: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.6} strokeLinecap="round"><Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><Circle cx="8.5" cy="7" r="4" /><Path d="M20 8v6M23 11h-6" /></Svg>,
  Check: () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2.5} strokeLinecap="round"><Path d="M20 6L9 17l-5-5" /></Svg>,
  Clock: () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.8} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M12 6v6l4 2" /></Svg>,
};

export default function ReferralScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get or create referral code
      const { data: existing } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_id', user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        setCode(existing[0].referral_code);
      } else {
        // Generate a referral code
        const newCode = `TRES-${user.id.slice(0, 6).toUpperCase()}`;
        await supabase.from('referrals').insert({
          referrer_id: user.id,
          referral_code: newCode,
        });
        setCode(newCode);
      }

      // Get all referrals
      const { data: refs } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      setReferrals(refs || []);
      setLoading(false);
    })();
  }, []);

  const handleCopy = async () => {
    const { Clipboard } = require('react-native');
    if (Clipboard?.setString) Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({
      message: `Hey! Join me on Tressana, the AI hair care app that actually gets your hair type. Use my code ${code} and we both get £5 off our first appointment + 200 XP. Download: https://tressana.ai/invite/${code}`,
    });
  };

  const totalConverted = referrals.filter(r => r.converted).length;
  const totalPending = referrals.filter(r => r.signed_up && !r.converted).length;

  if (loading) {
    return <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>;
  }

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>Refer a Friend</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <View style={st.heroCard}>
            <Text style={st.heroTitle}>Give £5, Get £5</Text>
            <Text style={st.heroSub}>Share your code with friends. When they complete their first action, you both receive £5 off your next appointment and 200 XP.</Text>

            {/* Code display */}
            <View style={st.codeRow}>
              <View style={st.codeBox}>
                <Text style={st.codeText}>{code}</Text>
              </View>
              <Pressable onPress={handleCopy} style={st.copyBtn}>
                {copied ? <IC.Check /> : <IC.Copy />}
              </Pressable>
            </View>

            {/* Share button */}
            <Pressable onPress={handleShare} style={({ pressed }) => [st.shareBtn, pressed && { opacity: 0.85 }]}>
              <IC.Share />
              <Text style={st.shareBtnText}>Share invite link</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInUp.delay(50).duration(300)} style={st.statsRow}>
          <View style={st.statCard}>
            <Text style={st.statValue}>{referrals.length}</Text>
            <Text style={st.statLabel}>Invited</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statCard}>
            <Text style={st.statValue}>{totalPending}</Text>
            <Text style={st.statLabel}>Signed up</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statCard}>
            <Text style={[st.statValue, { color: Colors.violet }]}>{totalConverted}</Text>
            <Text style={st.statLabel}>Converted</Text>
          </View>
        </Animated.View>

        {/* How it works */}
        <Animated.View entering={FadeInUp.delay(100).duration(300)}>
          <Text style={st.sectionLabel}>How it works</Text>
          <View style={st.stepsCard}>
            {[
              { num: '1', text: 'Share your unique code with a friend' },
              { num: '2', text: 'They sign up and complete the hair quiz' },
              { num: '3', text: 'You both get £5 off and 200 XP' },
            ].map((s, i, arr) => (
              <View key={s.num} style={[st.stepRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={st.stepNum}><Text style={st.stepNumText}>{s.num}</Text></View>
                <Text style={st.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Referral list */}
        {referrals.length > 0 && (
          <Animated.View entering={FadeInUp.delay(150).duration(300)}>
            <Text style={st.sectionLabel}>Your referrals</Text>
            <View style={st.listCard}>
              {referrals.map((r, i) => (
                <View key={r.id} style={[st.refRow, i === referrals.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={st.refIcon}><IC.UserPlus /></View>
                  <View style={st.refBody}>
                    <Text style={st.refCode}>{r.referral_code}</Text>
                    <Text style={st.refDate}>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                  <View style={[st.refStatus, r.converted ? st.refConverted : r.signed_up ? st.refPending : st.refWaiting]}>
                    {r.converted ? <IC.Check /> : <IC.Clock />}
                    <Text style={[st.refStatusText, r.converted && { color: '#16A34A' }]}>
                      {r.converted ? 'Converted' : r.signed_up ? 'Signed up' : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
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

  heroCard: { marginHorizontal: 20, marginBottom: 20, padding: 24, backgroundColor: Colors.ink, borderRadius: 20 },
  heroTitle: { fontFamily: Fonts.heading, fontSize: 24, color: '#fff', marginBottom: 8 },
  heroSub: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20, marginBottom: 20 },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  codeBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  codeText: { fontFamily: Fonts.heading, fontSize: 18, color: '#fff', textAlign: 'center', letterSpacing: 2 },
  copyBtn: { width: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.violet, borderRadius: 14, paddingVertical: 14 },
  shareBtnText: { fontFamily: Fonts.bodySemi, fontSize: 15, color: '#fff' },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 24,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.ink, marginBottom: 2 },
  statLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 10,
  },
  stepsCard: {
    marginHorizontal: 20, marginBottom: 24, backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: Fonts.headingSemi, fontSize: 13, color: Colors.violet },
  stepText: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.ink },

  listCard: {
    marginHorizontal: 20, backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  refRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  refIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center' },
  refBody: { flex: 1 },
  refCode: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.ink },
  refDate: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 1 },
  refStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  refConverted: { backgroundColor: '#F0FDF4' },
  refPending: { backgroundColor: '#FFF7ED' },
  refWaiting: { backgroundColor: '#F5F3EE' },
  refStatusText: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.muted },
});
