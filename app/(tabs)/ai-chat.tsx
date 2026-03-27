import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  Pressable, KeyboardAvoidingView, Platform,
  ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import Animated, { FadeInUp, FadeInLeft, FadeInRight } from 'react-native-reanimated';

// EXPO_PUBLIC_GEMINI_KEY
const GEMINI_KEY = 'AIzaSyDQTBnC3ydFLkDUobOZQVUaqSV5RrLEP_0';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

// ── Tressie's personality + product knowledge ─────────────────────
const SYSTEM_PROMPT = `You are Tressie, the AI hair advisor inside the Tressana app. You are the user's older sister — the one who actually figured out her hair, did all the research so they don't have to, and is always real with them.

YOUR PERSONALITY — older sister energy, all the way:
- Talk like a real person, not a customer service bot. Casual, warm, direct.
- Say things like "okay so here's the thing...", "sis listen", "real talk", "trust me on this", "no cap this actually works", "I've been there"
- You're encouraging but honest — if something won't help their hair, you'll say so, lovingly
- You hype them up genuinely. Their hair journey matters.
- Use community terms: wash day, protective styles, shrinkage, LOC method, porosity, big chop, transitioning, co-wash, pre-poo
- Keep it concise — short punchy sentences, get to the point fast
- Occasional emojis are fine, don't overdo it
- If someone is frustrated, validate FIRST. "Ugh I know, that's so annoying" before giving advice.

YOUR NAME IS TRESSIE. You are not "an AI" or "Tressana AI" — you're Tressie, their hair big sis.

WHAT YOU HELP WITH:
1. Wash day routines — Pre-poo, Cleanse, Deep Condition, Moisturise, Style
2. Hair type and porosity — help them figure out what they're working with
3. Troubleshooting — breakage, dryness, frizz, shrinkage, buildup, shedding
4. The science, simplified — porosity, protein-moisture balance, LOC/LCO method
5. Product recommendations from the Tressana catalogue
6. Encouragement on the hair journey

TRESSANA PRODUCTS (only recommend these):
• Tressana Hydrating Hair Mask — treatment | dry hair, brittle strands, moisture retention | Types 3A-4C
• Tressana Soothing Scalp Serum — scalp care | sensitive scalp, itchiness, inflammation | all types
• Tressana Curl Defining Cream — styling | curl definition, frizz control | Types 3A-4A
• Tressana Deep Moisture Butter — moisturiser | extreme dryness, high porosity, breakage | Types 4A-4C
• Tressana Pre-Poo Detangling Oil — pre-treatment | tangles, pre-wash protection | Types 3C-4C
• Tressana Co-Wash Cleansing Conditioner — cleanser | gentle cleansing, moisture balance | Types 3B-4C

RULES:
- Only recommend products from the list above. If nothing fits, tell them to check the full Tressana catalogue.
- Never shame any hair texture, porosity, or practice.
- If asked something outside hair, redirect warmly: "that's outside my lane babe, but what I CAN help with is..."
- Short answers unless they ask for a full routine.

The Tressana app also has a Wash Day Tracker, Stylist Marketplace, and AI Hair Analysis — mention these when relevant.`;

// ── Types ─────────────────────────────────────────────────────────
type Message = { id: string; role: 'user' | 'assistant'; text: string };
type GeminiMessage = { role: 'user' | 'model'; parts: { text: string }[] };

// ── Suggestion chips ──────────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Build my wash day routine', emoji: '🚿' },
  { label: 'Products for my hair type', emoji: '✨' },
  { label: 'My hair is really dry', emoji: '💧' },
  { label: 'How do I find my porosity?', emoji: '🔬' },
  { label: 'Pre-poo tips', emoji: '🌿' },
  { label: 'Help with frizz', emoji: '🌀' },
];

// ── Icons ─────────────────────────────────────────────────────────
function IconSend() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="22" y1="2" x2="11" y2="13" />
      <Polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  );
}

// ── Inline bold renderer ──────────────────────────────────────────
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

// ── Bubble content ────────────────────────────────────────────────
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
              <InlineText
                text={line.replace(/^[•\-]\s*/, '')}
                style={[st.bubbleText, isUser && st.bubbleTextUser]}
                boldStyle={isUser ? { fontFamily: Fonts.bodySemi, color: '#fff' } : undefined}
              />
            </View>
          );
        }
        return (
          <InlineText
            key={i}
            text={line}
            style={[st.bubbleText, isUser && st.bubbleTextUser, i > 0 && { marginTop: 3 }]}
            boldStyle={isUser ? { fontFamily: Fonts.bodySemi, color: '#fff' } : undefined}
          />
        );
      })}
    </View>
  );
}

// ── Typing dots ───────────────────────────────────────────────────
function TypingDots() {
  return (
    <View style={st.typingRow}>
      <LinearGradient colors={[Colors.violet, Colors.lavender]} style={st.aiAvatar}>
        <Text style={{ fontSize: 13 }}>✨</Text>
      </LinearGradient>
      <View style={[st.bubble, st.bubbleAI]}>
        <View style={st.dotsWrap}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[st.dot, { opacity: 0.3 + i * 0.25 }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Message row ───────────────────────────────────────────────────
function MessageRow({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === 'user';
  const Anim = isUser ? FadeInRight : FadeInLeft;
  return (
    <Animated.View
      entering={Anim.delay(index < 2 ? 0 : 50).duration(260)}
      style={[st.msgRow, isUser ? st.msgRowUser : st.msgRowAI]}
    >
      {!isUser && (
        <LinearGradient colors={[Colors.violet, Colors.lavender]} style={st.aiAvatar}>
          <Text style={{ fontSize: 13 }}>✨</Text>
        </LinearGradient>
      )}
      {isUser ? (
        <LinearGradient
          colors={['#120B2E', Colors.violet] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[st.bubble, st.bubbleUser]}
        >
          <BubbleContent text={msg.text} isUser />
        </LinearGradient>
      ) : (
        <View style={[st.bubble, st.bubbleAI]}>
          <BubbleContent text={msg.text} isUser={false} />
        </View>
      )}
      {isUser && (
        <View style={st.userAvatar}>
          <Text style={{ fontSize: 13 }}>🌿</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    text: "Heyy! 👋 I'm **Tressie**, your hair assistant inside Tressana.\n\nReal talk — I've done the research, tried the products, and made the mistakes so you don't have to. Whether you're rocking **4C coils**, managing **3B curls**, or still figuring out what you're even working with — I got you.\n\nSo what's going on with your hair? 👀",
  }]);
  const [history, setHistory] = useState<GeminiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hairType, setHairType] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) setHairType(JSON.parse(raw).hairType || '');
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setError(null);
    setShowSuggestions(false);
    setInput('');

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    scrollToBottom();

    // Add hair type context if available
    const contextMsg = hairType ? `[My hair type is ${hairType}] ${trimmed}` : trimmed;

    const newHistory: GeminiMessage[] = [
      ...history,
      { role: 'user', parts: [{ text: contextMsg }] },
    ];

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: newHistory,
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 600,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Error ${response.status}`);
      }

      const data = await response.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        || "Hmm, something went weird on my end. Try again in a sec!";

      const aiMsg: Message = { id: `a_${Date.now()}`, role: 'assistant', text: replyText };
      setMessages(prev => [...prev, aiMsg]);

      // Update conversation history for multi-turn memory
      setHistory([
        ...newHistory,
        { role: 'model', parts: [{ text: replyText }] },
      ]);
    } catch (err: any) {
      setError(err.message?.includes('API key')
        ? 'API key issue — check EXPO_PUBLIC_GEMINI_KEY in your .env'
        : err.message ?? 'Something went wrong. Try again!'
      );
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, history, hairType, scrollToBottom]);

  const listData = [
    ...messages,
    ...(loading ? [{ id: '__typing__', role: 'typing' as any, text: '' }] : []),
    ...(error ? [{ id: '__error__', role: 'error' as any, text: error }] : []),
    ...(showSuggestions && messages.length === 1 ? [{ id: '__chips__', role: 'chips' as any, text: '' }] : []),
  ];

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#120B2E', '#332463', Colors.violet]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={st.header}
      >
        <View style={st.headerAvatar}>
          <Text style={{ fontSize: 22 }}>✨</Text>
        </View>
        <View style={st.headerText}>
          <Text style={st.headerName}>Tressie ✨</Text>
          <View style={st.headerSubRow}>
            <View style={st.onlineDot} />
            <Text style={st.headerSub}>
              {hairType ? `Your hair assistant • Type ${hairType}` : 'Your hair assistant'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Chat body ── */}
      <KeyboardAvoidingView
        style={st.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
                {SUGGESTIONS.map(s => (
                  <Pressable
                    key={s.label}
                    onPress={() => sendMessage(s.label)}
                    style={({ pressed }) => [st.chip, pressed && { opacity: 0.65 }]}
                  >
                    <Text style={st.chipEmoji}>{s.emoji}</Text>
                    <Text style={st.chipText}>{s.label}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            );
            return <MessageRow msg={item as Message} index={index} />;
          }}
        />

        {/* ── Input ── */}
        <View style={st.inputWrap}>
          <View style={[st.inputRow, input.length > 0 && st.inputRowFocused]}>
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
            />
            <Pressable
              onPress={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={(input.trim() && !loading) ? [Colors.violet, Colors.pink] as any : [Colors.border, Colors.border] as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={st.sendBtn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <IconSend />
                }
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

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
    paddingBottom: 16,
  },
  headerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  headerText: { flex: 1 },
  headerName: { fontFamily: Fonts.heading, fontSize: 19, color: Colors.white, letterSpacing: -0.3 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.lime },
  headerSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowAI: { flexDirection: 'row' },
  msgRowUser: { flexDirection: 'row-reverse' },

  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.violetBg2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1.5, borderColor: Colors.border,
  },

  bubble: { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleAI: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 4,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  bubbleUser: { borderTopRightRadius: 4 },
  bubbleText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, lineHeight: 21 },
  bubbleTextUser: { color: Colors.white },

  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  bullet: { fontFamily: Fonts.bodySemi, color: Colors.violet, fontSize: 14, lineHeight: 21 },

  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  dotsWrap: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.violet },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 40, paddingTop: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.violet,
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12,
    backgroundColor: Colors.white,
  },
  chipEmoji: { fontSize: 12 },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.violet },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.12)',
    borderRadius: Radius.md, padding: 12,
  },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error },

  inputWrap: {
    paddingHorizontal: 16, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 14,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.porcelain,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
  },
  inputRowFocused: { borderColor: Colors.violet },
  input: {
    flex: 1, fontFamily: Fonts.body,
    fontSize: 14, color: Colors.ink,
    maxHeight: 100, paddingVertical: 6,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  footerNote: {
    fontFamily: Fonts.body, fontSize: 10,
    color: Colors.muted, textAlign: 'center',
    marginTop: 8, opacity: 0.55,
  },
});