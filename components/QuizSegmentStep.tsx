// components/QuizSegmentStep.tsx
// Single source of truth for segment data. Imported by app/quiz.tsx.
// No internal ScrollView — the parent quiz screen owns scrolling.

import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';

export type SegmentId =
  | 'natural' | 'braids' | 'sewn_in' | 'clip_in' | 'wig' | 'locs'
  | 'relaxed' | 'colour_treated' | 'heat_styled' | 'transplant'
  | 'postpartum' | 'medical';

export type Segment = {
  id: SegmentId;
  label: string;
  description: string;
};

// ─── Icons ───────────────────────────────────────────────────────
const ICON_PROPS = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none' as const };
const STROKE = (active: boolean) => active ? Colors.violet : Colors.muted;

function IcNatural({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M6 4c2 4 2 8 0 12M12 2c2 5 2 10 0 14M18 4c-2 4-2 8 0 12M4 18c4 2 12 2 16 0" /></Svg>; }
function IcBraids({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M8 2v20M16 2v20M8 6l8 4M8 14l8 4M8 10l8-4M8 18l8-4" /></Svg>; }
function IcSewnIn({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M4 6h16M4 6c0 2 2 14 8 16 6-2 8-14 8-16M8 10h8M9 14h6" /></Svg>; }
function IcClipIn({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M4 8h16M7 8v3M12 8v4M17 8v3M9 14c0 4 6 4 6 0" /></Svg>; }
function IcWig({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M4 12c0-5 3.5-9 8-9s8 4 8 9" /><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M4 12c0 4 2 8 4 10M20 12c0 4-2 8-4 10M9 8c1.5-1 4.5-1 6 0" /></Svg>; }
function IcLocs({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M7 2c0 4-1 8-1 12s1 8 1 8M12 2c0 4 0 8 0 12s0 8 0 8M17 2c0 4 1 8 1 12s-1 8-1 8" /></Svg>; }
function IcRelaxed({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M5 3v18M9 3v18M13 3v18M17 3v18" /></Svg>; }
function IcColour({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Circle stroke={STROKE(active)} strokeWidth={1.6} cx="12" cy="12" r="9" /><Circle stroke={STROKE(active)} strokeWidth={1.4} cx="9" cy="9" r="1.6" /><Circle stroke={STROKE(active)} strokeWidth={1.4} cx="15" cy="9" r="1.6" /><Circle stroke={STROKE(active)} strokeWidth={1.4} cx="12" cy="15" r="1.6" /></Svg>; }
function IcHeat({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M12 2c2 3 0 5 0 7s2 3 0 6M8 4c1.5 2 0 4 0 5M16 4c-1.5 2 0 4 0 5M6 14c0 5 3 8 6 8s6-3 6-8z" /></Svg>; }
function IcTransplant({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M5 12c0-5 3-9 7-9s7 4 7 9M5 12c0 1 .5 2 1 3M19 12c0 1-.5 2-1 3" /><Circle stroke={STROKE(active)} strokeWidth={1.4} cx="9" cy="8" r="0.8" fill={STROKE(active)} /><Circle stroke={STROKE(active)} strokeWidth={1.4} cx="12" cy="6" r="0.8" fill={STROKE(active)} /><Circle stroke={STROKE(active)} strokeWidth={1.4} cx="15" cy="8" r="0.8" fill={STROKE(active)} /><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M9 16l3 6 3-6" /></Svg>; }
function IcPostpartum({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M12 21s-7-5-7-11a4 4 0 017-2.5A4 4 0 0119 10c0 6-7 11-7 11z" /></Svg>; }
function IcMedical({ active }: { active: boolean }) { return <Svg {...ICON_PROPS}><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7z" /><Path stroke={STROKE(active)} strokeWidth={1.6} strokeLinecap="round" d="M12 9v6M9 12h6" /></Svg>; }

const ICONS: Record<SegmentId, (p: { active: boolean }) => JSX.Element> = {
  natural: IcNatural,
  braids: IcBraids,
  sewn_in: IcSewnIn,
  clip_in: IcClipIn,
  wig: IcWig,
  locs: IcLocs,
  relaxed: IcRelaxed,
  colour_treated: IcColour,
  heat_styled: IcHeat,
  transplant: IcTransplant,
  postpartum: IcPostpartum,
  medical: IcMedical,
};

export const SEGMENTS: Segment[] = [
  { id: 'natural', label: 'Wearing my natural texture', description: 'No current protective style or extensions' },
  { id: 'braids', label: 'Braids', description: 'Box braids, cornrows, knotless, micro braids' },
  { id: 'sewn_in', label: 'Sewn-in extensions or weave', description: 'Weaves, sew-ins, bonded tracks' },
  { id: 'clip_in', label: 'Clip-in extensions', description: 'Temporary clip-in pieces' },
  { id: 'wig', label: 'Wigs', description: 'Lace fronts, full wigs, U-part wigs' },
  { id: 'locs', label: 'Locs', description: 'Dreadlocks, sisterlocks, faux locs' },
  { id: 'relaxed', label: 'Relaxed or permed', description: 'Chemically straightened hair' },
  { id: 'colour_treated', label: 'Colour treated', description: 'Bleached, dyed, or highlighted' },
  { id: 'heat_styled', label: 'Regular heat styling', description: 'Frequent flat iron, blow dryer, curling iron' },
  { id: 'transplant', label: 'Hair transplant', description: 'Post-transplant recovery or maintenance' },
  { id: 'postpartum', label: 'Postpartum', description: 'Going through postpartum hair changes or shedding' },
  { id: 'medical', label: 'Medical hair loss', description: 'Chemotherapy, alopecia, or other medical treatment' },
];

type Props = {
  selected: string[];
  onSelect: (segments: string[]) => void;
};

export default function QuizSegmentStep({ selected, onSelect }: Props) {
  const toggle = (id: SegmentId) => {
    Haptics.selectionAsync().catch(() => {});
    if (selected.includes(id)) {
      onSelect(selected.filter(s => s !== id));
    } else {
      onSelect([...selected, id]);
    }
  };

  return (
    <View style={st.list}>
      {SEGMENTS.map((seg, i) => {
        const Icon = ICONS[seg.id];
        const active = selected.includes(seg.id);
        return (
          <Animated.View key={seg.id} entering={FadeInUp.delay(40 * i).duration(220)}>
            <Pressable
              onPress={() => toggle(seg.id)}
              style={({ pressed }) => [st.card, active && st.cardActive, pressed && st.cardPressed]}
            >
              <View style={[st.iconWrap, active && st.iconWrapActive]}>
                <Icon active={active} />
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
          </Animated.View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  list: { gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  cardActive: { borderColor: Colors.violet, backgroundColor: 'rgba(118,67,172,0.04)' },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
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