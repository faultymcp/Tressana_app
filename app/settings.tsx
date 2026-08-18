import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Icons ───────────────────────────────────────────────────────
const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Bell: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><Path d="M13.73 21a2 2 0 01-3.46 0" /></Svg>,
  Moon: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></Svg>,
  Globe: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M2 12h20" /><Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></Svg>,
  User: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><Circle cx="12" cy="7" r="4" /></Svg>,
  Lock: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Rect x="3" y="11" width="18" height="11" rx="2" /><Path d="M7 11V7a5 5 0 0110 0v4" /></Svg>,
  Download: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><Path d="M7 10l5 5 5-5" /><Line x1="12" y1="15" x2="12" y2="3" /></Svg>,
  Trash: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.error} strokeWidth={1.6} strokeLinecap="round"><Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></Svg>,
  Chevron: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round"><Path d="M9 18l6-6-6-6" /></Svg>,
  Mail: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Rect x="2" y="4" width="20" height="16" rx="2" /><Path d="M22 7l-10 7L2 7" /></Svg>,
  Eye: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle cx="12" cy="12" r="3" /></Svg>,
};

// ─── Row components ──────────────────────────────────────────────
function ToggleRow({ icon, label, sublabel, value, onToggle, last }: {
  icon: React.ReactNode; label: string; sublabel?: string;
  value: boolean; onToggle: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[st.row, last && { borderBottomWidth: 0 }]}>
      <View style={st.rowIcon}>{icon}</View>
      <View style={st.rowBody}>
        <Text style={st.rowLabel}>{label}</Text>
        {sublabel && <Text style={st.rowSub}>{sublabel}</Text>}
      </View>
      <Switch
        value={value} onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.violet }}
        thumbColor="#fff"
        ios_backgroundColor={Colors.border}
      />
    </View>
  );
}

function NavRow({ icon, label, sublabel, right, onPress, last, destructive }: {
  icon: React.ReactNode; label: string; sublabel?: string; right?: string;
  onPress: () => void; last?: boolean; destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.row, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: '#F9F8FC' }]}
    >
      <View style={st.rowIcon}>{icon}</View>
      <View style={st.rowBody}>
        <Text style={[st.rowLabel, destructive && { color: Colors.error }]}>{label}</Text>
        {sublabel && <Text style={st.rowSub}>{sublabel}</Text>}
      </View>
      {right && <Text style={st.rowRight} numberOfLines={1}>{right}</Text>}
      {!destructive && <IC.Chevron />}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={st.sectionLabel}>{children}</Text>;
}

// ─── Screen ──────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  // Notification prefs (stored in AsyncStorage for now, move to Supabase later)
  const [pushRoutine, setPushRoutine] = useState(true);
  const [pushTips, setPushTips] = useState(true);
  const [pushPromo, setPushPromo] = useState(false);
  const [pushBooking, setPushBooking] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '');
    });
    // Load prefs
    AsyncStorage.getItem('tressie_notif_prefs').then(raw => {
      if (raw) {
        const p = JSON.parse(raw);
        setPushRoutine(p.routine ?? true);
        setPushTips(p.tips ?? true);
        setPushPromo(p.promo ?? false);
        setPushBooking(p.booking ?? true);
      }
    });
  }, []);

  const saveNotifPref = (key: string, value: boolean) => {
    const prefs = { routine: pushRoutine, tips: pushTips, promo: pushPromo, booking: pushBooking, [key]: value };
    AsyncStorage.setItem('tressie_notif_prefs', JSON.stringify(prefs));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all your data, hair profile, XP, wallet balance, and bookings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          // In production, call an Edge Function that handles cascade deletion
          await supabase.auth.signOut();
          router.replace('/');
        }},
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('Export Data', 'A copy of your data will be sent to your email address within 48 hours.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Request Export', onPress: () => Alert.alert('Request Sent', 'Check your email in the next 48 hours.') },
    ]);
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}>
          <IC.Back />
        </Pressable>
        <Text style={st.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <View style={st.card}>
          <NavRow icon={<IC.Mail />} label="Email" right={email} onPress={() => {}} />
          <NavRow icon={<IC.Lock />} label="Change password" onPress={() => {}} />
          <NavRow icon={<IC.User />} label="Edit profile" sublabel="Name, photo" onPress={() => {}} last />
        </View>

        {/* Notifications */}
        <SectionLabel>Notifications</SectionLabel>
        <View style={st.card}>
          <ToggleRow icon={<IC.Bell />} label="Routine reminders" sublabel="Daily steps and wash day alerts" value={pushRoutine} onToggle={v => { setPushRoutine(v); saveNotifPref('routine', v); }} />
          <ToggleRow icon={<IC.Bell />} label="Tips & suggestions" sublabel="Personalised hair tips" value={pushTips} onToggle={v => { setPushTips(v); saveNotifPref('tips', v); }} />
          <ToggleRow icon={<IC.Bell />} label="Booking updates" sublabel="Confirmations and reminders" value={pushBooking} onToggle={v => { setPushBooking(v); saveNotifPref('booking', v); }} />
          <ToggleRow icon={<IC.Bell />} label="Promotions" sublabel="Offers and new features" value={pushPromo} onToggle={v => { setPushPromo(v); saveNotifPref('promo', v); }} last />
        </View>

        {/* Appearance */}
        <SectionLabel>Appearance</SectionLabel>
        <View style={st.card}>
          <ToggleRow icon={<IC.Moon />} label="Dark mode" sublabel="Coming soon" value={darkMode} onToggle={setDarkMode} />
          <NavRow icon={<IC.Globe />} label="Language" right="English (UK)" onPress={() => {}} last />
        </View>

        {/* Hair Profile */}
        <SectionLabel>Hair Profile</SectionLabel>
        <View style={st.card}>
          <NavRow icon={<IC.Eye />} label="View full results" onPress={() => router.push('/reveal')} />
          <NavRow icon={<IC.User />} label="Retake quiz" sublabel="Update your hair profile" onPress={() => router.push('/quiz')} last />
        </View>

        {/* Data & Privacy */}
        <SectionLabel>Data & Privacy</SectionLabel>
        <View style={st.card}>
          <NavRow icon={<IC.Download />} label="Export my data" sublabel="Download a copy of your data" onPress={handleExportData} />
          <NavRow icon={<IC.Trash />} label="Delete account" destructive onPress={handleDeleteAccount} last />
        </View>

        <Text style={st.footer}>Tressie v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 12,
    backgroundColor: Colors.porcelain,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },
  scroll: { paddingBottom: 40 },

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 8, marginTop: 8,
  },

  card: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 15, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowIcon: { width: 24, alignItems: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.ink },
  rowSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 1 },
  rowRight: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginRight: 4, flexShrink: 1, maxWidth: 180, textAlign: 'right' },

  footer: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 20, opacity: 0.4 },
});