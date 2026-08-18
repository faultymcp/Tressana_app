import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  ChevronDown: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round"><Path d="M6 9l6 6 6-6" /></Svg>,
  ChevronUp: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={2} strokeLinecap="round"><Path d="M18 15l-6-6-6 6" /></Svg>,
  Mail: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><Path d="M22 6l-10 7L2 6" /></Svg>,
  Globe: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M2 12h20" /></Svg>,
  MessageCircle: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></Svg>,
};

const FAQS = [
  { q: 'How does the hair quiz work?', a: 'The quiz asks about your hair type, porosity, scalp condition, goals, and current hair setup (natural, braids, extensions, etc.). Based on your answers, Tressie builds a personalised routine with daily and weekly steps specific to your hair.' },
  { q: 'What hair types does Tressie support?', a: 'Every hair type from 1A to 4C, plus braids, sewn-in extensions, clip-ins, wigs, locs, relaxed hair, colour-treated hair, heat-styled hair, and hair transplant recovery. Your routine adapts to your specific situation.' },
  { q: 'How does XP work?', a: 'You earn XP by completing routine steps, using the app daily, trying the AI hair try-on, rating products, and referring friends. XP can be redeemed for appointment discounts and try-on credits.' },
  { q: 'What is the AI Hair Try-On?', a: 'Upload a selfie and a reference photo of any hairstyle. Our AI generates a 4K image showing how that style would look on you. Pro subscribers get 5 try-ons per month, Pro+ gets 15. Extra try-ons can be purchased via your wallet.' },
  { q: 'How do I cancel my subscription?', a: 'Go to Profile, then Subscription, then tap Cancel subscription at the bottom. You will retain access until the end of your current billing period.' },
  { q: 'Is my data safe?', a: 'Yes. Your data is stored securely on Supabase (EU-hosted). We never sell your personal information. You can export or delete all your data from Settings at any time.' },
  { q: 'How do salon bookings work?', a: 'Browse verified salons in the Salons tab, filtered by your hair type. Book directly through the app. You can apply XP discount codes at checkout. Tressie takes a small commission from the salon, not from you.' },
  { q: 'I have braids — will the routine work for me?', a: 'Absolutely. When you select braids in the quiz, your routine includes braid-specific steps like scalp cleansing between braids, edge care, lightweight oil application, and removal timing reminders. The advice adapts to whether you have box braids, cornrows, or knotless braids.' },
];

export default function HelpScreen() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Contact options */}
        <Text style={st.sectionLabel}>Get in touch</Text>
        <View style={st.contactCard}>
          <Pressable onPress={() => Linking.openURL('mailto:hello@tressie.ai')} style={st.contactRow}>
            <View style={st.contactIcon}><IC.Mail /></View>
            <View style={st.contactBody}>
              <Text style={st.contactTitle}>Email us</Text>
              <Text style={st.contactSub}>hello@tressie.ai</Text>
            </View>
          </Pressable>
          <View style={st.contactDivider} />
          <Pressable onPress={() => Linking.openURL('https://tressie.ai')} style={st.contactRow}>
            <View style={st.contactIcon}><IC.Globe /></View>
            <View style={st.contactBody}>
              <Text style={st.contactTitle}>Visit our website</Text>
              <Text style={st.contactSub}>tressie.ai</Text>
            </View>
          </Pressable>
          <View style={st.contactDivider} />
          <Pressable onPress={() => Linking.openURL('https://instagram.com/tressie.ai')} style={st.contactRow}>
            <View style={st.contactIcon}><IC.MessageCircle /></View>
            <View style={st.contactBody}>
              <Text style={st.contactTitle}>Message us on Instagram</Text>
              <Text style={st.contactSub}>@tressie.ai</Text>
            </View>
          </Pressable>
        </View>

        {/* FAQ */}
        <Text style={st.sectionLabel}>Frequently asked questions</Text>
        <View style={st.faqCard}>
          {FAQS.map((faq, i) => {
            const isOpen = expanded === i;
            return (
              <Pressable key={i} onPress={() => setExpanded(isOpen ? null : i)} style={[st.faqItem, i === FAQS.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={st.faqHeader}>
                  <Text style={[st.faqQ, isOpen && { color: Colors.violet }]}>{faq.q}</Text>
                  {isOpen ? <IC.ChevronUp /> : <IC.ChevronDown />}
                </View>
                {isOpen && <Text style={st.faqA}>{faq.a}</Text>}
              </Pressable>
            );
          })}
        </View>
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

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 10, marginTop: 8,
  },

  contactCard: {
    marginHorizontal: 20, marginBottom: 24, backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  contactIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center' },
  contactBody: { flex: 1 },
  contactTitle: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink, marginBottom: 1 },
  contactSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  contactDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 18 },

  faqCard: {
    marginHorizontal: 20, backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  faqItem: { paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: Colors.border },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink, flex: 1, marginRight: 12 },
  faqA: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20, marginTop: 10 },
});