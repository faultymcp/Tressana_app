import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Linking, ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

// ─── Icons ───────────────────────────────────────────────────────
function IconArrowRight() {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={2} strokeLinecap="round"><Path d="M5 12h14M12 5l7 7-7 7" /></Svg>;
}

// ─── Style suggestions per type ──────────────────────────────────
const STYLE_SUGGESTIONS: Record<string, { name: string; desc: string }[]> = {
  '1': [
    { name: 'Sleek Straight', desc: 'Classic polished straight look' },
    { name: 'Blowout', desc: 'Voluminous bouncy blow-dry' },
    { name: 'Layered Cut', desc: 'Movement and dimension' },
    { name: 'Curtain Bangs', desc: 'Face-framing 70s vibes' },
    { name: 'Half Up', desc: 'Casual elegance for everyday' },
  ],
  '2': [
    { name: 'Defined Waves', desc: 'Enhance your natural S-pattern' },
    { name: 'Beach Waves', desc: 'Effortless, textured, undone' },
    { name: 'Shag Cut', desc: 'Layered with volume and movement' },
    { name: 'Scrunched Waves', desc: 'Scrunch and go — minimal effort' },
    { name: 'Diffused Curls', desc: 'Diffuser technique for max definition' },
  ],
  '3': [
    { name: 'Wash and Go', desc: 'Product, scrunch, air-dry, done' },
    { name: 'Twist Out', desc: 'Defined spirals from twists' },
    { name: 'Braid Out', desc: 'Stretched, defined waves from braids' },
    { name: 'Defined Curls', desc: 'Finger coil or Denman brush method' },
    { name: 'Curly Bob', desc: 'Short, bouncy, full of personality' },
    { name: 'Pineapple Updo', desc: 'High loose pony to preserve curls' },
  ],
  '4': [
    { name: 'Protective Twists', desc: 'Two-strand twists for low manipulation' },
    { name: 'Bantu Knots', desc: 'Knotted sections, stunning unravelled' },
    { name: 'Afro Puff', desc: 'Pulled up, full, proud' },
    { name: 'Flat Twist', desc: 'Close to scalp, versatile styling' },
    { name: 'Finger Coils', desc: 'Individually defined tight curls' },
    { name: 'Stretched Afro', desc: 'Blow-out or banded for length' },
    { name: 'High Puff', desc: 'Quick, elegant, everyday go-to' },
  ],
};

// ─── Product Categories ──────────────────────────────────────────
const CATEGORIES = ['all', 'shampoo', 'conditioner', 'styling', 'treatment', 'oil', 'tool'];

export default function DiscoverScreen() {
  const [hairType, setHairType] = useState('');
  const [activeStyle, setActiveStyle] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const typeGroup = hairType.charAt(0) || '3';
  const styles_list = STYLE_SUGGESTIONS[typeGroup] || STYLE_SUGGESTIONS['3'];

  useEffect(() => {
    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) {
        const data = JSON.parse(raw);
        setHairType(data.hairType || '3A');
      }
    });
  }, []);

  useEffect(() => {
    if (styles_list.length > 0 && !activeStyle) {
      setActiveStyle(styles_list[0].name);
    }
  }, [styles_list]);

  // Fetch products from Supabase
  useEffect(() => {
    if (!typeGroup) return;
    setLoading(true);
    supabase
      .from('products')
      .select('*')
      .contains('hair_types', [typeGroup])
      .then(({ data }) => {
        if (data) setProducts(data);
        setLoading(false);
      });
  }, [typeGroup]);

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.title}>Discover</Text>
        <Text style={st.subtitle}>Curated for Type {hairType || typeGroup} hair</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>

        {/* ── Hairstyle Suggestions ── */}
        <Text style={st.sectionTitle}>Styles for your hair</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.styleScroll}>
          {styles_list.map((s, i) => {
            const active = s.name === activeStyle;
            return (
              <Pressable key={s.name} onPress={() => setActiveStyle(s.name)} style={[st.styleCard, active && st.styleCardActive]}>
                <Text style={[st.styleName, active && st.styleNameActive]}>{s.name}</Text>
                <Text style={[st.styleDesc, active && st.styleDescActive]}>{s.desc}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active style detail */}
        {activeStyle && (
          <Animated.View entering={FadeInUp.duration(300)} style={st.styleDetail}>
            <Text style={st.styleDetailTitle}>{activeStyle}</Text>
            <Text style={st.styleDetailSub}>
              This style works beautifully with Type {typeGroup} hair. Browse products below that help you achieve and maintain it.
            </Text>
            <View style={st.styleDetailTags}>
              <View style={st.tag}><Text style={st.tagText}>Type {typeGroup}</Text></View>
              <View style={st.tag}><Text style={st.tagText}>{hairType}</Text></View>
            </View>
          </Animated.View>
        )}

        {/* ── Products Section ── */}
        <Text style={[st.sectionTitle, { marginTop: 24 }]}>Products for Type {typeGroup}</Text>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catScroll}>
          {CATEGORIES.map(cat => {
            const active = cat === activeCategory;
            return (
              <Pressable key={cat} onPress={() => setActiveCategory(cat)} style={[st.catChip, active && st.catChipActive]}>
                <Text style={[st.catText, active && st.catTextActive]}>
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Product list */}
        {loading ? (
          <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>
        ) : (
          <View style={st.prodList}>
            {filteredProducts.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInUp.delay(40 * i).duration(250)}>
                <Pressable onPress={() => Linking.openURL(p.url)} style={st.prodCard}>
                  <View style={st.prodTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.prodBrand}>{p.brand}</Text>
                      <Text style={st.prodName}>{p.name}</Text>
                    </View>
                    <Text style={st.prodPrice}>{p.price}</Text>
                  </View>
                  <Text style={st.prodDesc}>{p.why_it_works}</Text>
                  <View style={st.prodBottom}>
                    <View style={st.prodCatBadge}>
                      <Text style={st.prodCatText}>{p.category}</Text>
                    </View>
                    <Text style={st.prodRetailer}>{p.retailer}</Text>
                    <View style={st.prodLinkRow}>
                      <Text style={st.prodLink}>Shop</Text>
                      <IconArrowRight />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
            {filteredProducts.length === 0 && !loading && (
              <Text style={st.emptyText}>No products in this category for your hair type.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 62 : 48, paddingBottom: 12 },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 3 },

  content: { paddingBottom: 100 },

  sectionTitle: { fontFamily: Fonts.headingSemi, fontSize: 17, color: Colors.ink, paddingHorizontal: 20, marginBottom: 12 },

  // Style cards
  styleScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 4, marginBottom: 16 },
  styleCard: {
    width: 150, padding: 16, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  styleCardActive: { borderColor: Colors.violet, backgroundColor: Colors.violet },
  styleName: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink, marginBottom: 4 },
  styleNameActive: { color: Colors.white },
  styleDesc: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, lineHeight: 16 },
  styleDescActive: { color: 'rgba(255,255,255,0.75)' },

  // Style detail
  styleDetail: {
    marginHorizontal: 20, padding: 20, borderRadius: 18,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  styleDetailTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.ink, marginBottom: 6 },
  styleDetailSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: 14 },
  styleDetailTags: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: Colors.violetBg2, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10 },
  tagText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Colors.violet },

  // Category chips
  catScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 4, marginBottom: 16 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  catChipActive: { borderColor: Colors.violet, backgroundColor: Colors.violet },
  catText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.ink },
  catTextActive: { color: Colors.white },

  // Product list
  loadingWrap: { paddingTop: 40, alignItems: 'center' },
  prodList: { paddingHorizontal: 20, gap: 10 },
  prodCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  prodTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  prodBrand: { fontFamily: Fonts.body, fontSize: 10, color: Colors.violet, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  prodName: { fontFamily: Fonts.headingSemi, fontSize: 15, color: Colors.ink, lineHeight: 20 },
  prodPrice: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.ink, marginLeft: 12 },
  prodDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 18, marginBottom: 12 },
  prodBottom: { flexDirection: 'row', alignItems: 'center' },
  prodCatBadge: { backgroundColor: '#F7F5FB', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8, marginRight: 8 },
  prodCatText: { fontFamily: Fonts.bodyMedium, fontSize: 10, color: Colors.ink, textTransform: 'capitalize' },
  prodRetailer: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, flex: 1 },
  prodLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prodLink: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.violet },

  emptyText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', paddingTop: 24 },
});