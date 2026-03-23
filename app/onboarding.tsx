import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Radius } from '@/constants/theme';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const PHOTO_HEIGHT = height * 0.58;

const STEPS = [
  {
    tag: 'Step 1',
    title: 'A routine built for you',
    body: "Answer a few questions about your hair. We'll build a personalised routine you can track daily.",
    image: require('@/assets/onboard-1.jpg'),
  },
  {
    tag: 'Step 2',
    title: 'Stylists who get your texture',
    body: 'Find top-rated salons near you that specialise in your hair type. Real ratings, real reviews.',
    image: require('@/assets/onboard-2.jpg'),
  },
  {
    tag: 'Step 3',
    title: 'Products that actually work',
    body: 'Every recommendation is matched to your curl pattern and porosity. No more guesswork.',
    image: require('@/assets/onboard-3.jpg'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const goToQuiz = () => router.replace('/quiz');
  const next = () => (step < 2 ? setStep(s => s + 1) : goToQuiz());

  return (
    <View style={styles.container}>
      {/* Full-bleed image that extends behind the content area */}
      <View style={styles.imageArea}>
        <Animated.View key={`img-${step}`} entering={FadeIn.duration(500)} style={StyleSheet.absoluteFill}>
          <Image source={current.image} style={styles.image} resizeMode="cover" />
        </Animated.View>

        {/* 
          The blend: a very tall gradient that starts transparent at the top 
          and smoothly transitions to porcelain. Covers the ENTIRE bottom 
          half of the image so there is never a visible edge.
        */}
        <LinearGradient
          colors={[
            'rgba(255,254,247,0)',
            'rgba(255,254,247,0)',
            'rgba(255,254,247,0.05)',
            'rgba(255,254,247,0.15)',
            'rgba(255,254,247,0.35)',
            'rgba(255,254,247,0.6)',
            'rgba(255,254,247,0.85)',
            'rgba(255,254,247,0.95)',
            Colors.porcelain,
          ]}
          locations={[0, 0.1, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1]}
          style={styles.blend}
        />
      </View>

      {/* Skip */}
      <Pressable style={styles.skipBtn} onPress={goToQuiz}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Content — positioned to overlap into the faded image area */}
      <View style={styles.content}>
        <Animated.View key={`tag-${step}`} entering={FadeInUp.delay(80).duration(300)} style={styles.tagWrap}>
          <Text style={styles.tag}>{current.tag}</Text>
        </Animated.View>

        <Animated.Text key={`t-${step}`} entering={FadeInUp.delay(140).duration(350)} style={styles.title}>
          {current.title}
        </Animated.Text>

        <Animated.Text key={`b-${step}`} entering={FadeInUp.delay(200).duration(350)} style={styles.body}>
          {current.body}
        </Animated.Text>

        <View style={styles.dots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable onPress={next} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
          <LinearGradient
            colors={step === 2 ? [Colors.pink, Colors.violet] as any : [Colors.violet, Colors.violet] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnInner}
          >
            <Text style={styles.btnText}>{step < 2 ? 'Next' : 'Start my hair discovery'}</Text>
          </LinearGradient>
        </Pressable>
        {step === 2 && <Text style={styles.hint}>2 minutes · personalised to your hair</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  imageArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PHOTO_HEIGHT,
  },
  image: { width: '100%', height: '100%' },
  blend: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Covers 60% of the image from the bottom
    height: PHOTO_HEIGHT * 0.65,
  },

  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    right: 16,
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  skipText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: '#fff' },

  content: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 150 : 130,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  tagWrap: {
    backgroundColor: Colors.violetBg2,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  tag: {
    fontFamily: Fonts.bodySemi,
    fontSize: 9,
    color: Colors.violet,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 28,
    maxWidth: 300,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 22, backgroundColor: Colors.violet, borderRadius: 4 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 42 : 28,
    gap: 10,
    alignItems: 'center',
  },
  btn: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  btnInner: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.white },
  hint: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, opacity: 0.6 },
});