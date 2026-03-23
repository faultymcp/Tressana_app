import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type AuthStep = 'email' | 'otp';

export default function AuthScreen() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = useRef<(TextInput | null)[]>([]);

  // ─── Step 1: Send OTP ──────────────────────────────────────────
  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: trimmed });
      if (error) throw error;
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ───────────────────────────────────────
  const verifyCode = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      });
      if (error) throw error;
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    verifyCode(code);
  };

  // ─── OTP handlers ─────────────────────────────────────────────
  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const code = newOtp.join('');
      if (code.length === 6) {
        setTimeout(() => verifyCode(code), 200);
      }
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleResend = () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    handleSendOtp();
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  // ─── OTP Screen ───────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#120B2E', '#332463', '#7643AC']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.brand}>
              Tressana<Text style={styles.brandDot}>.ai</Text>
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.otpScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.otpIconWrap}>
            <Text style={styles.otpEmoji}>✉️</Text>
          </View>

          <Text style={styles.otpTitle}>Check your inbox</Text>
          <Text style={styles.otpSubtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.otpEmail}>{email}</Text>
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { otpRefs.current[i] = ref; }}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                  error ? styles.otpInputError : null,
                ]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, i)}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          <Text style={styles.otpHint}>Code expires in 10 minutes</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleVerifyOtp}
            style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, loading && styles.btnDisabled]}
            disabled={loading}
          >
            <LinearGradient
              colors={Colors.gradientPrimary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitText}>Verify & sign in</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.otpActions}>
            <Pressable onPress={handleResend} disabled={loading}>
              <Text style={styles.resendText}>Resend code</Text>
            </Pressable>
            <Text style={styles.otpDot}>·</Text>
            <Pressable onPress={handleChangeEmail}>
              <Text style={styles.changeText}>Change email</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Email Screen ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#120B2E', '#332463', '#7643AC']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.brand}>
            Tressana<Text style={styles.brandDot}>.ai</Text>
          </Text>
          <Text style={styles.tagline}>FOR EVERY CURL, COIL AND WAVE</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Sign in or create an account to start{'\n'}your personalised hair journey.
        </Text>

        <View style={[styles.inputWrap, email.length > 0 && styles.inputWrapActive]}>
          <Text style={styles.inputIcon}>✉</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={handleSendOtp}
            editable={!loading}
          />
        </View>

        <Text style={styles.emailHint}>
          We'll send you a 6-digit code — no password needed.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSendOtp}
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, loading && styles.btnDisabled]}
          disabled={loading}
        >
          <LinearGradient
            colors={Colors.gradientPrimary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.submitText}>Send verification code</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Text style={styles.legal}>
          By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  // Header
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 36,
    paddingHorizontal: Spacing.xxl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: { alignItems: 'center' },
  brand: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.white, letterSpacing: -0.5 },
  brandDot: { color: Colors.pink },
  tagline: {
    fontFamily: Fonts.heading, fontSize: 9, color: Colors.lime,
    letterSpacing: 3, marginTop: 8, textTransform: 'uppercase',
  },

  // Email screen
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xxl, paddingTop: 32, paddingBottom: 40 },
  title: {
    fontFamily: Fonts.heading, fontSize: 26, color: Colors.ink,
    textAlign: 'center', letterSpacing: -0.5, marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.body, fontSize: 14, color: Colors.muted,
    textAlign: 'center', lineHeight: 20, marginBottom: 28,
  },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: Radius.lg,
    backgroundColor: Colors.white, paddingHorizontal: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  inputWrapActive: { borderColor: Colors.violet },
  inputIcon: { fontSize: 16, marginRight: 10, opacity: 0.5 },
  input: { flex: 1, paddingVertical: 16, fontFamily: Fonts.body, fontSize: 15, color: Colors.ink },
  emailHint: {
    fontFamily: Fonts.body, fontSize: 12, color: Colors.muted,
    marginTop: 8, marginBottom: 4, textAlign: 'center', fontStyle: 'italic',
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)', borderRadius: Radius.md,
    padding: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.sm,
  },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error, lineHeight: 18, textAlign: 'center' },

  // Button
  submitBtn: {
    borderRadius: Radius.lg, overflow: 'hidden', marginTop: 16,
    shadowColor: Colors.violet, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 5,
  },
  submitBtnPressed: { transform: [{ scale: 0.98 }], shadowOpacity: 0.15 },
  submitGradient: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontFamily: Fonts.headingSemi, color: Colors.white, fontSize: 16, letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.5 },

  // Legal
  legal: {
    fontFamily: Fonts.body, fontSize: 11, color: Colors.muted,
    textAlign: 'center', marginTop: 24, opacity: 0.6, lineHeight: 16,
  },

  // ─── OTP ────
  otpScroll: {
    flexGrow: 1, paddingHorizontal: Spacing.xxl,
    paddingTop: 40, paddingBottom: 40, alignItems: 'center',
  },
  otpIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.violetBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  otpEmoji: { fontSize: 32 },
  otpTitle: {
    fontFamily: Fonts.heading, fontSize: 24, color: Colors.ink,
    marginBottom: 12, textAlign: 'center',
  },
  otpSubtitle: {
    fontFamily: Fonts.body, fontSize: 15, color: Colors.muted,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  otpEmail: { fontFamily: Fonts.bodySemi, color: Colors.violet },

  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpInput: {
    width: 48, height: 56, borderRadius: Radius.md, borderWidth: 2,
    borderColor: Colors.border, backgroundColor: Colors.white,
    textAlign: 'center', fontFamily: Fonts.heading, fontSize: 22, color: Colors.ink,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  otpInputFilled: { borderColor: Colors.violet, backgroundColor: 'rgba(118,67,172,0.04)' },
  otpInputError: { borderColor: Colors.error },
  otpHint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginBottom: 8, fontStyle: 'italic' },

  otpActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  resendText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.violet },
  otpDot: { fontSize: 14, color: Colors.muted },
  changeText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.muted },
});