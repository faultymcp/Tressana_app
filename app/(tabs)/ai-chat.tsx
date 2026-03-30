import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  Pressable, KeyboardAvoidingView, Platform,
  ActivityIndicator, SafeAreaView, StatusBar,
  Modal, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Line, Path, Rect, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Fonts, Radius } from '@/constants/theme';
import Animated, { FadeInUp, FadeInLeft, FadeInRight } from 'react-native-reanimated';

// ── Groq API ──────────────────
const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_KEY ?? "" ;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/api/v0/product';

// ── Tressie System Prompt ─────────────────────────────────────────
const SYSTEM_PROMPT = `You are Tressie, the AI hair advisor exclusively inside the Tressana app. You ONLY talk about hair. Nothing else.

YOUR PERSONALITY - older sister energy:
- Talk like a real person, not a customer service bot. Casual, warm, direct.
- Say things like "okay so here's the thing...", "sis listen", "real talk", "no cap this actually works", "I've been there"
- Validate feelings FIRST before giving advice
- Use community terms: wash day, protective styles, shrinkage, LOC method, porosity, big chop, transitioning, co-wash, pre-poo
- Keep answers concise unless they ask for a full routine

YOUR NAME IS TRESSIE. You are not "an AI" - you're Tressie, their hair big sis.

HAIR TYPES (Andre Walker System):
- Type 1 (Straight): 1A fine, 1B medium, 1C coarse
- Type 2 (Wavy): 2A loose S-waves, 2B defined S-waves, 2C deep waves
- Type 3 (Curly): 3A loose springy curls, 3B springy ringlets, 3C tight corkscrews
- Type 4 (Coily): 4A soft coils S-pattern, 4B Z-pattern less definition, 4C tight coils most shrinkage

HAIR POROSITY:
- LOW: Tightly packed cuticles. Water beads up. Products sit on top. Needs: LCO method, lightweight products, heat to open cuticles, glycerin, aloe vera. AVOID: heavy butters, too much protein.
- MEDIUM: Balanced. Easy to style. Needs: balanced moisture and protein.
- HIGH: Raised cuticles. Absorbs fast loses fast. Dry frizzy breakage-prone. Needs: LOC method, heavy butters, protein treatments. AVOID: humectants in humidity.

WASH DAY Type 3: Pre-poo → Cleanse (sulfate-free) → Detangle → Deep condition 20-30min → Leave-in → Seal → Style → Protect with satin bonnet
WASH DAY Type 4: Pre-poo overnight → Co-wash or sulfate-free shampoo → Detangle in sections → Deep condition 30min → LOC method → Style → Protect

COMMON CONCERNS:
- Dryness: LOC/LCO method, more frequent deep conditioning, check porosity
- Frizz: Seal with oil/cream, don't touch while drying, check porosity
- Breakage: Check protein-moisture balance, protective styles, gentle detangling
- Shrinkage (Type 4): Normal — banding, blow out, braids to stretch
- Buildup: Clarifying shampoo, apple cider vinegar rinse

INGREDIENT ANALYSIS - when given ingredients:
- Sulfates (SLS, SLES): drying, avoid for curly/coily
- Silicones (dimethicone): buildup if non-water-soluble
- Proteins (keratin, hydrolysed silk): good in balance
- Humectants (glycerin, aloe): great for moisture, avoid in dry climates
- Give clear verdict: ✅ Good / ⚠️ Use with caution / 🚫 Avoid — with specific reasons

TRESSANA PRODUCTS (recommend ONLY these):
• Tressana Hydrating Hair Mask — dry hair, Types 3A-4C
• Tressana Soothing Scalp Serum — sensitive scalp, all types
• Tressana Curl Defining Cream — curl definition, Types 3A-4A
• Tressana Deep Moisture Butter — extreme dryness, Types 4A-4C
• Tressana Pre-Poo Detangling Oil — pre-wash protection, Types 3C-4C
• Tressana Co-Wash Cleansing Conditioner — gentle cleansing, Types 3B-4C

RULES:
- ONLY talk about hair. Redirect everything else: "That's outside my lane babe — I'm strictly a hair girl 💜"
- Never shame any texture, porosity, or practice.
- Short answers unless a full routine is requested.

The Tressana app has: Wash Day Tracker, Stylist Marketplace, AI Hair Analysis.`;

// ── Personalised chips by hair type ──────────────────────────────
const CHIPS_BY_TYPE: Record<string, { label: string; emoji: string }[]> = {
  '1A': [{ label: 'My hair goes flat by noon', emoji: '😞' }, { label: 'Best volumising products', emoji: '✨' }, { label: 'How to add texture', emoji: '💁' }, { label: 'Avoid greasy roots', emoji: '🚫' }],
  '1B': [{ label: 'How to add volume', emoji: '💨' }, { label: 'Best lightweight products', emoji: '✨' }, { label: 'Keep style all day', emoji: '💪' }, { label: 'Reduce oiliness', emoji: '🌿' }],
  '1C': [{ label: 'Tame coarse straight hair', emoji: '✨' }, { label: 'Frizz on humid days', emoji: '🌀' }, { label: 'Best smoothing products', emoji: '💆' }, { label: 'Wash day for thick hair', emoji: '🚿' }],
  '2A': [{ label: 'Enhance my waves', emoji: '🌊' }, { label: 'Stop waves going frizzy', emoji: '🌀' }, { label: 'Build my wave routine', emoji: '🚿' }, { label: 'Best wave products', emoji: '✨' }],
  '2B': [{ label: 'Define my S-waves', emoji: '〰️' }, { label: 'Frizz control for 2B', emoji: '🌀' }, { label: 'Diffusing waves tips', emoji: '💨' }, { label: 'Products for 2B hair', emoji: '✨' }],
  '2C': [{ label: 'My waves become frizz', emoji: '😤' }, { label: '2C wash day routine', emoji: '🚿' }, { label: 'Best gels for waves', emoji: '✨' }, { label: 'Scrunch technique', emoji: '✋' }],
  '3A': [{ label: 'Build my 3A routine', emoji: '🚿' }, { label: 'Best products for 3A', emoji: '✨' }, { label: 'My curls lose definition', emoji: '😔' }, { label: 'Diffuse without frizz', emoji: '💨' }],
  '3B': [{ label: 'Define my ringlets', emoji: '🌀' }, { label: '3B wash day tips', emoji: '🚿' }, { label: 'Protein vs moisture for 3B', emoji: '⚖️' }, { label: 'Best leave-in for 3B', emoji: '✨' }],
  '3C': [{ label: 'My 3C curls are so dry', emoji: '💧' }, { label: 'LOC method for 3C', emoji: '🌿' }, { label: 'Pre-poo for 3C hair', emoji: '🛁' }, { label: '3C protective styles', emoji: '💆' }],
  '4A': [{ label: 'Moisture for 4A coils', emoji: '💧' }, { label: '4A wash day routine', emoji: '🚿' }, { label: 'Define my 4A coils', emoji: '🌀' }, { label: 'Shrinkage help', emoji: '📏' }],
  '4B': [{ label: 'My 4B hair is SO dry', emoji: '😩' }, { label: 'LOC method for 4B', emoji: '🌿' }, { label: 'Detangling 4B tips', emoji: '🤌' }, { label: 'Best oils for 4B', emoji: '✨' }],
  '4C': [{ label: 'Moisture that actually works', emoji: '💧' }, { label: 'Full 4C wash day', emoji: '🚿' }, { label: 'Shrinkage and length', emoji: '📏' }, { label: 'Deep condition routine', emoji: '💆' }],
  default: [{ label: 'Build my wash day routine', emoji: '🚿' }, { label: 'Products for my hair type', emoji: '✨' }, { label: 'My hair is really dry', emoji: '💧' }, { label: 'How do I find my porosity?', emoji: '🔬' }, { label: 'Pre-poo tips', emoji: '🌿' }, { label: 'Help with frizz', emoji: '🌀' }],
};

function getSuggestions(hairType: string) {
  return CHIPS_BY_TYPE[hairType] || CHIPS_BY_TYPE.default;
}

// ── Types ─────────────────────────────────────────────────────────
type Message = { id: string; role: 'user' | 'assistant'; text: string; attachment?: { type: 'image' | 'document'; name: string } };
type GroqMessage = { role: 'user' | 'assistant' | 'system'; content: string };

// ── Icons ─────────────────────────────────────────────────────────
function IconSend() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="22" y1="2" x2="11" y2="13" /><Polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  );
}

function IconCamera({ color = Colors.violet }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <Circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

function IconBarcode({ color = Colors.violet }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="4" width="3" height="16" rx="1" /><Rect x="7" y="4" width="2" height="16" rx="1" />
      <Rect x="11" y="4" width="3" height="16" rx="1" /><Rect x="16" y="4" width="2" height="16" rx="1" />
      <Rect x="20" y="4" width="2" height="16" rx="1" />
    </Svg>
  );
}

function IconDoc({ color = Colors.violet }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <Path d="M14 2v6h6" /><Line x1="8" y1="13" x2="16" y2="13" /><Line x1="8" y1="17" x2="16" y2="17" />
    </Svg>
  );
}

// ── Text renderers ────────────────────────────────────────────────
function InlineText({ text, style, boldStyle }: { text: string; style?: any; boldStyle?: any }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <Text key={i} style={[style, boldStyle || { fontFamily: Fonts.bodySemi, color: Colors.violet }]}>{part}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

function BubbleContent({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <View>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 5 }} />;
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        if (isBullet) {
          return (
            <View key={i} style={st.bulletRow}>
              <Text style={[st.bullet, isUser && { color: 'rgba(255,255,255,0.6)' }]}>•</Text>
              <InlineText text={line.replace(/^[•\-]\s*/, '')} style={[st.bubbleText, isUser && st.bubbleTextUser]} boldStyle={isUser ? { fontFamily: Fonts.bodySemi, color: '#fff' } : undefined} />
            </View>
          );
        }
        return <InlineText key={i} text={line} style={[st.bubbleText, isUser && st.bubbleTextUser, i > 0 && { marginTop: 3 }]} boldStyle={isUser ? { fontFamily: Fonts.bodySemi, color: '#fff' } : undefined} />;
      })}
    </View>
  );
}

function TypingDots() {
  return (
    <View style={st.typingRow}>
      <LinearGradient colors={[Colors.violet, Colors.lavender]} style={st.aiAvatar}>
        <Text style={{ fontSize: 13 }}>✨</Text>
      </LinearGradient>
      <View style={[st.bubble, st.bubbleAI]}>
        <View style={st.dotsWrap}>
          {[0, 1, 2].map(i => <View key={i} style={[st.dot, { opacity: 0.3 + i * 0.25 }]} />)}
        </View>
      </View>
    </View>
  );
}

function MessageRow({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === 'user';
  const Anim = isUser ? FadeInRight : FadeInLeft;
  return (
    <Animated.View entering={Anim.delay(index < 2 ? 0 : 50).duration(260)} style={[st.msgRow, isUser ? st.msgRowUser : st.msgRowAI]}>
      {!isUser && <LinearGradient colors={[Colors.violet, Colors.lavender]} style={st.aiAvatar}><Text style={{ fontSize: 13 }}>✨</Text></LinearGradient>}
      <View style={{ maxWidth: '78%' }}>
        {msg.attachment && (
          <View style={[st.attachBadge, isUser && st.attachBadgeUser]}>
            <Text style={{ fontSize: 14 }}>{msg.attachment.type === 'image' ? '📷' : '📄'}</Text>
            <Text style={[st.attachBadgeName, isUser && { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>{msg.attachment.name}</Text>
          </View>
        )}
        {isUser ? (
          <LinearGradient colors={['#120B2E', Colors.violet] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.bubble, st.bubbleUser]}>
            <BubbleContent text={msg.text} isUser />
          </LinearGradient>
        ) : (
          <View style={[st.bubble, st.bubbleAI]}><BubbleContent text={msg.text} isUser={false} /></View>
        )}
      </View>
      {isUser && <View style={st.userAvatar}><Text style={{ fontSize: 13 }}>🌿</Text></View>}
    </Animated.View>
  );
}

// ── Barcode Scanner Modal ─────────────────────────────────────────
function BarcodeScannerModal({ visible, onClose, onScanned }: { visible: boolean; onClose: () => void; onScanned: (barcode: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) requestPermission();
    if (visible) setScanned(false);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={st.scanModal}>
        <View style={st.scanHeader}>
          <Text style={st.scanTitle}>Scan Product Barcode</Text>
          <Pressable onPress={onClose} style={st.scanClose}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
            onBarcodeScanned={scanned ? undefined : ({ data }) => { setScanned(true); onScanned(data); onClose(); }}
          >
            <View style={st.scanOverlay}>
              <View style={st.scanFrame} />
              <Text style={st.scanHint}>Point at the barcode on your hair product</Text>
            </View>
          </CameraView>
        ) : (
          <View style={st.scanNoPerm}>
            <Text style={{ color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 20 }}>Camera permission needed</Text>
            <Pressable onPress={requestPermission} style={st.scanPermBtn}>
              <Text style={{ color: '#fff', fontFamily: Fonts.bodySemi, fontSize: 15 }}>Allow Camera</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Attach menu ───────────────────────────────────────────────────
function AttachMenu({ onIngredientScan, onBarcodeScan, onDocument }: { onIngredientScan: () => void; onBarcodeScan: () => void; onDocument: () => void }) {
  return (
    <Animated.View entering={FadeInUp.duration(200)} style={st.attachMenu}>
      {[
        { icon: <IconCamera />, label: 'Scan Ingredients', sub: 'Photo of product label', onPress: onIngredientScan },
        { icon: <IconBarcode />, label: 'Scan Barcode', sub: 'Look up product by barcode', onPress: onBarcodeScan },
        { icon: <IconDoc />, label: 'Upload Document', sub: 'PDF or text file (max 5MB)', onPress: onDocument },
      ].map((item, i) => (
        <View key={item.label}>
          {i > 0 && <View style={st.attachDivider} />}
          <Pressable style={st.attachItem} onPress={item.onPress}>
            <View style={st.attachIconWrap}>{item.icon}</View>
            <View>
              <Text style={st.attachLabel}>{item.label}</Text>
              <Text style={st.attachSub}>{item.sub}</Text>
            </View>
          </Pressable>
        </View>
      ))}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant',
    text: "Heyy! 👋 I'm **Tressie**, your hair assistant inside Tressana.\n\nReal talk - I've done the research, tried the products, and made the mistakes so you don't have to. I got you.\n\nSo what's going on with your hair? 👀",
  }]);
  const [history, setHistory] = useState<GroqMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hairType, setHairType] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) setHairType(JSON.parse(raw).hairType || '');
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Core send ───────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string, attachment?: { type: 'image' | 'document'; name: string }) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setError(null);
    setShowSuggestions(false);
    setShowAttachMenu(false);
    setInput('');

    setMessages(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', text: trimmed, attachment }]);
    setLoading(true);
    scrollToBottom();

    const contextualMsg = hairType ? `[My hair type is ${hairType}] ${trimmed}` : trimmed;
    const newHistory: GroqMessage[] = [...history, { role: 'user', content: contextualMsg }];

    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...newHistory],
          max_tokens: 600,
          temperature: 0.85,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Error ${response.status}`);
      }

      const data = await response.json();
      const replyText = data?.choices?.[0]?.message?.content || "Hmm something went weird, try again!";

      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: replyText }]);
      setHistory([...newHistory, { role: 'assistant', content: replyText }]);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Try again!');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, history, hairType, scrollToBottom]);

  // ── Ingredient scan ─────────────────────────────────────────────
  const handleIngredientScan = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    setShowAttachMenu(false);
    sendMessage(
      "I've uploaded a photo of a hair product ingredient list. Please analyse these ingredients for my hair type and tell me if this product is suitable, what ingredients are good, which to watch out for, and why.",
      { type: 'image', name: 'Ingredient Label' }
    );
  }, [sendMessage]);

  // ── Barcode scan ────────────────────────────────────────────────
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    setLoading(true);
    setShowSuggestions(false);
    try {
      const response = await fetch(`${OPEN_FOOD_FACTS_URL}/${barcode}.json`);
      const data = await response.json();
      if (data.status === 0) {
        sendMessage(`I scanned barcode ${barcode} but couldn't find the product. What should I look for in a good hair product?`);
        return;
      }
      const p = data.product;
      const name = p.product_name || 'Unknown Product';
      const brand = p.brands || '';
      const ingredients = p.ingredients_text || p.ingredients_text_en || '';
      if (!ingredients) {
        sendMessage(`I scanned "${name}" by ${brand} but the ingredient list wasn't available. What should I look for in hair products?`);
        return;
      }
      sendMessage(
        `I just scanned **${name}** by ${brand}. Here are the ingredients:\n\n${ingredients}\n\nCan you analyse these for my hair type and tell me if this product is suitable?`,
        { type: 'image', name: `Scanned: ${name}` }
      );
    } catch {
      sendMessage(`I scanned a product barcode. What ingredients should I look for in a good hair product for my hair type?`);
    } finally {
      setLoading(false);
    }
  }, [sendMessage]);

  // ── Document upload ─────────────────────────────────────────────
  const handleDocumentUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/plain', 'application/pdf'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024) { Alert.alert('File too large', 'Please upload a file smaller than 5MB.'); return; }
      const res = await fetch(file.uri);
      const text = await res.text();
      const truncated = text.slice(0, 3000);
      setShowAttachMenu(false);
      sendMessage(
        `I've uploaded a document called "${file.name}". Here's the content:\n\n${truncated}\n\nCan you give me hair care advice based on this?`,
        { type: 'document', name: file.name }
      );
    } catch { Alert.alert('Error', 'Could not read the file. Please try a .txt file.'); }
  }, [sendMessage]);

  const suggestions = getSuggestions(hairType);

  const listData = [
    ...messages,
    ...(loading ? [{ id: '__typing__', role: 'typing' as any, text: '' }] : []),
    ...(error ? [{ id: '__error__', role: 'error' as any, text: error }] : []),
    ...(showSuggestions && messages.length === 1 ? [{ id: '__chips__', role: 'chips' as any, text: '' }] : []),
  ];

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#120B2E', '#332463', Colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.header}>
        <View style={st.headerAvatar}><Text style={{ fontSize: 22 }}>✨</Text></View>
        <View style={st.headerText}>
          <Text style={st.headerName}>Tressie ✨</Text>
          <View style={st.headerSubRow}>
            <View style={st.onlineDot} />
            <Text style={st.headerSub}>{hairType ? `Your hair big sis • Type ${hairType}` : 'Your hair big sis'}</Text>
          </View>
        </View>
      </LinearGradient>

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanned={handleBarcodeScanned}
      />

      <KeyboardAvoidingView style={st.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <Pressable style={st.flex} onPress={() => setShowAttachMenu(false)}>
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={item => item.id}
            contentContainerStyle={st.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            renderItem={({ item, index }) => {
              if (item.role === 'typing') return <TypingDots />;
              if (item.role === 'error') return (
                <Animated.View entering={FadeInUp.duration(250)} style={st.errorBox}>
                  <Text style={st.errorText}>⚠️  {item.text}</Text>
                </Animated.View>
              );
              if (item.role === 'chips') return (
                <Animated.View entering={FadeInUp.delay(180).duration(300)} style={st.chips}>
                  {suggestions.map(s => (
                    <Pressable key={s.label} onPress={() => sendMessage(s.label)} style={({ pressed }) => [st.chip, pressed && { opacity: 0.65 }]}>
                      <Text style={st.chipEmoji}>{s.emoji}</Text>
                      <Text style={st.chipText}>{s.label}</Text>
                    </Pressable>
                  ))}
                </Animated.View>
              );
              return <MessageRow msg={item as Message} index={index} />;
            }}
          />
        </Pressable>

        {showAttachMenu && (
          <AttachMenu
            onIngredientScan={handleIngredientScan}
            onBarcodeScan={() => { setShowAttachMenu(false); setShowBarcodeScanner(true); }}
            onDocument={handleDocumentUpload}
          />
        )}

        <View style={st.inputWrap}>
          <View style={[st.inputRow, input.length > 0 && st.inputRowFocused]}>
            <Pressable onPress={() => setShowAttachMenu(prev => !prev)} style={st.plusBtn}>
              <LinearGradient
                colors={showAttachMenu ? [Colors.violet, Colors.pink] as any : [Colors.violetBg2, Colors.violetBg2] as any}
                style={st.plusBtnInner}
              >
                <Text style={[st.plusIcon, showAttachMenu && { color: '#fff' }]}>＋</Text>
              </LinearGradient>
            </Pressable>
            <TextInput
              style={st.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask Tressie anything..."
              placeholderTextColor={Colors.muted}
              multiline
              maxLength={500}
              editable={!loading}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => sendMessage()}
              onFocus={() => setShowAttachMenu(false)}
            />
            <Pressable onPress={() => sendMessage()} disabled={loading || !input.trim()} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
              <LinearGradient
                colors={(input.trim() && !loading) ? [Colors.violet, Colors.pink] as any : [Colors.border, Colors.border] as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={st.sendBtn}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <IconSend />}
              </LinearGradient>
            </Pressable>
          </View>
          <Text style={st.footerNote}>Tressie • Your hair big sis 🌿</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.porcelain },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 0 : 8, paddingBottom: 16 },
  headerAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  headerText: { flex: 1 },
  headerName: { fontFamily: Fonts.heading, fontSize: 19, color: Colors.white, letterSpacing: -0.3 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.lime },
  headerSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowAI: { flexDirection: 'row' },
  msgRowUser: { flexDirection: 'row-reverse' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.violetBg2, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1.5, borderColor: Colors.border },

  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleAI: { backgroundColor: Colors.white, borderTopLeftRadius: 4, borderWidth: 1.5, borderColor: Colors.border },
  bubbleUser: { borderTopRightRadius: 4 },
  bubbleText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, lineHeight: 21 },
  bubbleTextUser: { color: Colors.white },

  attachBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.violetBg2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  attachBadgeUser: { backgroundColor: 'rgba(255,255,255,0.15)' },
  attachBadgeName: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.violet, flex: 1 },

  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  bullet: { fontFamily: Fonts.bodySemi, color: Colors.violet, fontSize: 14, lineHeight: 21 },
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  dotsWrap: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.violet },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 40, paddingTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.violet, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: Colors.white },
  chipEmoji: { fontSize: 12 },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.violet },

  errorBox: { backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.12)', borderRadius: Radius.md, padding: 12 },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error },

  attachMenu: { marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  attachItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  attachIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.violetBg2, alignItems: 'center', justifyContent: 'center' },
  attachLabel: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink },
  attachSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 1 },
  attachDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 70 },

  inputWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 8 : 14, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.porcelain },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, paddingLeft: 6, paddingRight: 6, paddingVertical: 6 },
  inputRowFocused: { borderColor: Colors.violet },
  plusBtn: { flexShrink: 0 },
  plusBtnInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  plusIcon: { fontSize: 20, color: Colors.violet, lineHeight: 22 },
  input: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, maxHeight: 100, paddingVertical: 6, paddingHorizontal: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  footerNote: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, textAlign: 'center', marginTop: 8, opacity: 0.55 },

  scanModal: { flex: 1, backgroundColor: '#000' },
  scanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 40, paddingBottom: 16, backgroundColor: '#120B2E' },
  scanTitle: { fontFamily: Fonts.heading, fontSize: 18, color: '#fff' },
  scanClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 260, height: 160, borderRadius: 16, borderWidth: 3, borderColor: Colors.violet },
  scanHint: { fontFamily: Fonts.body, fontSize: 13, color: '#fff', marginTop: 20, textAlign: 'center', paddingHorizontal: 40, opacity: 0.8 },
  scanNoPerm: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  scanPermBtn: { backgroundColor: Colors.violet, paddingVertical: 14, paddingHorizontal: 32, borderRadius: Radius.lg },
});