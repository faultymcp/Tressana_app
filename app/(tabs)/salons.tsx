import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Linking, ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

function IconStar() {
  return <Svg width={12} height={12} viewBox="0 0 24 24" fill="#8AB800" stroke="none"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></Svg>;
}
function IconMap() {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={2} strokeLinecap="round"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><Circle cx="12" cy="10" r="3" /></Svg>;
}
function IconNav() {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 11l19-9-9 19-2-8-8-2z" /></Svg>;
}
function IconGlobe() {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={2} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M2 12h20" /><Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></Svg>;
}

type Salon = {
  id: number;
  name: string;
  city: string;
  area: string;
  address: string;
  rating: number;
  review_count: number;
  speciality: string;
  hair_types: string[];
  highlight: string | null;
  website: string | null;
};

export default function SalonsScreen() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [hairType, setHairType] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');

  const typeGroup = hairType.charAt(0) || '';

  useEffect(() => {
    AsyncStorage.getItem('tressana_quiz').then(raw => {
      if (raw) setHairType(JSON.parse(raw).hairType || '');
    });
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('salons')
      .select('*')
      .order('rating', { ascending: false });
    if (data) setSalons(data);
    setLoading(false);
  };

  const filtered = salons.filter(s => {
    const matchesType = !typeGroup || s.hair_types.includes(typeGroup);
    const matchesCity = selectedCity === 'All' || s.city === selectedCity;
    return matchesType && matchesCity;
  });

  const cities = ['All', ...Array.from(new Set(salons.map(s => s.city)))];

  const openDirections = (salon: Salon) => {
    const query = encodeURIComponent(salon.address);
    const url = Platform.OS === 'ios'
      ? `maps:?q=${query}`
      : `geo:0,0?q=${query}`;
    Linking.openURL(url);
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Text style={st.title}>Salons</Text>
        <Text style={st.subtitle}>
          {typeGroup ? `Specialists for Type ${typeGroup} hair` : 'Find the right salon for your hair'}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        {cities.map(c => {
          const active = c === selectedCity;
          return (
            <Pressable key={c} onPress={() => setSelectedCity(c)} style={[st.chip, active && st.chipActive]}>
              <Text style={[st.chipText, active && st.chipTextActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>
      ) : (
        <ScrollView contentContainerStyle={st.list} showsVerticalScrollIndicator={false}>
          <Text style={st.resultCount}>{filtered.length} salon{filtered.length !== 1 ? 's' : ''} found</Text>

          {filtered.map((salon, i) => (
            <Animated.View key={salon.id} entering={FadeInUp.delay(40 * i).duration(300)}>
              <View style={st.card}>
                <View style={st.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.salonName}>{salon.name}</Text>
                    <View style={st.locRow}>
                      <IconMap />
                      <Text style={st.salonArea}>{salon.area}, {salon.city}</Text>
                    </View>
                  </View>
                  <View style={st.ratingBadge}>
                    <IconStar />
                    <Text style={st.ratingText}>{salon.rating}</Text>
                    <Text style={st.reviewCount}>({salon.review_count})</Text>
                  </View>
                </View>

                <Text style={st.speciality}>{salon.speciality}</Text>

                <View style={st.tagRow}>
                  {salon.hair_types.map(t => (
                    <View key={t} style={[st.typeTag, t === typeGroup && st.typeTagMatch]}>
                      <Text style={[st.typeTagText, t === typeGroup && st.typeTagTextMatch]}>Type {t}</Text>
                    </View>
                  ))}
                  {salon.highlight && (
                    <View style={st.highlightTag}>
                      <Text style={st.highlightText}>{salon.highlight}</Text>
                    </View>
                  )}
                </View>

                <View style={st.btnRow}>
                  <Pressable onPress={() => openDirections(salon)} style={({ pressed }) => [st.dirBtn, pressed && { opacity: 0.85 }]}>
                    <IconNav />
                    <Text style={st.dirText}>Get directions</Text>
                  </Pressable>
                  {salon.website && (
                    <Pressable onPress={() => Linking.openURL(salon.website!)} style={({ pressed }) => [st.webBtn, pressed && { opacity: 0.85 }]}>
                      <IconGlobe />
                      <Text style={st.webText}>Website</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Animated.View>
          ))}

          {filtered.length === 0 && (
            <View style={st.empty}>
              <Text style={st.emptyTitle}>No salons found</Text>
              <Text style={st.emptyDesc}>Try selecting "All" cities or take the quiz to get matched.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 62 : 48, paddingBottom: 12 },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 3 },

  filterRow: { paddingHorizontal: 20, paddingBottom: 14, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive: { borderColor: Colors.violet, backgroundColor: Colors.violet },
  chipText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.ink },
  chipTextActive: { color: Colors.white },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  resultCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginBottom: 12 },

  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  salonName: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.ink, marginBottom: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  salonArea: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9F8FC', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  ratingText: { fontFamily: Fonts.headingSemi, fontSize: 13, color: Colors.ink },
  reviewCount: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  speciality: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 19, marginBottom: 12 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  typeTag: { backgroundColor: '#F7F5FB', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  typeTagMatch: { backgroundColor: Colors.violet, borderColor: Colors.violet },
  typeTagText: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Colors.ink },
  typeTagTextMatch: { color: Colors.white },
  highlightTag: { backgroundColor: 'rgba(138,184,0,0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  highlightText: { fontFamily: Fonts.body, fontSize: 10, color: '#5a6b00' },

  btnRow: { flexDirection: 'row', gap: 10 },
  dirBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.violet, paddingVertical: 12, borderRadius: Radius.lg },
  dirText: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.white },
  webBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.violet },
  webText: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.violet },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.ink, marginBottom: 6 },
  emptyDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', maxWidth: 260 },
});