// app/(tabs)/ai-chat.tsx
// Tressie — the AI hair advisor
// Uses Gemini via Edge Function proxy, personalised to user's hair profile

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  TextInput, KeyboardAvoidingView, ActivityIndicator, Keyboard,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

const IC = {
  Send: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill={Colors.violet} stroke="none"><Path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></Svg>,
  Sparkle: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill={Colors.violet} stroke="none"><Path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" /></Svg>,
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const SUGGESTIONS = [
  "What's a good wash day routine for my hair?",
  "How do I reduce frizz in humid weather?",
  "What ingredients should I avoid?",
  "How often should I deep condition?",
];

export default function AiChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hairProfile, setHairProfile] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Load hair profile for context
  useEffect(() => {
    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) setHairProfile(JSON.parse(raw));
    });

    // Load chat history
    AsyncStorage.getItem('tressana_chat_history').then(raw => {
      if (raw) {
        const parsed = JSON.parse(raw);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }
    });
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      const toSave = messages.slice(-50); // Keep last 50 messages
      AsyncStorage.setItem('tressana_chat_history', JSON.stringify(toSave));
    }
  }, [messages]);

  const buildSystemPrompt = () => {
    let context = `You are Tressie, the AI hair advisor inside the Tressana app. You are warm, knowledgeable, and direct. You speak like a trusted friend who happens to be a trichologist. Never use generic advice — always tailor to the user's specific hair profile.\n\n`;

    if (hairProfile) {
      context += `The user's hair profile:\n`;
      context += `- Hair type: ${hairProfile.hairType || 'Unknown'}\n`;
      context += `- Porosity: ${hairProfile.porosity || 'Unknown'}\n`;
      context += `- Goals: ${(hairProfile.goals || []).join(', ') || 'Not set'}\n`;
      context += `- Segments: ${(hairProfile.segments || ['natural']).join(', ')}\n`;
      context += `- Scalp: ${(hairProfile.scalp || []).join(', ') || 'Not assessed'}\n`;
      context += `- History: ${(hairProfile.history || []).join(', ') || 'None'}\n\n`;
      context += `Use this profile to give specific, actionable advice. Reference their hair type and goals in your answers. If they have braids, give braid-specific advice. If they're postpartum, be sensitive and practical. If they have a transplant, always defer to their surgeon for medical decisions.\n\n`;
    }

    context += `Guidelines:\n`;
    context += `- Keep responses concise (2-4 paragraphs max)\n`;
    context += `- Suggest specific products when relevant (drugstore-accessible, UK availability)\n`;
    context += `- If you don't know, say so — don't invent\n`;
    context += `- Never diagnose medical conditions — refer to a dermatologist or trichologist\n`;
    context += `- Use British English spelling\n`;

    return context;
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    Keyboard.dismiss();

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Build conversation history for context
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: buildSystemPrompt() }] },
            contents: [
              ...history,
              { role: 'user', parts: [{ text: content }] },
            ],
          }),
        },
      );

      const data = await response.json();

      let reply = 'Sorry, I had trouble thinking about that. Could you try again?';

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        reply = data.candidates[0].content.parts[0].text;
      } else if (data.error) {
        // Fallback: try direct Gemini call (if Edge Function not deployed yet)
        const directRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: buildSystemPrompt() }] },
              contents: [
                ...history,
                { role: 'user', parts: [{ text: content }] },
              ],
            }),
          },
        );
        const directData = await directRes.json();
        if (directData.candidates?.[0]?.content?.parts?.[0]?.text) {
          reply = directData.candidates[0].content.parts[0].text;
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Check your internet and try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [input, loading, messages, hairProfile]);

  const handleClearChat = () => {
    setMessages([]);
    AsyncStorage.removeItem('tressana_chat_history');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <View style={st.avatar}>
            <IC.Sparkle />
          </View>
          <View>
            <Text style={st.headerTitle}>Tressie</Text>
            <Text style={st.headerSub}>Your hair advisor</Text>
          </View>
        </View>
        {messages.length > 0 && (
          <Pressable onPress={handleClearChat} style={st.clearBtn}>
            <Text style={st.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={st.messageList}
        contentContainerStyle={st.messageListContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <Animated.View entering={FadeIn.duration(400)} style={st.welcomeWrap}>
            <View style={st.welcomeAvatar}>
              <IC.Sparkle />
            </View>
            <Text style={st.welcomeTitle}>Hey, I'm Tressie</Text>
            <Text style={st.welcomeSub}>
              {hairProfile
                ? `I know your ${hairProfile.hairType || ''} hair and what it needs. Ask me anything about your routine, products, or styling.`
                : `Take the hair quiz first so I can give you personalised advice. For now, ask me anything about hair care.`}
            </Text>

            {/* Suggestion pills */}
            <View style={st.suggestionsWrap}>
              {SUGGESTIONS.map((s, i) => (
                <Pressable key={i} onPress={() => sendMessage(s)} style={({ pressed }) => [st.suggestionPill, pressed && { opacity: 0.7 }]}>
                  <Text style={st.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : (
          messages.map((msg, i) => (
            <Animated.View
              key={msg.id}
              entering={FadeInUp.delay(i === messages.length - 1 ? 0 : 0).duration(250)}
              style={[st.msgRow, msg.role === 'user' && st.msgRowUser]}
            >
              {msg.role === 'assistant' && (
                <View style={st.msgAvatar}><IC.Sparkle /></View>
              )}
              <View style={[st.msgBubble, msg.role === 'user' ? st.msgBubbleUser : st.msgBubbleAssistant]}>
                <Text style={[st.msgText, msg.role === 'user' && st.msgTextUser]}>{msg.content}</Text>
                <Text style={[st.msgTime, msg.role === 'user' && st.msgTimeUser]}>{formatTime(msg.timestamp)}</Text>
              </View>
            </Animated.View>
          ))
        )}

        {/* Typing indicator */}
        {loading && (
          <Animated.View entering={FadeIn.duration(200)} style={st.msgRow}>
            <View style={st.msgAvatar}><IC.Sparkle /></View>
            <View style={[st.msgBubble, st.msgBubbleAssistant, st.typingBubble]}>
              <View style={st.typingDots}>
                <TypingDot delay={0} />
                <TypingDot delay={200} />
                <TypingDot delay={400} />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={st.inputBar}>
        <TextInput
          ref={inputRef}
          style={st.textInput}
          placeholder="Ask Tressie anything..."
          placeholderTextColor={Colors.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={({ pressed }) => [st.sendBtn, (!input.trim() || loading) && st.sendBtnDisabled, pressed && { opacity: 0.7 }]}
        >
          {loading ? <ActivityIndicator size="small" color={Colors.violet} /> : <IC.Send />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Typing dot animation ─────────────────────────────────────────
function TypingDot({ delay }: { delay: number }) {
  const opacity = useRef(new (require('react-native').Animated.Value)(0.3)).current;

  useEffect(() => {
    const anim = require('react-native').Animated;
    const loop = anim.loop(
      anim.sequence([
        anim.delay(delay),
        anim.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        anim.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const RNAnimated = require('react-native').Animated;
  return <RNAnimated.View style={[st.dot, { opacity }]} />;
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.porcelain,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0EBFA', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },
  headerSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 14 },
  clearText: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.muted },

  messageList: { flex: 1 },
  messageListContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  // Welcome
  welcomeWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  welcomeAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F0EBFA', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  welcomeTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.ink, marginBottom: 8 },
  welcomeSub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28, maxWidth: 280 },
  suggestionsWrap: { gap: 8, width: '100%' },
  suggestionPill: {
    paddingVertical: 14, paddingHorizontal: 18,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  suggestionText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, lineHeight: 20 },

  // Messages
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F0EBFA', alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  msgBubble: { maxWidth: '78%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20 },
  msgBubbleUser: {
    backgroundColor: Colors.violet,
    borderBottomRightRadius: 6,
  },
  msgBubbleAssistant: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  msgText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, lineHeight: 22 },
  msgTextUser: { color: '#fff' },
  msgTime: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, marginTop: 6, alignSelf: 'flex-end' },
  msgTimeUser: { color: 'rgba(255,255,255,0.5)' },

  // Typing
  typingBubble: { paddingVertical: 16, paddingHorizontal: 20 },
  typingDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.violet },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.porcelain,
  },
  textInput: {
    flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.ink,
    backgroundColor: Colors.white, borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 18, paddingVertical: 12,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F0EBFA', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});