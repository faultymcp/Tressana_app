import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

// ─── Tab Icons─────────────────────────
function IconHome({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}

function IconDiscover({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8" />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}

function IconSalons({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="6" cy="6" r="3" />
      <Circle cx="6" cy="18" r="3" />
      <Path d="M20 4L8.12 15.88" />
      <Path d="M14.47 14.48L20 20" />
      <Path d="M8.12 8.12L12 12" />
    </Svg>
  );
}

function IconProfile({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

// ─── AI Tab — raised circle button in the centre ──────────────────
function IconAI({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.aiBtn, focused && styles.aiBtnActive]}>
      <View style={styles.aiGlow} />
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {/* Sparkle / wand icon */}
        <Path d="M15 4V2" />
        <Path d="M15 16v-2" />
        <Path d="M8 9H6" />
        <Path d="M20 9h-2" />
        <Path d="M17.8 11.8L19 13" />
        <Path d="M15 9h0" />
        <Path d="M17.8 6.2L19 5" />
        <Path d="M3 21l9-9" />
        <Path d="M12.2 6.2L11 5" />
      </Svg>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.violet,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconHome color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <IconDiscover color={color} />,
        }}
      />

      {/* ── Centre AI button ── */}
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => <IconAI focused={focused} />,
          // Hide the label — the button speaks for itself
          tabBarLabel: () => null,
        }}
      />

      <Tabs.Screen
        name="salons"
        options={{
          title: 'Salons',
          tabBarIcon: ({ color }) => <IconSalons color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconProfile color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    marginTop: 2,
  },

  // Raised circular AI button — sits above the tab bar
  aiBtn: {
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: Colors.violet,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'visible',
  },
  aiBtnActive: {
    backgroundColor: Colors.ink,
    shadowColor: Colors.pink,
    shadowOpacity: 0.55,
  },
  // Subtle glow ring
  aiGlow: {
    position: 'absolute',
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(118,67,172,0.25)',
  },
});