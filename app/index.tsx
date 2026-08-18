import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Motion } from '@/constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// Ceremonial screen — deep violet ground per BRAND.md §3.
// One typographic moment, one rule, one label. Nothing pulses.

const EASE = Easing.out(Easing.cubic);

export default function SplashScreen() {
  const router = useRouter();

  const markOpacity = useSharedValue(0);
  const markLift = useSharedValue(8);
  const ruleScale = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ translateY: markLift.value }],
  }));
  const ruleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: ruleScale.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: Motion.slow, easing: EASE });
    markLift.value = withTiming(0, { duration: Motion.slow, easing: EASE });
    ruleScale.value = withDelay(Motion.medium, withTiming(1, { duration: Motion.slow, easing: EASE }));
    labelOpacity.value = withDelay(Motion.slow, withTiming(1, { duration: Motion.medium, easing: EASE }));

    // Always go to onboarding. No auth check. Beta-test mode.
    const timer = setTimeout(() => router.replace('/onboarding'), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.inkDeep, '#1A1038', Colors.inkDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.stack}>
        <Animated.View style={markStyle}>
          <Text style={styles.mark}>Tressie</Text>
        </Animated.View>

        <Animated.View style={[styles.rule, ruleStyle]} />

        <Animated.View style={labelStyle}>
          <Text style={styles.label}>Hair, read back to you</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inkDeep,
  },
  stack: {
    alignItems: 'center',
  },
  mark: {
    fontFamily: Fonts.heading,
    fontSize: 54,
    lineHeight: 60,
    color: Colors.porcelain,
    letterSpacing: -1.6,
  },
  rule: {
    width: 28,
    height: 1,
    marginTop: 20,
    backgroundColor: Colors.lime,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 11,
    letterSpacing: 2.4,
    lineHeight: 16,
    marginTop: 20,
    color: Colors.muted,
    textTransform: 'uppercase',
  },
});