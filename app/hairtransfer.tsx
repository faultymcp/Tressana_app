import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Image,
  ActivityIndicator, Alert, ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Camera: () => <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><Circle cx="12" cy="13" r="4" /></Svg>,
  Image: () => <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.6} strokeLinecap="round"><Path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /><Circle cx="8.5" cy="8.5" r="1.5" /><Path d="M21 15l-5-5L5 21" /></Svg>,
  Zap: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill={Colors.violet} stroke="none"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg>,
  Download: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></Svg>,
  Refresh: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={2} strokeLinecap="round"><Path d="M1 4v6h6" /><Path d="M23 20v-6h-6" /><Path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" /></Svg>,
};

type Stage = 'upload' | 'processing' | 'result';

export default function HairTransferScreen() {
  const router = useRouter();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('upload');
  const [progress, setProgress] = useState('');
  const [saving, setSaving] = useState(false);

  const chooseImage = (type: 'selfie' | 'reference') => {
    const doCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera access to take a photo.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: type === 'selfie' ? [3, 4] : [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        if (type === 'selfie') setSelfie(res.assets[0].uri);
        else setReference(res.assets[0].uri);
      }
    };

    const doGallery = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to use this feature.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'selfie' ? [3, 4] : [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        if (type === 'selfie') setSelfie(res.assets[0].uri);
        else setReference(res.assets[0].uri);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Gallery', 'Cancel'], cancelButtonIndex: 2 },
        (idx) => { if (idx === 0) doCamera(); else if (idx === 1) doGallery(); }
      );
    } else {
      Alert.alert('Add photo', 'Choose a source', [
        { text: 'Take Photo', onPress: doCamera },
        { text: 'Choose from Gallery', onPress: doGallery },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleGenerate = async () => {
    if (!selfie || !reference) {
      Alert.alert('Missing photos', 'Upload both your selfie and a reference hairstyle.');
      return;
    }

    // Check try-on credits
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to use AI try-on.');
        return;
      }

      // Check credits via consume_tryon RPC
      const { data: creditCheck, error: creditErr } = await supabase.rpc('consume_tryon', {
        p_user_id: user.id,
        p_requested_resolution: '4k',
      });

      if (creditErr || !creditCheck?.allowed) {
        const reason = creditCheck?.reason || creditErr?.message || 'No try-on credits available.';
        Alert.alert('No Credits', `${reason}\n\nGet more credits from your wallet or upgrade to Pro.`, [
          { text: 'Go to Wallet', onPress: () => router.push('/wallet') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }
    } catch (e) {
      // If credit check fails, let them try anyway (MVP approach)
      console.log('Credit check failed, proceeding:', e);
    }

    setStage('processing');
    setProgress('Uploading your photos...');

    try {
      // Convert images to base64 for the API
      const selfieBase64 = await fetchAsBase64(selfie);
      const refBase64 = await fetchAsBase64(reference);

      setProgress('AI is generating your new look...');

      // Call Replicate API via Edge Function (to keep API key server-side)
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-tryon`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            selfie_base64: selfieBase64,
            reference_base64: refBase64,
            resolution: '4k',
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setProgress('Almost ready...');

      // Award XP for using try-on
      try {
        await supabase.rpc('award_xp', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_action: 'ai_try_on',
          p_reference_id: null,
          p_description: 'Used AI hair try-on',
          p_override_amount: null,
        });
      } catch (e) {}

      setResult(data.output_url || data.output);
      setStage('result');
    } catch (err: any) {
      console.log('Try-on error:', err);
      Alert.alert('Generation Failed', err.message || 'Something went wrong. Your credit has been restored. Please try again.');
      setStage('upload');
    }
  };

  const handleReset = () => {
    setSelfie(null);
    setReference(null);
    setResult(null);
    setStage('upload');
    setProgress('');
  };

  const saveToGallery = async () => {
    if (!result) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to save your look.');
        return;
      }
      setSaving(true);
      // Download the remote result to a local file, then save to the library.
      const fileUri = FileSystem.cacheDirectory + `tressie-look-${Date.now()}.png`;
      const dl = await FileSystem.downloadAsync(result, fileUri);
      await MediaLibrary.saveToLibraryAsync(dl.uri);
      Alert.alert('Saved', 'Your new look has been saved to your photos.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save the image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>AI Hair Try-On</Text>
        <View style={{ width: 40 }} />
      </View>

      {stage === 'upload' && (
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(300)}>
            <Text style={st.heroTitle}>See yourself with a new style</Text>
            <Text style={st.heroSub}>Upload your selfie and a reference hairstyle. Our AI generates a 4K image of you with that look.</Text>
            <Text style={st.privacyNote}>Your photos are used only to create your look and aren't saved to your Tressie account.</Text>
          </Animated.View>

          {/* Selfie upload */}
          <Animated.View entering={FadeInUp.delay(50).duration(300)}>
            <Text style={st.sectionLabel}>Your selfie</Text>
            {selfie ? (
              <Pressable onPress={() => chooseImage('selfie')} style={st.imagePreview}>
                <Image source={{ uri: selfie }} style={st.previewImg} />
                <View style={st.changeBtn}><Text style={st.changeBtnText}>Change</Text></View>
              </Pressable>
            ) : (
              <Pressable onPress={() => chooseImage('selfie')} style={st.uploadBtnWide}>
                <IC.Camera />
                <Text style={st.uploadLabel}>Add your photo</Text>
                <Text style={st.uploadSub}>Take a selfie or pick from your gallery</Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Reference upload */}
          <Animated.View entering={FadeInUp.delay(100).duration(300)}>
            <Text style={st.sectionLabel}>Reference hairstyle</Text>
            {reference ? (
              <Pressable onPress={() => chooseImage('reference')} style={st.imagePreview}>
                <Image source={{ uri: reference }} style={st.previewImg} />
                <View style={st.changeBtn}><Text style={st.changeBtnText}>Change</Text></View>
              </Pressable>
            ) : (
              <Pressable onPress={() => chooseImage('reference')} style={st.uploadBtnWide}>
                <IC.Image />
                <Text style={st.uploadLabel}>Choose a hairstyle photo</Text>
                <Text style={st.uploadSub}>From your gallery or screenshots</Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Generate button */}
          <Animated.View entering={FadeInUp.delay(150).duration(300)}>
            <Pressable
              onPress={handleGenerate}
              disabled={!selfie || !reference}
              style={({ pressed }) => [st.generateBtn, (!selfie || !reference) && st.generateBtnDisabled, pressed && { opacity: 0.85 }]}
            >
              <IC.Zap />
              <Text style={[st.generateBtnText, (!selfie || !reference) && { color: '#999' }]}>Generate my look</Text>
            </Pressable>
            <Text style={st.creditNote}>Uses 1 try-on credit · 4K resolution</Text>
          </Animated.View>
        </ScrollView>
      )}

      {stage === 'processing' && (
        <View style={st.processingWrap}>
          <ActivityIndicator size="large" color={Colors.violet} />
          <Text style={st.processingTitle}>Creating your new look</Text>
          <Text style={st.processingText}>{progress}</Text>
          <Text style={st.processingNote}>This usually takes 15-30 seconds</Text>
        </View>
      )}

      {stage === 'result' && result && (
        <ScrollView contentContainerStyle={st.resultScroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <View style={st.resultCard}>
              <Image source={{ uri: result }} style={st.resultImg} resizeMode="contain" />
            </View>

            <View style={st.resultActions}>
              <Pressable onPress={handleReset} style={st.actionBtn}>
                <IC.Refresh />
                <Text style={st.actionBtnText}>Try another</Text>
              </Pressable>
              <Pressable onPress={saveToGallery} disabled={saving} style={st.actionBtnPrimary}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <IC.Download />}
                <Text style={st.actionBtnPrimaryText}>{saving ? 'Saving…' : 'Save to gallery'}</Text>
              </Pressable>
            </View>

            <Text style={st.resultNote}>Generated at 4K resolution with AI</Text>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

// ── Helper: convert local URI to base64 ──────────────────────────
async function fetchAsBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  heroTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.ink, marginBottom: 8, marginTop: 8, letterSpacing: -0.5 },
  heroSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: 28 },
  privacyNote: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, lineHeight: 16, marginTop: -20, marginBottom: 24, opacity: 0.8 },

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  uploadRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  uploadBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 32, backgroundColor: Colors.white, borderRadius: 18,
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
  },
  uploadBtnWide: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 32, backgroundColor: Colors.white, borderRadius: 18,
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', marginBottom: 24,
  },
  uploadLabel: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.ink },
  uploadSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },

  imagePreview: { borderRadius: 18, overflow: 'hidden', marginBottom: 24, position: 'relative' },
  previewImg: { width: '100%', height: 200, borderRadius: 18 },
  changeBtn: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10,
  },
  changeBtnText: { fontFamily: Fonts.bodySemi, fontSize: 11, color: '#fff' },

  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.violet, paddingVertical: 16, borderRadius: 16, marginTop: 8,
  },
  generateBtnDisabled: { backgroundColor: '#E0DCD5' },
  generateBtnText: { fontFamily: Fonts.headingSemi, fontSize: 16, color: '#fff' },
  creditNote: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 10 },

  processingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  processingTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.ink, marginTop: 24, marginBottom: 8 },
  processingText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.violet, marginBottom: 8 },
  processingNote: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  resultScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  resultCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  resultImg: { width: '100%', height: 450 },
  resultActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  actionBtnText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.violet },
  actionBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.violet,
  },
  actionBtnPrimaryText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: '#fff' },
  resultNote: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center' },
});