import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Linking, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';   
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

// --- Icons ---
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
  distance?: number;
  budget_level?: string;
  ambience?: string;
  snacks?: boolean;
};

export default function SalonsScreen() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [hairType, setHairType] = useState('');

  // All filters are now states for dropdowns
  const [selectedDistance, setSelectedDistance] = useState('Any');
  const [selectedBudget, setSelectedBudget] = useState('Any');
  const [selectedAmbience, setSelectedAmbience] = useState('Any');
  const [selectedSnacks, setSelectedSnacks] = useState('Any');

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

  const openDirections = (salon: Salon) => {
    const query = encodeURIComponent(`${salon.name} ${salon.address} ${salon.city}`);
    const url = Platform.OS === 'ios' ? `maps:0,0?q=${query}` : `geo:0,0?q=${query}`;
    Linking.openURL(url);
  };

  const filtered = salons.filter(s => {
    const matchesType = !typeGroup || s.hair_types.includes(typeGroup);
    const matchesDistance = selectedDistance === 'Any' || (s.distance && s.distance <= parseInt(selectedDistance));
    const matchesBudget = selectedBudget === 'Any' || s.budget_level === selectedBudget;
    const matchesAmbience = selectedAmbience === 'Any' || s.ambience === selectedAmbience;
    
    // Logic for the new snacks dropdown
    let matchesSnacks = true;
    if (selectedSnacks === 'Yes') matchesSnacks = s.snacks === true;
    if (selectedSnacks === 'No') matchesSnacks = s.snacks === false;

    return matchesType && matchesDistance && matchesBudget && matchesAmbience && matchesSnacks;
  });

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Text style={st.title}>Salons</Text>
        <Text style={st.subtitle}>
          {typeGroup ? `Specialists for Type ${typeGroup} hair` : 'Find the right salon for your hair'}
        </Text>
      </View>

      {/* HORIZONTAL SCROLLING FILTERS */}
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={st.filterScrollContainer}
        >
          
          {/* 1. Distance Dropdown */}
          <View style={st.filterBlock}>
            <Text style={st.filterLabel}>Distance</Text>
            <View style={st.pickerWrapper}>
              <Picker
                selectedValue={selectedDistance}
                onValueChange={(value) => setSelectedDistance(value)}
                style={st.picker}
              >
                <Picker.Item label="Any distance" value="Any" />
                <Picker.Item label="Within 1 mile" value="1" />
                <Picker.Item label="Within 5 miles" value="5" />
                <Picker.Item label="Within 10 miles" value="10" />
                <Picker.Item label="Within 15 miles" value="15" />
              </Picker>
            </View>
          </View>

          {/* 2. Budget Dropdown */}
          <View style={st.filterBlock}>
            <Text style={st.filterLabel}>Budget</Text>
            <View style={st.pickerWrapper}>
              <Picker
                selectedValue={selectedBudget}
                onValueChange={(value) => setSelectedBudget(value)}
                style={st.picker}
              >
                <Picker.Item label="Any budget" value="Any" />
                <Picker.Item label="£20 - £40" value="20-40" />
                <Picker.Item label="£40 - £60" value="40-60" />
                <Picker.Item label="£60 - £80" value="60-80" />
                <Picker.Item label="£80 - £100+" value="80-100" />
              </Picker>
            </View>
          </View>

          {/* 3. Ambience Dropdown */}
          <View style={st.filterBlock}>
            <Text style={st.filterLabel}>Ambience</Text>
            <View style={st.pickerWrapper}>
              <Picker
                selectedValue={selectedAmbience}
                onValueChange={(value) => setSelectedAmbience(value)}
                style={st.picker}
              >
                <Picker.Item label="Any ambience" value="Any" />
                <Picker.Item label="Cozy & Intimate" value="cozy" />
                <Picker.Item label="Bright Lighting" value="bright" />
                <Picker.Item label="Quiet & Relaxing" value="quiet" />
                <Picker.Item label="Bustling & Social" value="social" />
                <Picker.Item label="Luxury Premium" value="luxury" />
              </Picker>
            </View>
          </View>

          {/* 4. Snacks Dropdown */}
          <View style={st.filterBlock}>
            <Text style={st.filterLabel}>Snacks Offered</Text>
            <View style={st.pickerWrapper}>
              <Picker
                selectedValue={selectedSnacks}
                onValueChange={(value) => setSelectedSnacks(value)}
                style={st.picker}
              >
                <Picker.Item label="Does not matter" value="Any" />
                <Picker.Item label="Yes please" value="Yes" />
                <Picker.Item label="No thanks" value="No" />
                <Picker.Item label="Maybe" value="Maybe" />
              </Picker>
            </View>
          </View>

        </ScrollView>
      </View>

      {/* List Rendering */}
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
                  {salon.snacks && (
                    <View style={st.snacksTag}>
                      <Text style={st.snacksTagText}>🍪 Snacks</Text>
                    </View>
                  )}
                </View>

                <View style={st.btnRow}>
                  <Pressable onPress={() => openDirections(salon)} style={st.dirBtn}>
                    <IconNav />
                    <Text style={st.dirText}>Get directions</Text>
                  </Pressable>
                  {salon.website && (
                    <Pressable onPress={() => Linking.openURL(salon.website!)} style={st.webBtn}>
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
              <Text style={st.emptyDesc}>Try changing your filters.</Text>
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

  // --- NEW FILTER STYLES ---
  filterScrollContainer: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    gap: 12, // Space between each block
  },
  filterBlock: {
    width: 150, // CRITICAL: Gives each picker enough room so text doesn't scrunch
  },
  filterLabel: { 
    fontFamily: Fonts.bodySemi, 
    fontSize: 13, 
    color: Colors.ink, 
    marginBottom: 6,
    marginLeft: 4
  },
  pickerWrapper: { 
    backgroundColor: Colors.white, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: Colors.border,
    height: 48, // Forces the wrapper to stay neat
    justifyContent: 'center',
    overflow: 'hidden'
  },
  picker: { 
    width: '100%',
    color: Colors.ink,
    // On iOS, native pickers can sometimes be stubborn. If it acts weird, 
    // it's an iOS native quirk, but giving it a fixed width wrapper usually solves it.
  },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  resultCount: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginBottom: 16 },

  card: { 
    backgroundColor: Colors.white, 
    borderRadius: 18, 
    padding: 18, 
    borderWidth: 1.5, 
    borderColor: Colors.border, 
    marginBottom: 14 
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  salonName: { fontFamily: Fonts.headingSemi, fontSize: 17, color: Colors.ink, marginBottom: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  salonArea: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9F8FC', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10 },
  ratingText: { fontFamily: Fonts.headingSemi, fontSize: 14, color: Colors.ink },
  reviewCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  speciality: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: 14 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeTag: { backgroundColor: '#F7F5FB', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10 },
  typeTagMatch: { backgroundColor: Colors.violet },
  typeTagText: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.ink },
  typeTagTextMatch: { color: Colors.white },
  highlightTag: { backgroundColor: 'rgba(138,184,0,0.12)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10 },
  highlightText: { fontFamily: Fonts.body, fontSize: 11, color: '#5a6b00' },
  snacksTag: { backgroundColor: '#FFF3E0', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10 },
  snacksTagText: { fontFamily: Fonts.body, fontSize: 11, color: '#E67E22' },

  btnRow: { flexDirection: 'row', gap: 12 },
  dirBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.violet, paddingVertical: 14, borderRadius: 12 },
  dirText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.white },
  webBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.violet },
  webText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.violet },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: Fonts.headingSemi, fontSize: 17, color: Colors.ink, marginBottom: 8 },
  emptyDesc: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center' },
});