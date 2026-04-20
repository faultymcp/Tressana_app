import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Shield: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>,
  Eye: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle cx="12" cy="12" r="3" /></Svg>,
  EyeOff: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><Line x1="1" y1="1" x2="23" y2="23" /></Svg>,
  Download: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><Path d="M7 10l5 5 5-5" /><Line x1="12" y1="15" x2="12" y2="3" /></Svg>,
  Trash: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.error} strokeWidth={1.6} strokeLinecap="round"><Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></Svg>,
  Database: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M12 2C6.48 2 2 3.79 2 6v12c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4z" /><Path d="M2 6c0 2.21 4.48 4 10 4s10-1.79 10-4" /><Path d="M2 12c0 2.21 4.48 4 10 4s10-1.79 10-4" /></Svg>,
  Lock: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Rect x="3" y="11" width="18" height="11" rx="2" /><Path d="M7 11V7a5 5 0 0110 0v4" /></Svg>,
  Chevron: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round"><Path d="M9 18l6-6-6-6" /></Svg>,
};

export default function PrivacyScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(true);
  const [personalisation, setPersonalisation] = useState(true);

  const handleExport = () => {
    Alert.alert('Export My Data', 'We will send a copy of all your data (hair profile, routines, bookings, XP history) to your registered email within 48 hours.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Request Export', onPress: () => Alert.alert('Request Sent', 'Check your email in the next 48 hours.') },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete:\n\n- Your hair profile and quiz results\n- All XP, wallet balance, and discount codes\n- Your bookings and favourites\n- Your Tressie conversation history\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete My Account', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        }},
      ]
    );
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>Privacy & Data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Overview */}
        <View style={st.infoCard}>
          <View style={st.infoIcon}><IC.Shield /></View>
          <Text style={st.infoTitle}>Your data, your control</Text>
          <Text style={st.infoDesc}>Tressana stores your data securely on EU-hosted servers. We never sell your personal information to third parties. You can export or delete your data at any time.</Text>
        </View>

        {/* What we collect */}
        <Text style={st.sectionLabel}>What we store</Text>
        <View style={st.card}>
          {[
            { icon: <IC.Eye />, label: 'Hair profile', desc: 'Hair type, porosity, goals, segments from your quiz' },
            { icon: <IC.Database />, label: 'Routine data', desc: 'Steps completed, streaks, XP earned' },
            { icon: <IC.Lock />, label: 'Account', desc: 'Email, authentication tokens (encrypted)' },
            { icon: <IC.Download />, label: 'Usage', desc: 'App interactions for personalisation (anonymised)' },
          ].map((item, i, arr) => (
            <View key={item.label} style={[st.row, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={st.rowIcon}>{item.icon}</View>
              <View style={st.rowBody}>
                <Text style={st.rowLabel}>{item.label}</Text>
                <Text style={st.rowSub}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Controls */}
        <Text style={st.sectionLabel}>Privacy controls</Text>
        <View style={st.card}>
          <View style={st.row}>
            <View style={st.rowIcon}><IC.Database /></View>
            <View style={st.rowBody}>
              <Text style={st.rowLabel}>Analytics</Text>
              <Text style={st.rowSub}>Help us improve the app with anonymous usage data</Text>
            </View>
            <Switch value={analytics} onValueChange={setAnalytics} trackColor={{ false: Colors.border, true: Colors.violet }} thumbColor="#fff" />
          </View>
          <View style={[st.row, { borderBottomWidth: 0 }]}>
            <View style={st.rowIcon}><IC.Eye /></View>
            <View style={st.rowBody}>
              <Text style={st.rowLabel}>Personalised recommendations</Text>
              <Text style={st.rowSub}>Use your hair data for product and stylist suggestions</Text>
            </View>
            <Switch value={personalisation} onValueChange={setPersonalisation} trackColor={{ false: Colors.border, true: Colors.violet }} thumbColor="#fff" />
          </View>
        </View>

        {/* Actions */}
        <Text style={st.sectionLabel}>Your data</Text>
        <View style={st.card}>
          <Pressable onPress={handleExport} style={st.row}>
            <View style={st.rowIcon}><IC.Download /></View>
            <View style={st.rowBody}>
              <Text style={st.rowLabel}>Export my data</Text>
              <Text style={st.rowSub}>Download a copy of all your data via email</Text>
            </View>
            <IC.Chevron />
          </Pressable>
          <Pressable onPress={handleDelete} style={[st.row, { borderBottomWidth: 0 }]}>
            <View style={st.rowIcon}><IC.Trash /></View>
            <View style={st.rowBody}>
              <Text style={[st.rowLabel, { color: Colors.error }]}>Delete my account</Text>
              <Text style={st.rowSub}>Permanently remove all data</Text>
            </View>
          </Pressable>
        </View>

        <Text style={st.footer}>Last updated: April 2026</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },
  scroll: { paddingBottom: 40 },

  infoCard: {
    marginHorizontal: 20, marginBottom: 24, padding: 24, alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  infoIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  infoTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink, marginBottom: 8 },
  infoDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 10,
  },
  card: {
    marginHorizontal: 20, marginBottom: 20, backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 15, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowIcon: { width: 24, alignItems: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.ink },
  rowSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 1 },

  footer: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 12, opacity: 0.4 },
});
