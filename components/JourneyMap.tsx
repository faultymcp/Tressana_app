// components/JourneyMap.tsx
// Mailchimp-style 4-phase journey indicator with motion:
//   - Current node breathes (gentle scale loop)
//   - Connectors fill left-to-right as phases complete

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';

export type Phase = 'texture' | 'scalp' | 'story' | 'plan';

const PHASES: { id: Phase; label: string }[] = [
  { id: 'texture', label: 'Texture' },
  { id: 'scalp',   label: 'Scalp'   },
  { id: 'story',   label: 'Story'   },
  { id: 'plan',    label: 'Plan'    },
];

type Props = {
  currentPhase?: Phase | null;
  completedPhases?: Phase[];
  compact?: boolean;
};

const NODE = 26;
const NODE_C = 16;

function BreathingNode({
  size, isCurrent, isDone, compact,
}: { size: number; isCurrent: boolean; isDone: boolean; compact: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isCurrent && !isDone) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isCurrent, isDone]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        s.node,
        { width: size, height: size, borderRadius: size / 2 },
        isCurrent && s.nodeCurrent,
        isDone && s.nodeDone,
        animStyle,
      ]}
    >
      {isDone && (
        <Svg width={compact ? 9 : 11} height={compact ? 9 : 11} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
          <Path d="M20 6L9 17l-5-5" />
        </Svg>
      )}
      {isCurrent && !isDone && <View style={[s.dot, compact && s.dotCompact]} />}
    </Animated.View>
  );
}

function FillingConnector({
  filled, compact,
}: { filled: boolean; compact: boolean }) {
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    fill.value = withTiming(filled ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [filled]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  return (
    <View
      style={[
        s.connector,
        compact && s.connectorCompact,
      ]}
    >
      <Animated.View
        style={[
          s.connectorFill,
          compact && s.connectorFillCompact,
          fillStyle,
        ]}
      />
    </View>
  );
}

export default function JourneyMap({ currentPhase, completedPhases = [], compact = false }: Props) {
  const nodeSize = compact ? NODE_C : NODE;
  const connectorTop = nodeSize / 2 - 1;

  return (
    <View style={[s.wrap, compact && s.wrapCompact]}>
      <View style={s.row}>
        {PHASES.map((p, i) => {
          const isCurrent = currentPhase === p.id;
          const isDone = completedPhases.includes(p.id);
          const isLast = i === PHASES.length - 1;
          const connectorFilled = isDone;

          return (
            <React.Fragment key={p.id}>
              <View style={s.col}>
                <BreathingNode size={nodeSize} isCurrent={isCurrent} isDone={isDone} compact={compact} />
                {!compact && (
                  <Text
                    style={[
                      s.label,
                      isCurrent && s.labelCurrent,
                      isDone && s.labelDone,
                    ]}
                    numberOfLines={1}
                  >
                    {p.label}
                  </Text>
                )}
              </View>

              {!isLast && (
                <View style={[s.connectorWrap, { marginTop: connectorTop }]}>
                  <FillingConnector filled={connectorFilled} compact={compact} />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', paddingVertical: 6 },
  wrapCompact: { paddingVertical: 0 },

  row: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { alignItems: 'center' },

  node: {
    borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.porcelain,
    alignItems: 'center', justifyContent: 'center',
  },
  nodeCurrent: {
    borderColor: Colors.violet,
    backgroundColor: '#fff',
    shadowColor: Colors.violet,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  nodeDone: { backgroundColor: Colors.violet, borderColor: Colors.violet },

  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.violet },
  dotCompact: { width: 6, height: 6, borderRadius: 3 },

  // Connector (track + animated fill)
  connectorWrap: { flex: 1, marginHorizontal: 4 },
  connector: {
    height: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  connectorCompact: { height: 1.5 },
  connectorFill: {
    height: '100%',
    width: '100%',
    backgroundColor: Colors.violet,
    transformOrigin: 'left' as any,
  },
  connectorFillCompact: {},

  label: {
    marginTop: 8,
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelCurrent: { color: Colors.violet, fontFamily: Fonts.bodySemi },
  labelDone: { color: Colors.ink },
});