// app/(tabs)/_layout.tsx
//
// The tab bar. Editorial chrome that wraps every tab in Tressana.
//
// Design rules:
//   - Slimmer silhouette than default RN tabs (76pt on iOS vs 88pt)
//   - Glass-blur backdrop on iOS for that Apple-Music/Spotify premium feel,
//     solid cream on Android (BlurView on Android often looks muddy)
//   - Idle icons: muted lavender, thin 1.5pt stroke
//   - Active icons: full violet, with a small gold dot below — editorial
//     marker, harmonises with the reveal pager's dot progress
//   - Labels: Sora caps idle, Fraunces serif active (subtle but elegant)
//   - Center AI button: gradient pill (violet → pink), not solid violet.
//     Slightly recessed glow behind it instead of a hard shadow
//   - Haptic on tab change

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

// ── Color tokens local to chrome ─────────────────────────────────
const IDLE = 'rgba(51,36,99,0.42)';      // muted ink
const ACTIVE = '#7643AC';                 // violet
const GOLD = '#8AB800';                   // earthy gold for dot
const BG_BLUR_TINT = Platform.OS === 'ios' ? 'light' : 'default';

// ─── Tab Icons (1.5pt strokes for a finer feel) ──────────────────
function IconHome({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}
function IconDiscover({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8" />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}
function IconSalons({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="6" cy="6" r="3" />
      <Circle cx="6" cy="18" r="3" />
      <Path d="M20 4L8.12 15.88" />
      <Path d="M14.47 14.48L20 20" />
      <Path d="M8.12 8.12L12 12" />
    </Svg>
  );
}
function IconProfile({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

// ─── AI center button — gradient pill, soft glow ─────────────────
function IconAI({ focused }: { focused: boolean }) {
  return (
    <View style={styles.aiWrap}>
      {/* Soft outer glow */}
      <View style={[styles.aiGlow, focused && styles.aiGlowActive]} />
      <LinearGradient
        colors={focused
          ? ['#F484B9', '#7643AC']
          : ['#7643AC', '#F484B9']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiBtn}
      >
        {/* Sparkle / wand icon */}
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFEF7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          <Path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          <Circle cx="12" cy="12" r="3" />
        </Svg>
      </LinearGradient>
    </View>
  );
}

// ─── Editorial label component (cap labels with active state) ────
// Idle: tiny Sora caps, muted. Active: same size but coloured + gold dot.
function TabLabel({ focused, label }: { focused: boolean; label: string }) {
  return (
    <View style={styles.labelWrap}>
      <Text style={[styles.label, focused && styles.labelActive]}>
        {label}
      </Text>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

// ─── Haptic feedback wrapper for tab presses ─────────────────────
const triggerTabHaptic = () => {
  Haptics.selectionAsync().catch(() => {});
};

// ─── Custom blurred background for iOS ──────────────────────────
function TabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        tint={BG_BLUR_TINT}
        intensity={80}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.porcelain }]} />;
}

// ═══════════════════════════════════════════════════════════════
// Tab Layout
// ═══════════════════════════════════════════════════════════════
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: IDLE,
        tabBarBackground: () => <TabBarBackground />,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="home"
        listeners={{ tabPress: triggerTabHaptic }}
        options={{
          tabBarIcon: ({ focused, color }) => <IconHome color={focused ? ACTIVE : IDLE} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="HOME" />,
        }}
      />
      <Tabs.Screen
        name="discover"
        listeners={{ tabPress: triggerTabHaptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconDiscover color={focused ? ACTIVE : IDLE} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="DISCOVER" />,
        }}
      />

      {/* Centre AI ─ raised gradient button */}
      <Tabs.Screen
        name="ai-chat"
        listeners={{ tabPress: triggerTabHaptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconAI focused={focused} />,
          tabBarLabel: () => null,
        }}
      />

      <Tabs.Screen
        name="salons"
        listeners={{ tabPress: triggerTabHaptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconSalons color={focused ? ACTIVE : IDLE} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="SALONS" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{ tabPress: triggerTabHaptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconProfile color={focused ? ACTIVE : IDLE} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="ME" />,
        }}
      />
    </Tabs>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 66,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    paddingTop: 8,
    borderTopWidth: Platform.OS === 'ios' ? 0 : 1,
    borderTopColor: 'rgba(51,36,99,0.06)',
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    position: 'absolute',
  },
  tabItem: {
    paddingTop: 4,
  },

  // ── Labels (caps style, idle vs active) ──
  labelWrap: {
    alignItems: 'center',
    marginTop: 1,
  },
  label: {
    fontFamily: 'Sora_500Medium',
    fontSize: 9,
    letterSpacing: 1.4,
    color: IDLE,
  },
  labelActive: {
    color: ACTIVE,
    fontFamily: 'Sora_600SemiBold',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 3,
  },

  // ── AI raised button ──
  aiWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 14 : 8,
  },
  aiGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(118,67,172,0.18)',
  },
  aiGlowActive: {
    backgroundColor: 'rgba(244,132,185,0.32)',
  },
  aiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7643AC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});