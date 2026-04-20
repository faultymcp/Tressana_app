import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Dimensions, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_W = (width - 52) / 2;
const R2_BASE = 'https://pub-bc435fe56f2141fdae2465001577bbcd.r2.dev';

const IC = {
  Search: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round"><Circle cx="11" cy="11" r="8" /><Path d="M21 21l-4.35-4.35" /></Svg>,
  Heart: ({ filled }: { filled?: boolean }) => <Svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? Colors.pink : 'none'} stroke={filled ? Colors.pink : '#fff'} strokeWidth={1.8}><Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></Svg>,
  Filter: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.8} strokeLinecap="round"><Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></Svg>,
};

const CATEGORIES = ['All', 'Protective', 'Natural', 'Braids', 'Locs', 'Wigs', 'Colour', 'Short', 'Long'];

const HAIR_TYPE_TABS = ['All', '1', '2', '3', '4'];

type Hairstyle = {
  id: string;
  name: string;
  style_category: string;
  hair_type: string;
  image_url: string;
  save_count: number;
  time_estimate: string;
};

export default function DiscoverScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [styles, setStyles] = useState<Hairstyle[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [hairTypeFilter, setHairTypeFilter] = useState('All');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  // Load user's hair type for default filter
  useEffect(() => {
    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) {
        const q = JSON.parse(raw);
        const type = q.hairType?.charAt(0);
        if (type) setHairTypeFilter(type);
      }
    });
    loadFavourites();
  }, []);

  useEffect(() => {
    setPage(0);
    setStyles([]);
    setHasMore(true);
    fetchStyles(0);
  }, [category, hairTypeFilter, search]);

  const loadFavourites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('favourites').select('hairstyle_id').eq('user_id', user.id).eq('favourite_type', 'hairstyle');
      if (data) setSavedIds(new Set(data.map(f => f.hairstyle_id)));
    } catch (e) {}
  };

  const fetchStyles = async (pageNum: number) => {
    setLoading(pageNum === 0);
    try {
      let query = supabase
        .from('hairstyles')
        .select('id, name, style_category, hair_type, image_url, save_count, time_estimate')
        .order('save_count', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (category !== 'All') {
        query = query.ilike('style_category', `%${category}%`);
      }
      if (hairTypeFilter !== 'All') {
        query = query.like('hair_type', `${hairTypeFilter}%`);
      }
      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (pageNum === 0) {
        setStyles(data || []);
      } else {
        setStyles(prev => [...prev, ...(data || [])]);
      }
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (e) {
      console.log('Discover fetch error:', e);
    }
    setLoading(false);
  };

  const toggleSave = async (hairstyleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (savedIds.has(hairstyleId)) {
        await supabase.from('favourites').delete().eq('user_id', user.id).eq('hairstyle_id', hairstyleId).eq('favourite_type', 'hairstyle');
        setSavedIds(prev => { const n = new Set(prev); n.delete(hairstyleId); return n; });
      } else {
        await supabase.from('favourites').insert({ user_id: user.id, hairstyle_id: hairstyleId, favourite_type: 'hairstyle' });
        setSavedIds(prev => new Set(prev).add(hairstyleId));
      }
    } catch (e) {}
  };

  const getImageUrl = (style: Hairstyle) => {
    if (style.image_url?.startsWith('http')) return style.image_url;
    if (style.image_url) return `${R2_BASE}/${style.image_url}`;
    return null;
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.pageTitle}>Discover</Text>
      </View>

      {/* Search */}
      <View style={st.searchWrap}>
        <View style={st.searchBar}>
          <IC.Search />
          <TextInput
            style={st.searchInput}
            placeholder="Search hairstyles..."
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Hair type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        {HAIR_TYPE_TABS.map(t => (
          <Pressable key={t} onPress={() => setHairTypeFilter(t)} style={[st.filterChip, hairTypeFilter === t && st.filterChipActive]}>
            <Text style={[st.filterText, hairTypeFilter === t && st.filterTextActive]}>
              {t === 'All' ? 'All types' : `Type ${t}`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catRow}>
        {CATEGORIES.map(c => (
          <Pressable key={c} onPress={() => setCategory(c)} style={[st.catPill, category === c && st.catPillActive]}>
            <Text style={[st.catText, category === c && st.catTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Grid */}
      {loading && styles.length === 0 ? (
        <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>
      ) : styles.length === 0 ? (
        <View style={st.emptyWrap}>
          <Text style={st.emptyTitle}>No styles found</Text>
          <Text style={st.emptySub}>Try adjusting your filters or search</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={st.grid}
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 && hasMore && !loading) {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchStyles(nextPage);
            }
          }}
          scrollEventThrottle={400}
        >
          <View style={st.gridInner}>
            {styles.map((s, i) => {
              const imgUrl = getImageUrl(s);
              const isSaved = savedIds.has(s.id);
              return (
                <Animated.View key={s.id} entering={FadeInUp.delay(20 * (i % 10)).duration(250)}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/hairtransfer', params: { reference: imgUrl } })}
                    style={st.card}
                  >
                    {imgUrl ? (
                      <Image
                        source={{ uri: imgUrl }}
                        style={st.cardImg}
                        contentFit="cover"
                        placeholder={{ blurhash: 'L6Pj0^jE.mj[_3fQfQfQfQfQfQfQ' }}
                        transition={200}
                      />
                    ) : (
                      <View style={[st.cardImg, { backgroundColor: '#F0EBFA', alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.muted }}>No image</Text>
                      </View>
                    )}

                    {/* Save button */}
                    <Pressable onPress={() => toggleSave(s.id)} style={st.saveBtn}>
                      <IC.Heart filled={isSaved} />
                    </Pressable>

                    {/* Time badge */}
                    {s.time_estimate && (
                      <View style={st.timeBadge}>
                        <Text style={st.timeText}>{s.time_estimate}</Text>
                      </View>
                    )}

                    <View style={st.cardInfo}>
                      <Text style={st.cardName} numberOfLines={1}>{s.name}</Text>
                      <View style={st.cardMeta}>
                        <Text style={st.cardSaves}>{s.save_count || 0} saves</Text>
                        {s.hair_type && (
                          <View style={st.typeTag}>
                            <Text style={st.typeTagText}>{s.hair_type}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {loading && styles.length > 0 && (
            <ActivityIndicator size="small" color={Colors.violet} style={{ marginVertical: 20 }} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 62 : 48, marginBottom: 12 },
  pageTitle: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.ink, letterSpacing: -0.5 },

  searchWrap: { paddingHorizontal: 20, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, padding: 0 },

  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  filterChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  filterText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted },
  filterTextActive: { color: '#fff' },

  catRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16, paddingVertical: 4 },
  catPill: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  catPillActive: { backgroundColor: Colors.violet, borderColor: Colors.violet },
  catText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.ink },
  catTextActive: { color: '#fff' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink, marginBottom: 4 },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  grid: { paddingBottom: 100 },
  gridInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },

  card: {
    width: CARD_W, backgroundColor: Colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 0,
  },
  cardImg: { width: '100%', height: CARD_W * 1.3, backgroundColor: '#F5F3EE' },
  saveBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  timeBadge: {
    position: 'absolute', bottom: 60, left: 10,
    paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  timeText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: '#fff' },

  cardInfo: { padding: 12 },
  cardName: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.ink, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSaves: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  typeTag: { backgroundColor: '#F7F5FB', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  typeTagText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Colors.violet },
});