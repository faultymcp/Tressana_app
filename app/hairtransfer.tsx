import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Image, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { transferHairstyle } from '@/lib/hairTransfer';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 60) / 2;

// ─── Icons ───────────────────────────────────────────────────────
function IconCamera() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" />
    </Svg>
  );
}
function IconImage() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <Path d="M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      <Path d="M21 15l-5-5L5 21" />
    </Svg>
  );
}
function IconArrowLeft() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

type PickedImage = {
  uri: string;
  base64: string;
};

export default function HairTransferScreen() {
  const router = useRouter();
  const [selfie, setSelfie] = useState<PickedImage | null>(null);
  const [reference, setReference] = useState<PickedImage | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const pickImage = async (type: 'selfie' | 'reference', source: 'camera' | 'gallery') => {
    let pickerResult;

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take a selfie.');
        return;
      }
      pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Gallery access is required to pick a photo.');
        return;
      }
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
    }

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      const picked: PickedImage = {
        uri: asset.uri,
        base64: asset.base64 || '',
      };

      if (type === 'selfie') {
        setSelfie(picked);
      } else {
        setReference(picked);
      }
      setResult(null);
    }
  };

  const handleTransfer = async () => {
    if (!selfie?.base64 || !reference?.base64) {
      Alert.alert('Missing photos', 'Please upload both your selfie and a reference hairstyle.');
      return;
    }

    setLoading(true);
    setResult(null);
    setStatus('Starting...');

    try {
      const resultUrl = await transferHairstyle(selfie.base64, reference.base64, setStatus);
      setResult(resultUrl);
    } catch (error: any) {
      Alert.alert('Transfer failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleReset = () => {
    setSelfie(null);
    setReference(null);
    setResult(null);
    setStatus('');
  };

  const showPickerOptions = (type: 'selfie' | 'reference') => {
    Alert.alert(
      type === 'selfie' ? 'Your photo' : 'Reference hairstyle',
      'Choose a source',
      [
        { text: 'Take a photo', onPress: () => pickImage(type, 'camera') },
        { text: 'Choose from gallery', onPress: () => pickImage(type, 'gallery') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}>
          <IconArrowLeft />
        </Pressable>
        <Text style={st.title}>Try a hairstyle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        {/* Result */}
        {result && (
          <Animated.View entering={FadeIn.duration(500)} style={st.resultSection}>
            <Text style={st.resultLabel}>Your new look</Text>
            <View style={st.resultImageWrap}>
              <Image source={{ uri: result }} style={st.resultImage} resizeMode="cover" />
            </View>
            <View style={st.resultActions}>
              <Pressable onPress={handleReset} style={st.resetBtn}>
                <Text style={st.resetText}>Try another</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Upload section */}
        {!result && (
          <>
            <Animated.View entering={FadeInUp.duration(400)}>
              <Text style={st.subtitle}>
                Upload your selfie and a photo of the hairstyle you want to try.
              </Text>
            </Animated.View>

            {/* Image pickers */}
            <Animated.View entering={FadeInUp.delay(100).duration(400)} style={st.pickerRow}>
              {/* Selfie */}
              <Pressable onPress={() => showPickerOptions('selfie')} style={st.pickerCard}>
                {selfie ? (
                  <Image source={{ uri: selfie.uri }} style={st.pickerImage} />
                ) : (
                  <View style={st.pickerPlaceholder}>
                    <IconCamera />
                    <Text style={st.pickerLabel}>Your selfie</Text>
                    <Text style={st.pickerHint}>Tap to upload</Text>
                  </View>
                )}
                {selfie && (
                  <View style={st.pickerOverlay}>
                    <Text style={st.pickerOverlayText}>Your selfie</Text>
                  </View>
                )}
              </Pressable>

              {/* Reference */}
              <Pressable onPress={() => showPickerOptions('reference')} style={st.pickerCard}>
                {reference ? (
                  <Image source={{ uri: reference.uri }} style={st.pickerImage} />
                ) : (
                  <View style={st.pickerPlaceholder}>
                    <IconImage />
                    <Text style={st.pickerLabel}>Hairstyle</Text>
                    <Text style={st.pickerHint}>Tap to upload</Text>
                  </View>
                )}
                {reference && (
                  <View style={st.pickerOverlay}>
                    <Text style={st.pickerOverlayText}>Reference</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>

            {/* Transfer button */}
            <Animated.View entering={FadeInUp.delay(200).duration(400)}>
              {loading ? (
                <View style={st.loadingWrap}>
                  <ActivityIndicator size="large" color={Colors.violet} />
                  <Text style={st.loadingText}>{status}</Text>
                  <Text style={st.loadingHint}>This usually takes 10-30 seconds</Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleTransfer}
                  disabled={!selfie || !reference}
                  style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                >
                  <LinearGradient
                    colors={selfie && reference ? ['#7643AC', '#F484B9'] : ['#D1C4E0', '#D1C4E0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={st.transferBtn}
                  >
                    <Text style={st.transferBtnText}>
                      {selfie && reference ? 'Transfer hairstyle' : 'Upload both photos to continue'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}
            </Animated.View>

            {/* How it works */}
            <Animated.View entering={FadeInUp.delay(300).duration(400)} style={st.howCard}>
              <Text style={st.howTitle}>How it works</Text>
              <View style={st.howStep}>
                <View style={st.howNum}><Text style={st.howNumText}>1</Text></View>
                <Text style={st.howText}>Upload a clear, front-facing selfie</Text>
              </View>
              <View style={st.howStep}>
                <View style={st.howNum}><Text style={st.howNumText}>2</Text></View>
                <Text style={st.howText}>Upload a reference photo of the hairstyle you want</Text>
              </View>
              <View style={st.howStep}>
                <View style={st.howNum}><Text style={st.howNumText}>3</Text></View>
                <Text style={st.howText}>Our AI transfers the hairstyle onto your photo</Text>
              </View>
            </Animated.View>

            {/* Tips */}
            <Animated.View entering={FadeInUp.delay(400).duration(400)} style={st.tipCard}>
              <LinearGradient colors={['#120B2E', '#332463']} style={st.tipInner}>
                <View style={st.tipBadge}><Text style={st.tipBadgeText}>TIPS</Text></View>
                <Text style={st.tipText}>Use a front-facing photo with good lighting and hair fully visible. The reference image should clearly show the hairstyle from a similar angle.</Text>
              </LinearGradient>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },

  content: { paddingHorizontal: 20, paddingBottom: 100 },

  subtitle: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, lineHeight: 22, marginBottom: 20, textAlign: 'center' },

  pickerRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  pickerCard: {
    flex: 1, height: IMAGE_SIZE, borderRadius: 18,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    overflow: 'hidden',
  },
  pickerImage: { width: '100%', height: '100%' },
  pickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickerLabel: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.ink },
  pickerHint: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  pickerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(18,11,46,0.6)', paddingVertical: 6, alignItems: 'center',
  },
  pickerOverlayText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: '#fff' },

  transferBtn: { paddingVertical: 16, borderRadius: Radius.lg, alignItems: 'center', marginBottom: 24 },
  transferBtnText: { fontFamily: Fonts.headingSemi, fontSize: 15, color: '#fff' },

  loadingWrap: { alignItems: 'center', paddingVertical: 32, gap: 12, marginBottom: 24 },
  loadingText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.violet },
  loadingHint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  resultSection: { alignItems: 'center', marginBottom: 24 },
  resultLabel: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.ink, marginBottom: 16 },
  resultImageWrap: {
    width: width - 40, height: width - 40, borderRadius: 22,
    overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.border, marginBottom: 16,
  },
  resultImage: { width: '100%', height: '100%' },
  resultActions: { flexDirection: 'row', gap: 12 },
  resetBtn: {
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.violet,
  },
  resetText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.violet },

  howCard: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 20,
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: 16,
  },
  howTitle: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.ink, marginBottom: 14 },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  howNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#F7F5FB',
    alignItems: 'center', justifyContent: 'center',
  },
  howNumText: { fontFamily: Fonts.headingSemi, fontSize: 12, color: Colors.violet },
  howText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, flex: 1, lineHeight: 19 },

  tipCard: { borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  tipInner: { padding: 20 },
  tipBadge: { backgroundColor: 'rgba(217,255,0,0.15)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  tipBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.lime, letterSpacing: 0.8 },
  tipText: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
});