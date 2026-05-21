import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { cancelBooking } from '@/lib/discounts';
import Animated, { FadeInUp } from 'react-native-reanimated';

const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Calendar: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2z" /><Line x1="16" y1="2" x2="16" y2="6" /><Line x1="8" y1="2" x2="8" y2="6" /><Line x1="1" y1="10" x2="23" y2="10" /></Svg>,
  Clock: () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.8} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M12 6v6l4 2" /></Svg>,
  MapPin: () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={1.8} strokeLinecap="round"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><Circle cx="12" cy="10" r="3" /></Svg>,
  Tag: () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={1.8} strokeLinecap="round"><Path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><Circle cx="7" cy="7" r="1" fill="#16A34A" /></Svg>,
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: '#FFF7ED', color: '#C2410C' },
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#16A34A' },
  completed: { label: 'Completed', bg: '#F5F3EE', color: Colors.muted },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: Colors.error },
  no_show: { label: 'No show', bg: '#FEF2F2', color: Colors.error },
};

export default function BookingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchBookings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id);

    if (tab === 'upcoming') {
      query = query.in('status', ['pending', 'confirmed']).gte('appointment_date', today).order('appointment_date', { ascending: true });
    } else {
      query = query.in('status', ['completed', 'cancelled', 'no_show']).order('appointment_date', { ascending: false });
    }

    const { data } = await query;
    setBookings(data || []);
    setLoading(false);
  }, [tab]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchBookings(); }, [fetchBookings]));

  const handleCancel = (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure? If you had a discount code applied, it will be restored.', [
      { text: 'Keep Booking', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: async () => {
        const result = await cancelBooking(bookingId);
        if (result.success) {
          fetchBookings();
        } else {
          Alert.alert('Error', result.error || 'Could not cancel booking');
        }
      }},
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}><IC.Back /></Pressable>
        <Text style={st.headerTitle}>My Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={st.tabRow}>
        <Pressable onPress={() => setTab('upcoming')} style={[st.tab, tab === 'upcoming' && st.tabActive]}>
          <Text style={[st.tabText, tab === 'upcoming' && st.tabTextActive]}>Upcoming</Text>
        </Pressable>
        <Pressable onPress={() => setTab('past')} style={[st.tab, tab === 'past' && st.tabActive]}>
          <Text style={[st.tabText, tab === 'past' && st.tabTextActive]}>Past</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>
      ) : bookings.length === 0 ? (
        <View style={st.emptyWrap}>
          <View style={st.emptyIcon}><IC.Calendar /></View>
          <Text style={st.emptyTitle}>
            {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
          </Text>
          <Text style={st.emptySub}>
            {tab === 'upcoming' ? 'Book an appointment with a stylist' : 'Your booking history will appear here'}
          </Text>
          {tab === 'upcoming' && (
            <Pressable onPress={() => router.push('/(tabs)/salons')} style={({ pressed }) => [st.emptyBtn, pressed && { opacity: 0.85 }]}>
              <Text style={st.emptyBtnText}>Find a salon</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.list} showsVerticalScrollIndicator={false}>
          {bookings.map((b, i) => {
            const status = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
            const hasDiscount = b.discount_amount_pence > 0;
            return (
              <Animated.View key={b.id} entering={FadeInUp.delay(30 * i).duration(250)}>
                <View style={st.card}>
                  {/* Top row */}
                  <View style={st.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.serviceName}>{b.service_name}</Text>
                      {b.stylist_name && <Text style={st.stylistName}>with {b.stylist_name}</Text>}
                    </View>
                    <View style={[st.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[st.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={st.detailRow}>
                    <IC.Calendar />
                    <Text style={st.detailText}>{formatDate(b.appointment_date)}</Text>
                  </View>
                  <View style={st.detailRow}>
                    <IC.Clock />
                    <Text style={st.detailText}>{formatTime(b.appointment_time)}{b.duration_minutes ? ` · ${b.duration_minutes} min` : ''}</Text>
                  </View>

                  {/* Price */}
                  <View style={st.priceRow}>
                    <Text style={st.priceLabel}>Total</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      {hasDiscount && (
                        <Text style={st.originalPrice}>£{(b.original_price_pence / 100).toFixed(2)}</Text>
                      )}
                      <Text style={st.finalPrice}>£{(b.final_price_pence / 100).toFixed(2)}</Text>
                    </View>
                  </View>

                  {hasDiscount && (
                    <View style={st.discountRow}>
                      <IC.Tag />
                      <Text style={st.discountText}>£{(b.discount_amount_pence / 100).toFixed(2)} discount applied</Text>
                    </View>
                  )}

                  {/* Cancel */}
                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <Pressable onPress={() => handleCancel(b.id)} style={st.cancelBtn}>
                      <Text style={st.cancelText}>Cancel booking</Text>
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            );
          })}
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
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.ink },
  tabText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.muted },
  tabTextActive: { color: '#fff' },

  // Empty
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink, marginBottom: 4 },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', marginBottom: 20 },
  emptyBtn: { paddingVertical: 12, paddingHorizontal: 28, backgroundColor: Colors.violet, borderRadius: 14 },
  emptyBtnText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: '#fff' },

  // List
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  serviceName: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.ink, marginBottom: 2 },
  stylistName: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10 },
  statusText: { fontFamily: Fonts.bodySemi, fontSize: 11 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 6 },
  priceLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  originalPrice: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textDecorationLine: 'line-through' },
  finalPrice: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink },

  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#F0FDF4', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  discountText: { fontFamily: Fonts.bodySemi, fontSize: 11, color: '#16A34A' },

  cancelBtn: { marginTop: 14, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.error },
});
