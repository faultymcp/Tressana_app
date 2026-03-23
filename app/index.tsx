import { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  // Animations
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const lineWidth = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const glow1Opacity = useSharedValue(0.2);
  const glow2Opacity = useSharedValue(0.15);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
    opacity: lineWidth.value > 0 ? 1 : 0,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const glow1Style = useAnimatedStyle(() => ({
    opacity: glow1Opacity.value,
  }));

  const glow2Style = useAnimatedStyle(() => ({
    opacity: glow2Opacity.value,
  }));

  useEffect(() => {
    // Logo fade + scale in
    logoOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });

    // Gradient line expands
    lineWidth.value = withDelay(300, withTiming(48, { duration: 600, easing: Easing.out(Easing.cubic) }));

    // Tagline fades in
    taglineOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    // Glow pulses
    glow1Opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1500 }),
        withTiming(0.2, { duration: 1500 })
      ),
      -1,
      true
    );
    glow2Opacity.value = withDelay(
      750,
      withRepeat(
        withSequence(
          withTiming(0.35, { duration: 1500 }),
          withTiming(0.15, { duration: 1500 })
        ),
        -1,
        true
      )
    );

    // Check auth and navigate after 2.2s
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[Colors.inkDeep, '#1a1040', Colors.inkDeep]}
        style={StyleSheet.absoluteFill}
      />

      {/* Glow orbs */}
      <Animated.View style={[styles.glow1, glow1Style]} />
      <Animated.View style={[styles.glow2, glow2Style]} />

      {/* Content */}
      <Animated.View style={[styles.center, logoStyle]}>
        <Text style={styles.logo}>
          Tressana<Text style={styles.logoDot}>.ai</Text>
        </Text>
      </Animated.View>

      <Animated.View style={[styles.lineWrap, lineStyle]}>
        <LinearGradient
          colors={[Colors.pink, Colors.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.line}
        />
      </Animated.View>

      <Animated.View style={[styles.taglineWrap, taglineStyle]}>
        <Text style={styles.tagline}>YOUR DIGITAL HOME FOR HAIR DECISIONS</Text>
      </Animated.View>
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
  glow1: {
    position: 'absolute',
    top: height * 0.2,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.violet,
  },
  glow2: {
    position: 'absolute',
    bottom: height * 0.25,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.pink,
  },
  center: {
    alignItems: 'center',
    zIndex: 1,
  },
  logo: {
    fontFamily: Fonts.heading,
    fontSize: 36,
    color: Colors.porcelain,
    letterSpacing: -1,
  },
  logoDot: {
    color: Colors.pink,
  },
  lineWrap: {
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
    marginTop: 12,
    zIndex: 1,
  },
  line: {
    flex: 1,
    height: 2,
  },
  taglineWrap: {
    marginTop: 12,
    zIndex: 1,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 2.5,
    color: Colors.lavender,
    textTransform: 'uppercase',
  },
});