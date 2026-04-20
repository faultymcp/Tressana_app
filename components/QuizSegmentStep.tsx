// components/QuizSegmentStep.tsx
// Add this as a step in your existing quiz.tsx flow
// Asks: "What best describes your current hair setup?"
// Saves segments to the quiz data alongside hairType, porosity, goals, etc.

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

type Segment = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

// ─── Icons ───────────────────────────────────────────────────────
function IcNatural() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M12 2C14 6 14 10 12 14C10 10 10 6 12 2" /></Svg>; }
function IcBraids() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M8 2v20M16 2v20M8 6l8 4M8 14l8 4" /></Svg>; }
function IcExtensions() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M12 2v8M8 10h8M6 10c0 6 2 12 6 12s6-6 6-12" /></Svg>; }
function IcWig() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M4 12c0-5 3.5-9 8-9s8 4 8 9" /><Path d="M4 12c0 4 2 8 4 10M20 12c0 4-2 8-4 10" /></Svg>; }
function IcLocs() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M8 2c0 4-2 8-2 12s2 8 2 8M16 2c0 4 2 8 2 12s-2 8-2 8M12 2v20" /></Svg>; }
function IcRelaxed() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M4 12h16M4 8c4 0 4 4 8 4s4-4 8-4M4 16c4 0 4-4 8-4s4 4 8 4" /></Svg>; }
function IcColour() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Circle cx="9" cy="9" r="2" /><Circle cx="15" cy="9" r="2" /><Circle cx="12" cy="15" r="2" /></Svg>; }
function IcHeat() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M12 2v4M8 4v4M16 4v4M6 10h12v4c0 4-2.5 8-6 8s-6-4-6-8v-4z" /></Svg>; }
function IcTransplant() { return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M12 2C8 2 4 6 4 12c0 2 .5 4 1.5 5.5M12 2c4 0 8 4 8 10 0 2-.5 4-1.5 5.5" /><Path d="M9 16l3 6 3-6" /><Circle cx="12" cy="8" r="2" /></Svg>; }

const SEGMENTS: Segment[] = [
  { id: 'natural', label: 'Natural hair', description: 'Wearing my natural texture (1A–4C)', icon: <IcNatural /> },
  { id: 'braids', label: 'Braids', description: 'Box braids, cornrows, knotless, micro braids', icon: <IcBraids /> },
  { id: 'sewn_in', label: 'Sewn-in extensions', description: 'Weaves, sew-ins, tracks', icon: <IcExtensions /> },
  { id: 'clip_in', label: 'Clip-in extensions', description: 'Temporary clip-in pieces', icon: <IcExtensions /> },
  { id: 'wig', label: 'Wigs', description: 'Lace fronts, full wigs, U-part wigs', icon: <IcWig /> },
  { id: 'locs', label: 'Locs', description: 'Dreadlocks, sisterlocks, faux locs', icon: <IcLocs /> },
  { id: 'relaxed', label: 'Relaxed / permed', description: 'Chemically straightened hair', icon: <IcRelaxed /> },
  { id: 'colour_treated', label: 'Colour treated', description: 'Bleached, dyed, highlighted', icon: <IcColour /> },
  { id: 'heat_styled', label: 'Regular heat styling', description: 'Frequent flat iron, blow dryer, curling iron', icon: <IcHeat /> },
  { id: 'transplant', label: 'Hair transplant', description: 'Post-transplant recovery and maintenance', icon: <IcTransplant /> },
];

type Props = {
  selected: string[];
  onSelect: (segments: string[]) => void;
};

export default function QuizSegmentStep({ selected, onSelect }: Props) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onSelect(selected.filter(s => s !== id));
    } else {
      onSelect([...selected, id]);
    }
  };

  return (
    <View style={st.container}>
      <Text style={st.title}>What describes your hair right now?</Text>
      <Text style={st.subtitle}>Select all that apply. This helps us personalise your routine.</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.list}>
        {SEGMENTS.map(seg => {
          const active = selected.includes(seg.id);
          return (
            <Pressable
              key={seg.id}
              onPress={() => toggle(seg.id)}
              style={[st.card, active && st.cardActive]}
            >
              <View style={[st.iconWrap, active && st.iconWrapActive]}>
                {seg.icon}
              </View>
              <View style={st.cardBody}>
                <Text style={[st.cardLabel, active && st.cardLabelActive]}>{seg.label}</Text>
                <Text style={st.cardDesc}>{seg.description}</Text>
              </View>
              <View style={[st.checkbox, active && st.checkboxActive]}>
                {active && (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
                    <Path d="M20 6L9 17l-5-5" />
                  </Svg>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.ink, marginBottom: 6, paddingHorizontal: 20 },
  subtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginBottom: 20, paddingHorizontal: 20, lineHeight: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  cardActive: { borderColor: Colors.violet, backgroundColor: 'rgba(118,67,172,0.04)' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: 'rgba(118,67,172,0.12)' },
  cardBody: { flex: 1 },
  cardLabel: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.ink, marginBottom: 2 },
  cardLabelActive: { color: Colors.violet },
  cardDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 16 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.violet, borderColor: Colors.violet },
});
