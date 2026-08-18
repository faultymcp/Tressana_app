// app/business.tsx
// Salon / stylist setup. Three steps, then the listing is live in the Salons tab.

import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView,
  Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const HAIR_TYPES = [
  'Type 1', 'Type 2', 'Type 3', 'Type 4',
  'Locs', 'Braids', 'Weaves', 'Wigs', 'Relaxed', 'Colour',
];

const SPECIALITIES = [
  'Textured & natural hair',
  'Protective styling',
  'Braiding & locs',
  'Colour specialist',
  'Cuts & styling',
  'Full service',
];

export default function BusinessSetup() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [hairTypes, setHairTypes] = useState<string[]>([]);

  const toggleType = (t: string) => {
    Haptics.selectionAsync().catch(() => {});
    setHairTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t],
    );
  };

  const canContinue =
    step === 0 ? name.trim() !== '' && city.trim() !== ''
    : step === 1 ? speciality !== ''
    : hairTypes.length > 0;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in first.');
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase.from('salons').insert({
        owner_id: user.id,
        name: name.trim(),
        city: city.trim(),
        area: area.trim() || city.trim(),
        address: address.trim(),
        speciality,
        hair_types: hairTypes,
        rating: 0,
        review_count: 0,
      });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setStep(3);
    } catch {
      setError('Something went wrong. Try again.');
    }
    setSaving(false);
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (step === 2) submit();
    else setStep(s => s + 1);
  };

  // ── Done ───────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={[s.container, s.centred]}>
        <Animated.View entering={FadeIn.duration(400)} style={s.doneBlock}>
          <Text style={s.doneTitle}>{name} is live.</Text>
          <Text style={s.doneBody}>
            Clients matching your specialities can now find you in the Salons tab.
          </Text>
          <Pressable style={s.btn} onPress={() => router.replace('/(tabs)/salons')}>
            <Text style={s.btnText}>View your listing</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.topBar}>
        <Pressable onPress={() => (step === 0 ? router.back() : setStep(s => s - 1))} hitSlop={16}>
          <Text style={s.back}>Back</Text>
        </Pressable>
        <Text style={s.stepLabel}>Step {step + 1} of 3</Text>
      </View>

      <View style={s.progressRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[s.progressSeg, i <= step && s.progressSegOn]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <Animated.View entering={FadeIn.duration(280)} style={s.block}>
            <Text style={s.title}>Tell us about your business</Text>
            <Text style={s.body}>This is what clients see first.</Text>

            <Field label="Business name" value={name} onChange={setName} placeholder="e.g. Gloria's Studio" />
            <Field label="City" value={city} onChange={setCity} placeholder="e.g. London" />
            <Field label="Area" value={area} onChange={setArea} placeholder="e.g. Peckham (optional)" />
            <Field label="Address" value={address} onChange={setAddress} placeholder="Street address (optional)" />
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeIn.duration(280)} style={s.block}>
            <Text style={s.title}>What do you specialise in?</Text>
            <Text style={s.body}>Pick the closest match.</Text>

            {SPECIALITIES.map(sp => (
              <Pressable
                key={sp}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setSpeciality(sp); }}
                style={[s.option, speciality === sp && s.optionOn]}
              >
                <Text style={[s.optionText, speciality === sp && s.optionTextOn]}>{sp}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeIn.duration(280)} style={s.block}>
            <Text style={s.title}>Which hair do you work with?</Text>
            <Text style={s.body}>Select all that apply. This is how clients get matched to you.</Text>

            <View style={s.chipWrap}>
              {HAIR_TYPES.map(t => (
                <Pressable
                  key={t}
                  onPress={() => toggleType(t)}
                  style={[s.chip, hairTypes.includes(t) && s.chipOn]}
                >
                  <Text style={[s.chipText, hairTypes.includes(t) && s.chipTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {error !== '' && <Text style={s.error}>{error}</Text>}
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          onPress={next}
          disabled={!canContinue || saving}
          style={[s.btn, (!canContinue || saving) && s.btnOff]}
        >
          {saving
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={s.btnText}>{step === 2 ? 'Create listing' : 'Continue'}</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.muted}
        autoCapitalize="words"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  centred: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
  },
  back: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.ink, opacity: 0.6 },
  stepLabel: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.muted },

  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 24, marginTop: 16 },
  progressSeg: { flex: 1, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(118,67,172,0.18)' },
  progressSegOn: { backgroundColor: Colors.violet },

  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  block: { gap: 12 },

  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.ink, letterSpacing: -0.6, lineHeight: 32 },
  body: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, opacity: 0.62, lineHeight: 21, marginBottom: 12 },

  field: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.ink, opacity: 0.75 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.ink,
    backgroundColor: Colors.white,
  },

  option: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 16, marginBottom: 10,
    backgroundColor: Colors.white,
  },
  optionOn: { borderColor: Colors.violet, backgroundColor: Colors.violetBg },
  optionText: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.ink },
  optionTextOn: { fontFamily: Fonts.bodySemi, color: Colors.violet },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.white,
  },
  chipOn: { borderColor: Colors.violet, backgroundColor: Colors.violetBg2 },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.ink },
  chipTextOn: { fontFamily: Fonts.bodySemi, color: Colors.violet },

  error: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error, marginTop: 16 },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    paddingTop: 12,
    backgroundColor: Colors.porcelain,
  },
  btn: {
    width: '100%', paddingVertical: 17, borderRadius: Radius.lg,
    backgroundColor: Colors.violet, alignItems: 'center',
  },
  btnOff: { opacity: 0.4 },
  btnText: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.white, letterSpacing: 0.2 },

  doneBlock: { gap: 14, alignItems: 'center' },
  doneTitle: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.ink, textAlign: 'center', letterSpacing: -0.6 },
  doneBody: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, opacity: 0.62, textAlign: 'center', lineHeight: 21, marginBottom: 16 },
});
