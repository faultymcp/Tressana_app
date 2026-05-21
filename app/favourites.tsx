import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  HeartFill: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill={Colors.pink} stroke={Colors.pink} strokeWidth={1.5}><Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></Svg>,
  Star: () => <Svg width={12} height={12} viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></Svg>,
  MapPin: () => <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.8} strokeLinecap="round"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><Circle cx="12" cy="10" r="3" /></Svg>,
  Bookmark: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill={Colors.violet} stroke={Colors.violet} strokeWidth={1.5}><Path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></Svg>,
  Scissors: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.6} strokeLinecap="round"><Circle cx="6" cy="6" r="3" /><Circle cx="6" cy="18" r="3" /><Path d="M20 4L8.12 15.88" /><Path d="M14.47 14.48L20 20" /><Path d="M8.12 8.12L12 12" /></Svg>,
};

const TABS = [
  { key: 'product', label: 'Products' },
  { key: 'creator', label: 'Creators' },
  { key: 'tip', label: 'Tips' },
  { key: 'salon', label: 'Salons' },
  { key: 'hairstyle', label: 'Hairstyles' },
];

export default function FavouritesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('product');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchFavourites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get counts per type
    const { data: allFavs } = await supabase
      .from('favourites')
      .select('favourite_type')
      .eq('user_id', user.id);

    if (allFavs) {
      const c: Record<string, number> = {};
      allFavs.forEach((f: any) => { c[f.favourite_type] = (c[f.favourite_type] || 0) + 1; });
      setCounts(c);
    }

    // Fetch items for active tab
    const { data } = await supabase
      .from('favourites')
      .select('*')
      .eq('user_id', user.id)
      .eq('favourite_type', activeTab)
      .order('created_at', { ascending: false });

    setItems(data || []);
    setLoading(false);
  }, [activeTab]);

  useFocusEffect(useCallback(() => { fetchFavourites(); }, [fetchFavourites]));

  useEffect(() => { setLoading(true); fetchFavourites(); }, [activeTab]);

  const handleRemove = async (favId: string) => {
    await supabase.from('favourites').delete().eq('id', favId);
    setItems(prev => prev.filter(i => i.id !== favId));
    setCounts(prev => ({ ...prev, [activeTab]: Math.max((prev[activeTab] || 1) - 1, 0) }));
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>Favourites</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabScroll}>
        {TABS.map(t => {
          const active = activeTab === t.key;
          const count = counts[t.key] || 0;
          return (
            <Pressable key={t.key} onPress={() => setActiveTab(t.key)} style={[st.tab, active && st.tabActive]}>
              <Text style={[st.tabText, active && st.tabTextActive]}>{t.label}</Text>
              {count > 0 && <View style={[st.tabBadge, active && st.tabBadgeActive]}>
                <Text style={[st.tabBadgeText, active && st.tabBadgeTextActive]}>{count}</Text>
              </View>}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>
      ) : items.length === 0 ? (
        <View style={st.emptyWrap}>
          <View style={st.emptyIcon}>
            <IC.HeartFill />
          </View>
          <Text style={st.emptyTitle}>No saved {TABS.find(t => t.key === activeTab)?.label.toLowerCase()}</Text>
          <Text style={st.emptySub}>Items you favourite will appear here</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/discover')}
            style={({ pressed }) => [st.emptyBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={st.emptyBtnText}>Browse {TABS.find(t => t.key === activeTab)?.label.toLowerCase()}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.list} showsVerticalScrollIndicator={false}>
          {items.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInUp.delay(30 * i).duration(250)}>
              <View style={st.card}>
                {/* Placeholder for real content — shows favourite type and ID for now */}
                <View style={st.cardLeft}>
                  <View style={st.cardThumb}>
                    {activeTab === 'salon' ? <IC.Scissors /> :
                     activeTab === 'hairstyle' ? <IC.Bookmark /> : <IC.HeartFill />}
                  </View>
                </View>
                <View style={st.cardBody}>
                  <Text style={st.cardTitle}>
                    {activeTab === 'product' ? `Product #${item.product_id?.slice(0, 8) || '—'}` :
                     activeTab === 'creator' ? `Creator #${item.creator_id?.slice(0, 8) || '—'}` :
                     activeTab === 'tip' ? `Tip #${item.tip_id?.slice(0, 8) || '—'}` :
                     activeTab === 'salon' ? `Salon #${item.salon_id || '—'}` :
                     `Hairstyle #${item.hairstyle_id?.slice(0, 8) || '—'}`}
                  </Text>
                  <Text style={st.cardSub}>Saved {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>
                <Pressable onPress={() => handleRemove(item.id)} style={st.removeBtn}>
                  <IC.HeartFill />
                </Pressable>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },

  // Tabs
  tabScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  tabActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  tabText: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.ink },
  tabTextActive: { color: '#fff' },
  tabBadge: { backgroundColor: '#F0EDE8', paddingVertical: 1, paddingHorizontal: 7, borderRadius: 10 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabBadgeText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Colors.ink },
  tabBadgeTextActive: { color: '#fff' },

  // Empty
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FDF0F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink, marginBottom: 4 },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', marginBottom: 20 },
  emptyBtn: {
    paddingVertical: 12, paddingHorizontal: 28,
    backgroundColor: Colors.violet, borderRadius: 14,
  },
  emptyBtnText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: '#fff' },

  // List
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, marginBottom: 8,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardLeft: {},
  cardThumb: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink, marginBottom: 2 },
  cardSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  removeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FDF0F6', alignItems: 'center', justifyContent: 'center' },
});
