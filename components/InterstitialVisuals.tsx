// components/InterstitialVisuals.tsx
// Two visuals only now: PatternLineup (with the user's own selection
// highlighted) and CuticleStrands. The history interstitial deliberately
// has no visual — restraint is the gesture for that content.

import { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, G, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';

// ════════════════════════════════════════════════════════════════
// 1. Pattern lineup — twelve curl patterns. The user's own selected
//    pattern is rendered in violet at heavier stroke; the rest in
//    soft ink. Specificity is the move that makes this stop reading
//    as a generic infographic — the user sees themselves in the row.
// ════════════════════════════════════════════════════════════════

const PATTERNS = ['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C', '4A', '4B', '4C'];

function curlPath(type: string): { d: string; sw: number } {
  const cx = 25;
  if (type === '1A') return { d: `M${cx} 4 L${cx} 60`, sw: 1.4 };
  if (type === '1B') return { d: `M${cx} 4 Q${cx+3} 20, ${cx} 32 Q${cx-3} 46, ${cx} 60`, sw: 1.6 };
  if (type === '1C') return { d: `M${cx} 4 L${cx} 60`, sw: 2.4 };
  if (type === '2A') return { d: `M${cx} 4 Q${cx+8} 14, ${cx} 22 Q${cx-8} 30, ${cx} 38 Q${cx+8} 46, ${cx} 54 L${cx} 60`, sw: 1.4 };
  if (type === '2B') return { d: `M${cx} 4 Q${cx+10} 11, ${cx} 18 Q${cx-10} 25, ${cx} 32 Q${cx+10} 39, ${cx} 46 Q${cx-10} 53, ${cx} 60`, sw: 1.4 };
  if (type === '2C') return { d: `M${cx} 4 Q${cx+12} 9, ${cx} 14 Q${cx-12} 19, ${cx} 24 Q${cx+12} 29, ${cx} 34 Q${cx-12} 39, ${cx} 44 Q${cx+12} 49, ${cx} 54 Q${cx-12} 59, ${cx} 60`, sw: 1.4 };
  if (type === '3A') return { d: `M${cx} 4 C${cx+14} 6, ${cx+14} 14, ${cx} 16 C${cx-14} 18, ${cx-14} 26, ${cx} 28 C${cx+14} 30, ${cx+14} 38, ${cx} 40 C${cx-14} 42, ${cx-14} 50, ${cx} 52 L${cx} 60`, sw: 1.3 };
  if (type === '3B') return { d: `M${cx} 4 C${cx+12} 5, ${cx+12} 11, ${cx} 12 C${cx-12} 13, ${cx-12} 19, ${cx} 20 C${cx+12} 21, ${cx+12} 27, ${cx} 28 C${cx-12} 29, ${cx-12} 35, ${cx} 36 C${cx+12} 37, ${cx+12} 43, ${cx} 44 C${cx-12} 45, ${cx-12} 51, ${cx} 52 C${cx+12} 53, ${cx+12} 59, ${cx} 60`, sw: 1.2 };
  if (type === '3C') return { d: `M${cx} 4 C${cx+10} 5, ${cx+10} 9, ${cx} 10 C${cx-10} 11, ${cx-10} 15, ${cx} 16 C${cx+10} 17, ${cx+10} 21, ${cx} 22 C${cx-10} 23, ${cx-10} 27, ${cx} 28 C${cx+10} 29, ${cx+10} 33, ${cx} 34 C${cx-10} 35, ${cx-10} 39, ${cx} 40 C${cx+10} 41, ${cx+10} 45, ${cx} 46 C${cx-10} 47, ${cx-10} 51, ${cx} 52 C${cx+10} 53, ${cx+10} 57, ${cx} 58 C${cx-10} 59, ${cx-10} 60, ${cx} 60`, sw: 1.2 };
  if (type === '4A') return { d: `M${cx} 4 C${cx+8} 5, ${cx+8} 8, ${cx} 9 C${cx-8} 10, ${cx-8} 13, ${cx} 14 C${cx+8} 15, ${cx+8} 18, ${cx} 19 C${cx-8} 20, ${cx-8} 23, ${cx} 24 C${cx+8} 25, ${cx+8} 28, ${cx} 29 C${cx-8} 30, ${cx-8} 33, ${cx} 34 C${cx+8} 35, ${cx+8} 38, ${cx} 39 C${cx-8} 40, ${cx-8} 43, ${cx} 44 C${cx+8} 45, ${cx+8} 48, ${cx} 49 C${cx-8} 50, ${cx-8} 53, ${cx} 54 C${cx+8} 55, ${cx+8} 58, ${cx} 60`, sw: 1.2 };
  if (type === '4B') {
    let y = 4; let d = `M${cx} ${y}`; let left = true;
    while (y + 5 <= 60) { y += 5; d += ` L${left ? cx-9 : cx+9} ${y}`; left = !left; }
    return { d, sw: 1.2 };
  }
  if (type === '4C') {
    let d = `M${cx} 4`;
    for (let y = 4; y + 4 <= 60; y += 4) {
      d += ` C${cx+7} ${y+1}, ${cx+7} ${y+3}, ${cx} ${y+4} C${cx-7} ${y+5}, ${cx-7} ${y+7}, ${cx} ${y+8}`;
      y += 4;
    }
    return { d, sw: 1.1 };
  }
  return { d: `M${cx} 4 L${cx} 60`, sw: 1.4 };
}

function PatternCell({ type, index, isSelected }: { type: string; index: number; isSelected: boolean }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(6);

  useEffect(() => {
    opacity.value = withDelay(index * 70, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(index * 70, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [index]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  const { d, sw } = curlPath(type);
  const strokeColor = isSelected ? Colors.violet : Colors.ink;
  const strokeWidth = isSelected ? sw + 0.6 : sw;
  const strokeOpacity = isSelected ? 1 : 0.55;

  return (
    <Animated.View style={[plStyles.cell, style]}>
      <Svg width={28} height={56} viewBox="0 0 50 64">
        <Path
          d={d}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={strokeOpacity}
        />
      </Svg>
      <Text style={[plStyles.cellLabel, isSelected && plStyles.cellLabelSelected]}>
        {type}
      </Text>
    </Animated.View>
  );
}

export function PatternLineup({ selectedType }: { selectedType?: string }) {
  return (
    <View style={plStyles.wrap}>
      <View style={plStyles.hairline} />
      <View style={plStyles.row}>
        {PATTERNS.map((p, i) => (
          <PatternCell key={p} type={p} index={i} isSelected={p === selectedType} />
        ))}
      </View>
      <View style={plStyles.hairline} />
      {selectedType && (
        <Text style={plStyles.caption}>yours · {selectedType}</Text>
      )}
    </View>
  );
}

const plStyles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  hairline: { height: 1, backgroundColor: 'rgba(51,36,99,0.16)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18 },
  cell: { alignItems: 'center', flex: 1, gap: 10 },
  cellLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.2,
    opacity: 0.7,
  },
  cellLabelSelected: {
    fontFamily: Fonts.bodyBold,
    color: Colors.violet,
    opacity: 1,
  },
  caption: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: 12,
    color: Colors.muted,
    letterSpacing: 0.4,
    textAlign: 'right',
    paddingTop: 10,
    paddingRight: 4,
  },
});

// ════════════════════════════════════════════════════════════════
// 2. Cuticle strands — kept from prior iteration. Tonally fine for
//    chemistry content. Ink strokes, violet droplets as accent,
//    hairline divider, italic captions.
// ════════════════════════════════════════════════════════════════

function ClosedStrand() {
  return (
    <Svg width={50} height={150} viewBox="0 0 50 150">
      <Path d="M25 4 L25 146" stroke={Colors.ink} strokeWidth={2.4} strokeLinecap="round" />
      {Array.from({ length: 12 }).map((_, i) => (
        <Line
          key={i}
          x1={20} y1={14 + i * 11}
          x2={30} y2={14 + i * 11}
          stroke={Colors.ink} strokeWidth={1} opacity={0.5}
        />
      ))}
    </Svg>
  );
}

function OpenStrand() {
  return (
    <Svg width={50} height={150} viewBox="0 0 50 150">
      <Path d="M25 4 L25 146" stroke={Colors.ink} strokeWidth={2.4} strokeLinecap="round" />
      {Array.from({ length: 12 }).map((_, i) => (
        <G key={i}>
          <Line
            x1={25} y1={14 + i * 11}
            x2={15} y2={9 + i * 11}
            stroke={Colors.ink} strokeWidth={1} opacity={0.5}
          />
          <Line
            x1={25} y1={14 + i * 11}
            x2={35} y2={9 + i * 11}
            stroke={Colors.ink} strokeWidth={1} opacity={0.5}
          />
        </G>
      ))}
    </Svg>
  );
}

function Droplet({ delay, behaviour }: { delay: number; behaviour: 'roll' | 'absorb' }) {
  const ty = useSharedValue(-30);
  const tx = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const loop = () => {
      ty.value = -30; tx.value = 0; opacity.value = 0; scale.value = 1;
      opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
      ty.value = withDelay(delay, withTiming(70, { duration: 750, easing: Easing.in(Easing.quad) }));
      if (behaviour === 'roll') {
        tx.value = withDelay(delay + 750, withTiming(30, { duration: 500, easing: Easing.out(Easing.quad) }));
        ty.value = withDelay(delay + 750, withTiming(120, { duration: 500, easing: Easing.in(Easing.quad) }));
        opacity.value = withDelay(delay + 1150, withTiming(0, { duration: 200 }));
      } else {
        scale.value = withDelay(delay + 750, withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }));
        opacity.value = withDelay(delay + 1050, withTiming(0, { duration: 100 }));
      }
    };
    loop();
    const id = setInterval(loop, 2600);
    return () => clearInterval(id);
  }, [delay, behaviour]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[csStyles.droplet, style]}>
      <Svg width={10} height={14} viewBox="0 0 10 14">
        <Path d="M5 1 C2 6, 1 8, 1 10 A4 4 0 0 0 9 10 C9 8, 8 6, 5 1 Z" fill={Colors.violet} />
      </Svg>
    </Animated.View>
  );
}

export function CuticleStrands() {
  return (
    <View style={csStyles.wrap}>
      <View style={csStyles.col}>
        <View style={csStyles.strandStage}>
          <Droplet delay={200} behaviour="roll" />
          <ClosedStrand />
        </View>
        <Text style={csStyles.label}>CLOSED</Text>
        <Text style={csStyles.caption}>rolls off</Text>
      </View>
      <View style={csStyles.divider} />
      <View style={csStyles.col}>
        <View style={csStyles.strandStage}>
          <Droplet delay={500} behaviour="absorb" />
          <OpenStrand />
        </View>
        <Text style={csStyles.label}>OPEN</Text>
        <Text style={csStyles.caption}>absorbs</Text>
      </View>
    </View>
  );
}

const csStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  strandStage: {
    width: 60, height: 160,
    alignItems: 'center', justifyContent: 'flex-start',
    position: 'relative',
    marginBottom: 6,
  },
  droplet: { position: 'absolute', top: 0, zIndex: 2 },
  divider: {
    width: 1, height: 200,
    backgroundColor: 'rgba(51,36,99,0.16)',
    marginHorizontal: 12,
  },
  label: {
    fontFamily: Fonts.headingSemi, fontSize: 13, color: Colors.ink,
    letterSpacing: 3.5,
  },
  caption: {
    fontFamily: Fonts.body, fontStyle: 'italic',
    fontSize: 12, color: Colors.muted, letterSpacing: 0.3,
  },
});