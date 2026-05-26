import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Colors, Fonts, Radius } from '@/constants/theme';

// ════════════════════════════════════════════════════════════════
// Three steps. One layout. One progress indicator. One motion.
//
// Design rules I'm enforcing:
//   - No back button. Device back gesture handles it. Onboarding is forward.
//   - "Skip" is a plain text link, not a chromed pill. It's a courtesy, not a control.
//   - Segmented progress bar, top. Replaces the dots + journey map combo.
//   - Photo cross-fades behind content. No layout break between steps.
//   - Content block moves ONCE per step (8px translateY + fade, 320ms). Not three
//     staggered text reveals.
//   - Solid violet button, no gradient. Gradient buttons read as 2018.
//   - Title is the message. Body is one short sentence. No eyebrow label.
//   - Final CTA changes word; nothing else changes.
// ════════════════════════════════════════════════════════════════

const { height } = Dimensions.get('window');
const PHOTO_HEIGHT = height * 0.56;

const STEPS = [
  {
    title: 'Hair care that\nmeets you where\nyou are.',
    body: "Whether you're wearing your natural texture, in braids, transitioning, or recovering from a transplant, the routine you get adapts to that.",
    image: require('@/assets/onboard-1.jpg'),
  },
  {
    title: "We don't ask you\nto translate\nyour hair.",
    body: 'Curl pattern, porosity, scalp, history — we ask in plain language. No charts to interpret, no category to fit yourself into.',
    image: require('@/assets/onboard-2.jpg'),
  },
  {
    title: 'Your routine\nshould fit today,\nnot a label.',
    body: 'Hair changes — postpartum, seasonally, after styles, with age. We rebuild your routine when you tell us things shift.',
    image: require('@/assets/onboard-3.jpg'),
  },
];

// ─── Segmented progress ─────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <ProgressSegment key={i} active={i <= step} index={i} stepIndex={step} />
      ))}
    </View>
  );
}

function ProgressSegment({ active, index, stepIndex }: { active: boolean; index: number; stepIndex: number }) {
  const fill = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    fill.value = withTiming(active ? 1 : 0, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [active, stepIndex]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  return (
    <View style={s.progressSegment}>
      <Animated.View style={[s.progressFill, fillStyle]} />
    </View>
  );
}

// ─── Pressable button with spring scale ─────────────────────────
function CTAButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1);

  const onIn = () => { scale.value = withSpring(0.97, { damping: 18, stiffness: 380 }); };
  const onOut = () => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress} style={s.btn}>
        <Text style={s.btnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  // Single content motion: a small fade-and-slide on the whole block per step.
  const blockOpacity = useSharedValue(0);
  const blockY = useSharedValue(8);

  useEffect(() => {
    blockOpacity.value = 0;
    blockY.value = 8;
    blockOpacity.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
    blockY.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [step]);

  const blockStyle = useAnimatedStyle(() => ({
    opacity: blockOpacity.value,
    transform: [{ translateY: blockY.value }],
  }));

  const goToQuiz = () => router.replace('/quiz');

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isLast) goToQuiz();
    else setStep(s => s + 1);
  };

  return (
    <View style={s.container}>
      {/* Photo layer — cross-fades on step change */}
      <View style={s.photoArea}>
        <Animated.View
          key={`p-${step}`}
          entering={FadeIn.duration(450)}
          exiting={FadeOut.duration(300)}
          style={StyleSheet.absoluteFill}
        >
          <Image source={current.image} style={s.photo} resizeMode="cover" />
        </Animated.View>
        <LinearGradient
          colors={[
            'rgba(255,254,247,0)',
            'rgba(255,254,247,0)',
            'rgba(255,254,247,0.06)',
            'rgba(255,254,247,0.22)',
            'rgba(255,254,247,0.5)',
            'rgba(255,254,247,0.82)',
            Colors.porcelain,
          ]}
          locations={[0, 0.15, 0.32, 0.5, 0.68, 0.86, 1]}
          style={s.blend}
        />
      </View>

      {/* Top: progress + skip */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={s.progressWrap}>
          <ProgressBar step={step} total={STEPS.length} />
        </View>
        <Pressable onPress={goToQuiz} hitSlop={16} style={s.skipBtn}>
          <Text style={s.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Content — single block, single motion */}
      <Animated.View style={[s.content, blockStyle]} key={`c-${step}`}>
        <Text style={s.title}>{current.title}</Text>
        <Text style={s.body}>{current.body}</Text>
      </Animated.View>

      {/* Footer */}
      <View style={s.footer}>
        <CTAButton label={isLast ? 'Start the quiz' : 'Continue'} onPress={next} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  // Photo + gradient blend
  photoArea: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: PHOTO_HEIGHT,
  },
  photo: { width: '100%', height: '100%' },
  blend: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: PHOTO_HEIGHT * 0.72,
  },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 24,
  },
  progressWrap: { flex: 1 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressSegment: {
    flex: 1, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%', height: '100%',
    backgroundColor: Colors.white,
    transformOrigin: 'left' as any,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  skipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 0.4,
  },

  // Content
  content: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 152 : 132,
    left: 0, right: 0,
    paddingHorizontal: 28,
    gap: 14,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 30,
    color: Colors.ink,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.ink,
    opacity: 0.66,
    lineHeight: 22,
    maxWidth: 360,
  },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    paddingTop: 12,
    backgroundColor: Colors.porcelain,
  },
  btn: {
    width: '100%',
    paddingVertical: 17,
    borderRadius: Radius.lg,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  btnText: {
    fontFamily: Fonts.headingSemi,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.2,
  },
});