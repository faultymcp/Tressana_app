// components/Skeleton.tsx
// Usage: <Skeleton width={200} height={20} />
//        <Skeleton width="100%" height={180} radius={18} />
//        <SkeletonCard />  — full card placeholder
//        <SkeletonList rows={5} />  — list placeholder

import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

type SkeletonProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: any;
};

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: typeof width === 'number' ? width : undefined,
          height,
          borderRadius: radius,
          backgroundColor: '#E8E5DF',
          opacity,
        },
        typeof width === 'string' && { width: width as any },
        style,
      ]}
    />
  );
}

// ─── Card skeleton ───────────────────────────────────────────────
export function SkeletonCard({ style }: { style?: any }) {
  return (
    <View style={[sk.card, style]}>
      <Skeleton width="100%" height={140} radius={14} />
      <View style={sk.cardBody}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="45%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

// ─── Row skeleton (for menu items, transactions) ─────────────────
export function SkeletonRow({ style }: { style?: any }) {
  return (
    <View style={[sk.row, style]}>
      <Skeleton width={40} height={40} radius={12} />
      <View style={sk.rowBody}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={50} height={14} />
    </View>
  );
}

// ─── List skeleton ───────────────────────────────────────────────
export function SkeletonList({ rows = 4, style }: { rows?: number; style?: any }) {
  return (
    <View style={[sk.list, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

// ─── Profile skeleton ────────────────────────────────────────────
export function SkeletonProfile() {
  return (
    <View style={sk.profile}>
      {/* User card */}
      <View style={sk.profileCard}>
        <Skeleton width={56} height={56} radius={28} />
        <View style={sk.profileInfo}>
          <Skeleton width={140} height={18} />
          <Skeleton width={100} height={12} style={{ marginTop: 8 }} />
          <Skeleton width={80} height={22} radius={12} style={{ marginTop: 10 }} />
        </View>
      </View>

      {/* Stats */}
      <View style={sk.statsRow}>
        <Skeleton width={60} height={36} />
        <Skeleton width={60} height={36} />
        <Skeleton width={60} height={36} />
      </View>

      {/* Menu items */}
      <Skeleton width={80} height={12} style={{ marginTop: 20, marginBottom: 12 }} />
      <SkeletonList rows={4} />

      <Skeleton width={80} height={12} style={{ marginTop: 20, marginBottom: 12 }} />
      <SkeletonList rows={3} />
    </View>
  );
}

// ─── Home skeleton ───────────────────────────────────────────────
export function SkeletonHome() {
  return (
    <View style={sk.home}>
      {/* Header */}
      <View style={sk.homeHeader}>
        <View>
          <Skeleton width={100} height={14} />
          <Skeleton width={160} height={22} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={50} height={36} radius={16} />
      </View>

      {/* Try card */}
      <Skeleton width="100%" height={140} radius={20} style={{ marginBottom: 20 }} />

      {/* Tracker */}
      <Skeleton width="100%" height={180} radius={20} style={{ marginBottom: 20 }} />

      {/* Steps */}
      <Skeleton width={120} height={16} style={{ marginBottom: 12 }} />
      {[1, 2, 3].map(i => (
        <View key={i} style={sk.stepRow}>
          <Skeleton width={36} height={36} radius={18} />
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="80%" height={10} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Discover grid skeleton ──────────────────────────────────────
export function SkeletonDiscover() {
  const cardW = (SCREEN_W - 52) / 2;
  return (
    <View style={sk.discover}>
      <Skeleton width={120} height={24} style={{ marginBottom: 16 }} />
      <Skeleton width="100%" height={44} radius={14} style={{ marginBottom: 12 }} />
      <View style={sk.discoverFilters}>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} width={70} height={32} radius={16} />
        ))}
      </View>
      <View style={sk.discoverGrid}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ width: cardW }}>
            <Skeleton width={cardW} height={cardW * 1.3} radius={18} />
            <Skeleton width={cardW * 0.7} height={14} style={{ marginTop: 10 }} />
            <Skeleton width={cardW * 0.4} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 12,
  },
  cardBody: { padding: 14 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowBody: { flex: 1 },

  list: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },

  profile: { paddingHorizontal: 20 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  profileInfo: { flex: 1 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    padding: 16, backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
  },

  home: { paddingHorizontal: 20 },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, marginBottom: 8,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
  },

  discover: { paddingHorizontal: 20 },
  discoverFilters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  discoverGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
