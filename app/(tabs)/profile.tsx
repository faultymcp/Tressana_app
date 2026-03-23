import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

// ─── Curl Pattern SVG ────────────────────────────────────────────
function CurlPattern({ type, size = 70, color }: { type: string; size?: number; color?: string }) {
  const cx = 25; let d = '', sw = 2.2; const stroke = color || Colors.violet;
  if (type === '1' || type === '1A') { d = `M${cx} 2 L${cx} 68`; sw = 2; }
  else if (type === '1B') { d = `M${cx} 2 Q${cx+3} 20, ${cx} 35 Q${cx-3} 50, ${cx} 68`; }
  else if (type === '1C') { d = `M${cx} 2 L${cx} 68`; sw = 3.2; }
  else if (type === '2' || type === '2A') { d = `M${cx} 2 Q${cx+10} 14, ${cx} 24 Q${cx-10} 34, ${cx} 44 Q${cx+8} 54, ${cx} 68`; sw = 2; }
  else if (type === '2B') { d = `M${cx} 2 Q${cx+12} 10, ${cx} 18 Q${cx-12} 26, ${cx} 34 Q${cx+12} 42, ${cx} 50 Q${cx-12} 58, ${cx} 68`; }
  else if (type === '2C') { d = `M${cx} 2 Q${cx+14} 7, ${cx} 13 Q${cx-14} 19, ${cx} 24 Q${cx+14} 29, ${cx} 35 Q${cx-14} 41, ${cx} 46 Q${cx+14} 51, ${cx} 57 Q${cx-14} 63, ${cx} 68`; }
  else if (type === '3' || type === '3A') { d = `M${cx} 2 C${cx+18} 5, ${cx+18} 16, ${cx} 18 C${cx-18} 20, ${cx-18} 31, ${cx} 33 C${cx+18} 35, ${cx+18} 46, ${cx} 48 C${cx-18} 50, ${cx-18} 61, ${cx} 63 L${cx} 68`; sw = 1.8; }
  else if (type === '3B') { d = `M${cx} 2 C${cx+16} 4, ${cx+16} 12, ${cx} 14 C${cx-16} 16, ${cx-16} 24, ${cx} 26 C${cx+16} 28, ${cx+16} 36, ${cx} 38 C${cx-16} 40, ${cx-16} 48, ${cx} 50 C${cx+16} 52, ${cx+16} 60, ${cx} 62 L${cx} 68`; sw = 1.8; }
  else if (type === '3C') { d = `M${cx} 2 C${cx+14} 3, ${cx+14} 9, ${cx} 10 C${cx-14} 11, ${cx-14} 17, ${cx} 18 C${cx+14} 19, ${cx+14} 25, ${cx} 26 C${cx-14} 27, ${cx-14} 33, ${cx} 34 C${cx+14} 35, ${cx+14} 41, ${cx} 42 C${cx-14} 43, ${cx-14} 49, ${cx} 50 C${cx+14} 51, ${cx+14} 57, ${cx} 58 C${cx-14} 59, ${cx-14} 65, ${cx} 66`; sw = 1.7; }
  else if (type === '4' || type === '4A') { d = `M${cx} 2 C${cx+11} 3, ${cx+11} 7, ${cx} 8 C${cx-11} 9, ${cx-11} 13, ${cx} 14 C${cx+11} 15, ${cx+11} 19, ${cx} 20 C${cx-11} 21, ${cx-11} 25, ${cx} 26 C${cx+11} 27, ${cx+11} 31, ${cx} 32 C${cx-11} 33, ${cx-11} 37, ${cx} 38 C${cx+11} 39, ${cx+11} 43, ${cx} 44 C${cx-11} 45, ${cx-11} 49, ${cx} 50 C${cx+11} 51, ${cx+11} 55, ${cx} 56 C${cx-11} 57, ${cx-11} 61, ${cx} 62 C${cx+11} 63, ${cx+11} 67, ${cx} 68`; sw = 1.5; }
  else if (type === '4B') { let y = 2; d = `M${cx} ${y}`; let left = true; while (y + 6 <= 68) { y += 6; d += ` L${left ? cx-10 : cx+10} ${y}`; left = !left; } sw = 1.5; }
  else if (type === '4C') { d = `M${cx} 2`; for (let y = 2; y + 5 <= 68; y += 5) { d += ` C${cx+9} ${y+1}, ${cx+9} ${y+4}, ${cx} ${y+5} C${cx-9} ${y+6}, ${cx-9} ${y+9}, ${cx} ${y+10}`; y += 5; } sw = 1.4; }
  if (!d) return null;
  return <Svg width={size * 0.7} height={size} viewBox="0 0 50 70"><Path d={d} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function IconChevron() {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round"><Path d="M9 18l6-6-6-6" /></Svg>;
}

const TYPE_NAMES: Record<string, string> = {
  '1A': 'Pin Straight', '1B': 'Straight with Body', '1C': 'Straight & Thick',
  '2A': 'Loose Waves', '2B': 'Defined Waves', '2C': 'Deep Waves',
  '3A': 'Loose Curls', '3B': 'Springy Ringlets', '3C': 'Tight Corkscrews',
  '4A': 'Coil Springs', '4B': 'Z-Pattern Coils', '4C': 'Ultra-Tight Coils',
};
const POROSITY_NAMES: Record<string, string> = { low: 'Low Porosity', medium: 'Medium Porosity', high: 'High Porosity', unsure: 'Unknown' };
const GOAL_LABELS: Record<string, string> = { moisture: 'More moisture', growth: 'Length retention', definition: 'Curl definition', frizz: 'Frizz control', scalp_goal: 'Healthier scalp', damage: 'Repair damage' };
const SCALP_LABELS: Record<string, string> = { oily: 'Oily', dry: 'Dry', flaky: 'Flaky', sensitive: 'Sensitive', buildup: 'Buildup', healthy: 'Healthy' };
const HISTORY_LABELS: Record<string, string> = { colour: 'Colour treated', relaxer: 'Relaxed', heat: 'Heat styling', protective: 'Protective styles', natural: 'Fully natural', transitioning: 'Transitioning' };

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) setQuiz(JSON.parse(raw));
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const hairType = quiz?.hairType || '';
  const typeName = TYPE_NAMES[hairType] || '';
  const porosity = quiz?.porosity || 'unsure';
  const goals = (quiz?.goals as string[]) || [];
  const scalp = (quiz?.scalp as string[]) || [];
  const history = (quiz?.history as string[]) || [];
  const hasQuiz = !!quiz;

  return (
    <ScrollView style={st.container} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
      <Text style={st.pageTitle}>Profile</Text>

      {/* Hair Type Hero Card */}
      {hasQuiz ? (
        <Animated.View entering={FadeInUp.duration(400)}>
          <LinearGradient colors={['#120B2E', '#332463', '#7643AC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.heroCard}>
            <View style={st.heroTop}>
              <View style={st.heroPattern}>
                <CurlPattern type={hairType} size={80} color="rgba(255,255,255,0.25)" />
                <View style={st.heroBadge}>
                  <Text style={st.heroBadgeText}>{hairType}</Text>
                </View>
              </View>
              <View style={st.heroInfo}>
                <Text style={st.heroTypeName}>{typeName}</Text>
                <Text style={st.heroPorosity}>{POROSITY_NAMES[porosity]}</Text>
              </View>
            </View>
            <View style={st.tagRow}>
              {goals.slice(0, 3).map(g => (
                <View key={g} style={st.heroTag}>
                  <Text style={st.heroTagText}>{GOAL_LABELS[g] || g}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInUp.duration(400)} style={st.noQuizCard}>
          <Text style={st.noQuizTitle}>Discover your hair type</Text>
          <Text style={st.noQuizDesc}>Take the 2-minute quiz to get personalised recommendations, a custom routine, and product picks.</Text>
          <Pressable onPress={() => router.push('/quiz')} style={st.noQuizBtn}>
            <LinearGradient colors={['#7643AC', '#F484B9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.noQuizBtnInner}>
              <Text style={st.noQuizBtnText}>Take the quiz</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      {/* Stats Row */}
      {hasQuiz && (
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={st.statsRow}>
          <View style={st.stat}>
            <Text style={st.statValue}>{hairType}</Text>
            <Text style={st.statLabel}>Hair type</Text>
          </View>
          <View style={st.statLine} />
          <View style={st.stat}>
            <Text style={[st.statValue, { textTransform: 'capitalize' }]}>{porosity}</Text>
            <Text style={st.statLabel}>Porosity</Text>
          </View>
          <View style={st.statLine} />
          <View style={st.stat}>
            <Text style={st.statValue}>{goals.length}</Text>
            <Text style={st.statLabel}>Goals</Text>
          </View>
        </Animated.View>
      )}

      {/* Scalp + History */}
      {hasQuiz && (scalp.length > 0 || history.length > 0) && (
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={st.detailCard}>
          {scalp.length > 0 && (
            <View>
              <Text style={st.detailTitle}>Scalp condition</Text>
              <View style={st.chipRow}>
                {scalp.map(s => (
                  <View key={s} style={st.chip}><Text style={st.chipText}>{SCALP_LABELS[s] || s}</Text></View>
                ))}
              </View>
            </View>
          )}
          {history.length > 0 && (
            <View style={scalp.length > 0 ? { marginTop: 16 } : undefined}>
              <Text style={st.detailTitle}>Hair history</Text>
              <View style={st.chipRow}>
                {history.map(h => (
                  <View key={h} style={st.chip}><Text style={st.chipText}>{HISTORY_LABELS[h] || h}</Text></View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Goals */}
      {hasQuiz && goals.length > 0 && (
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={st.detailCard}>
          <Text style={st.detailTitle}>Your hair goals</Text>
          {goals.map(g => (
            <View key={g} style={st.goalRow}>
              <View style={st.goalDot} />
              <Text style={st.goalText}>{GOAL_LABELS[g] || g}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Menu */}
      <Animated.View entering={FadeInUp.delay(400).duration(400)} style={st.menu}>
        <Pressable onPress={() => router.push('/reveal')} style={st.menuItem}>
          <Text style={st.menuLabel}>View full results</Text>
          <IconChevron />
        </Pressable>
        <Pressable onPress={() => router.push('/quiz')} style={st.menuItem}>
          <Text style={st.menuLabel}>Retake quiz</Text>
          <IconChevron />
        </Pressable>
        <Pressable style={[st.menuItem, { borderBottomWidth: 0 }]}>
          <Text style={st.menuLabel}>Settings</Text>
          <IconChevron />
        </Pressable>
      </Animated.View>

      {/* Sign out */}
      {user && (
        <View style={st.authSection}>
          <Text style={st.authEmail}>{user.email}</Text>
          <Pressable onPress={handleSignOut} style={st.signOutBtn}>
            <Text style={st.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      )}

      <Text style={st.version}>Tressana.ai v1.0.0</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  scroll: { paddingTop: Platform.OS === 'ios' ? 62 : 48, paddingBottom: 100 },
  pageTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.ink, paddingHorizontal: 20, marginBottom: 20, letterSpacing: -0.5 },

  heroCard: { marginHorizontal: 20, borderRadius: 22, padding: 22, marginBottom: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 16 },
  heroPattern: { alignItems: 'center', justifyContent: 'center', width: 72, height: 80 },
  heroBadge: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  heroBadgeText: { fontFamily: Fonts.heading, fontSize: 16, color: '#fff' },
  heroInfo: { flex: 1 },
  heroTypeName: { fontFamily: Fonts.heading, fontSize: 20, color: '#fff', marginBottom: 4 },
  heroPorosity: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroTag: { backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10 },
  heroTagText: { fontFamily: Fonts.bodyMedium, fontSize: 10, color: 'rgba(255,255,255,0.8)' },

  noQuizCard: { marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.white, borderRadius: 22, padding: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  noQuizTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink, marginBottom: 8 },
  noQuizDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 18, maxWidth: 280 },
  noQuizBtn: { borderRadius: Radius.lg, overflow: 'hidden', width: '100%' },
  noQuizBtnInner: { paddingVertical: 15, alignItems: 'center' },
  noQuizBtnText: { fontFamily: Fonts.headingSemi, fontSize: 14, color: '#fff' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },
  statLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, marginTop: 3 },
  statLine: { width: 1, height: 28, backgroundColor: Colors.border },

  detailCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: Colors.white, borderRadius: 18, padding: 20, borderWidth: 1.5, borderColor: Colors.border },
  detailTitle: { fontFamily: Fonts.headingSemi, fontSize: 14, color: Colors.ink, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#F7F5FB', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.ink },

  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  goalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.violet },
  goalText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink },

  menu: { marginHorizontal: 20, marginBottom: 14, backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLabel: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.ink },

  authSection: { marginHorizontal: 20, marginBottom: 14, alignItems: 'center', gap: 12 },
  authEmail: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  signOutBtn: { width: '100%', paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.error, alignItems: 'center' },
  signOutText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.error },

  version: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, textAlign: 'center', marginTop: 16, opacity: 0.4 },
});