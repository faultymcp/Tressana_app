// app/name.tsx
//
// Minimal beta name capture. One field. No email. No auth. No Supabase.
// Sits between quiz closer and reveal so the reveal can use the user's
// first name. Replaceable later with full auth.

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Radius } from '@/constants/theme';

export default function NameScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');

  const trimmed = firstName.trim();
  const canContinue = trimmed.length >= 1 && trimmed.length <= 60;

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await AsyncStorage.setItem(
        'tressana_user',
        JSON.stringify({
          firstName: trimmed,
          capturedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      // Non-blocking: if storage fails, reveal will fall back to "You"
    }
    router.replace('/reveal');
  }, [trimmed, canContinue, router]);

  return (
    <View style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={s.body}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <Text style={s.eyebrow}>YOUR ROUTINE IS READY</Text>
            <Text style={s.title}>What should we call you?</Text>
            <Text style={s.subtitle}>
              We'll save your routine so it's here next time. Your name stays
              on this device — nothing else.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(500)} style={s.fieldWrap}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="rgba(18,11,46,0.35)"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="go"
              onSubmitEditing={handleContinue}
              style={s.input}
              maxLength={60}
              accessibilityLabel="First name"
              autoFocus
            />
          </Animated.View>
        </View>

        <View style={s.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            accessibilityLabel="See my routine"
            accessibilityRole="button"
            style={({ pressed }) => [
              s.cta,
              !canContinue && s.ctaDisabled,
              pressed && canContinue && { transform: [{ scale: 0.985 }] },
            ]}
          >
            <LinearGradient
              colors={canContinue ? ['#7643AC', '#F484B9'] : ['#D8D2E4', '#D8D2E4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.ctaInner}
            >
              <Text style={s.ctaText}>See my routine</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  body: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 96 : 72,
    paddingHorizontal: 28,
  },
  eyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.muted,
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    color: Colors.ink,
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink,
    opacity: 0.62,
    maxWidth: 340,
  },
  fieldWrap: {
    marginTop: 40,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 18,
    color: Colors.ink,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 20 : 16,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 56,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    backgroundColor: Colors.porcelain,
  },
  cta: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaInner: {
    paddingVertical: 17,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Fonts.headingSemi,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.2,
  },
});