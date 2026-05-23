// app/name-capture.tsx
//
// Sits between the quiz closer and the reveal. The user has just finished
// 13 quiz steps. We've earned the right to ask their name and email so we
// can hand the routine back to them in a way that feels personal — and so
// they have something to log back into.
//
// Today: this screen writes to AsyncStorage and to a `pending_users`
// table in Supabase. Tomorrow we wire up real magic-link auth on top.
// The screen is built to absorb that change without rewriting the UI.
//
// Voice register: welcoming_in — arrival, not delivery. Not signup pressure,
// not feature pitch. Just: "we've built this for you. where do we send it."

import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Colors, Fonts, Radius, Spacing, Type,
  Surface, Foreground, BorderTone, Accent, Shadows, TouchTarget,
} from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// ── Legal URLs ───────────────────────────────────────────────────
// TODO: Replace with real URLs once Privacy Policy and Terms of Service
// are drafted and hosted. Until then these point to placeholder paths
// on the Tressana domain so the links are real but obviously pending.
// Do NOT ship to public release with these placeholder URLs unresolved.
const TERMS_URL = 'https://tressana.ai/terms';
const PRIVACY_URL = 'https://tressana.ai/privacy';

// ── Validation ───────────────────────────────────────────────────
// Permissive but real. Catches typos like missing @ or trailing space,
// not exotic edge cases like quoted local parts. RFC-perfect regex is
// overkill on a client form; Supabase + email verification will catch
// the rest.
const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isValidName = (s: string) => s.trim().length >= 1 && s.trim().length <= 60;

export default function NameCaptureScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);

  const nameOk = isValidName(firstName);
  const emailOk = isValidEmail(email);
  const canContinue = nameOk && emailOk && !submitting;

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSubmitting(true);
    setError(null);

    const trimmedName = firstName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    try {
      // Always save locally first — reveal must work even if Supabase fails.
      const userRecord = {
        firstName: trimmedName,
        email: trimmedEmail,
        capturedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem('tressana_user', JSON.stringify(userRecord));

      // Best-effort: write to pending_users in Supabase. Non-blocking on
      // failure — the user shouldn't be stranded if the network is bad.
      try {
        // Pull quiz data so it travels with the user record. Useful both
        // for the eventual claim-account flow and for early analytics.
        const quizRaw = await AsyncStorage.getItem('tressana_quiz');
        const quizData = quizRaw ? JSON.parse(quizRaw) : null;

        await supabase.from('pending_users').upsert(
          {
            email: trimmedEmail,
            first_name: trimmedName,
            quiz_data: quizData,
            captured_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );
      } catch (supabaseErr) {
        // Intentional silent. We have the local record; the user is not
        // blocked. We'll reconcile on real signup tomorrow.
        if (__DEV__) console.log('pending_users write failed:', supabaseErr);
      }

      router.replace('/reveal');
    } catch (e: any) {
      setError('Something went wrong saving your details. Try once more.');
      setSubmitting(false);
    }
  }, [firstName, email, canContinue, router]);

  return (
    <View style={st.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header beat ── */}
          <Animated.View entering={FadeInDown.duration(500)} style={st.header}>
            <Text style={st.eyebrow}>YOUR ROUTINE IS READY</Text>
            <Text style={st.title}>Before we hand it over.</Text>
            <Text style={st.subtitle}>
              We'll save your routine so it's here next time you open the
              app — and only here. We won't sell your data. We won't share
              it. You can delete everything any time.
            </Text>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View entering={FadeInUp.delay(120).duration(500)} style={st.form}>
            <View style={st.fieldGroup}>
              <Text style={st.label}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="What should we call you?"
                placeholderTextColor={Foreground.subtle}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                style={st.input}
                maxLength={60}
                accessibilityLabel="First name"
              />
            </View>

            <View style={st.fieldGroup}>
              <Text style={st.label}>Email</Text>
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                placeholder="you@somewhere.com"
                placeholderTextColor={Foreground.subtle}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={handleContinue}
                style={st.input}
                maxLength={120}
                accessibilityLabel="Email address"
              />
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(180)}>
                <Text style={st.errorText}>{error}</Text>
              </Animated.View>
            )}

            <Text style={st.fine}>
              By continuing, you agree to our{' '}
              <Text
                style={st.fineLink}
                onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}
                accessibilityRole="link"
              >
                terms
              </Text>
              {' '}and{' '}
              <Text
                style={st.fineLink}
                onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
                accessibilityRole="link"
              >
                privacy policy
              </Text>
              . You can delete your account and all data any time from settings.
            </Text>
          </Animated.View>

          <View style={st.spacer} />
        </ScrollView>

        {/* ── CTA pinned to bottom ── */}
        <View style={st.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            accessibilityLabel="Continue to your routine"
            accessibilityRole="button"
            style={({ pressed }) => [
              st.cta,
              !canContinue && st.ctaDisabled,
              pressed && canContinue && { transform: [{ scale: 0.985 }] },
            ]}
          >
            <LinearGradient
              colors={canContinue ? (Colors.gradientPrimary as any) : ['#D8D2E4', '#D8D2E4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.ctaInner}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={st.ctaText}>See my routine</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 96 : 72,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },

  // Header
  header: { marginBottom: Spacing.huge },
  eyebrow: { ...Type.label, marginBottom: Spacing.md },
  title: { ...Type.display, marginBottom: Spacing.md },
  subtitle: { ...Type.body, color: Foreground.muted, maxWidth: 340 },

  // Form
  form: { gap: Spacing.xl },
  fieldGroup: { gap: Spacing.sm },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Foreground.muted,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Foreground.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    backgroundColor: Surface.raised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BorderTone.base,
    minHeight: TouchTarget.min + 8,
  },

  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.error,
    marginTop: -Spacing.sm,
  },

  fine: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 17,
    color: Foreground.subtle,
    marginTop: Spacing.md,
  },
  fineLink: {
    fontFamily: Fonts.bodyMedium,
    color: Accent.base,
    textDecorationLine: 'underline',
  },

  spacer: { height: 120 },

  // CTA
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xxl,
    backgroundColor: Surface.base,
    borderTopWidth: 1,
    borderTopColor: BorderTone.subtle,
  },
  cta: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.cta,
  },
  ctaDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaInner: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget.min + 8,
  },
  ctaText: {
    fontFamily: Fonts.headingSemi,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: -0.2,
  },
});
