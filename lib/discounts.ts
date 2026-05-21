// lib/discounts.ts
// Handles XP → discount code redemption, code validation, and booking creation

import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────────
export type DiscountCode = {
  id: string;
  code: string;
  discount_amount_pence: number;
  source: 'xp_redemption' | 'referral' | 'promo' | 'admin';
  applies_to: 'appointment' | 'product' | 'any';
  status: 'active' | 'used' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
};

export type DiscountValidation = {
  valid: boolean;
  error?: string;
  code_id?: string;
  discount_amount_pence?: number;
  original_price_pence?: number;
  final_price_pence?: number;
  description?: string;
  source?: string;
};

export type BookingResult = {
  success: boolean;
  error?: string;
  booking_id?: string;
  original_price_pence?: number;
  discount_amount_pence?: number;
  final_price_pence?: number;
  commission_pence?: number;
  status?: string;
};

// ══════════════════════════════════════════════════════════════════
// DISCOUNT CODES
// ══════════════════════════════════════════════════════════════════

/**
 * Redeem XP for a discount code (e.g. £5 off appointment).
 * Returns the generated code.
 */
export async function redeemXpForDiscount(
  redemptionRateId: string
): Promise<{
  success: boolean;
  code?: string;
  amount_pence?: number;
  expires_at?: string;
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'Not logged in' };

  const { data, error } = await supabase.rpc('redeem_xp_for_discount', {
    p_user_id: session.user.id,
    p_redemption_rate_id: redemptionRateId,
  });

  if (error) return { success: false, error: error.message };
  if (!data.success) return { success: false, error: data.error };

  return {
    success: true,
    code: data.code,
    amount_pence: data.amount_pence,
    expires_at: data.expires_at,
  };
}

/**
 * Get all active discount codes for the current user.
 */
export async function getMyDiscountCodes(): Promise<DiscountCode[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Validate a discount code against a price.
 * Call this when the user enters a code at checkout.
 */
export async function validateDiscountCode(
  code: string,
  originalPricePence: number
): Promise<DiscountValidation> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { valid: false, error: 'Not logged in' };

  const { data, error } = await supabase.rpc('apply_discount_to_booking', {
    p_user_id: session.user.id,
    p_code: code,
    p_original_price_pence: originalPricePence,
  });

  if (error) return { valid: false, error: error.message };
  return data;
}

// ══════════════════════════════════════════════════════════════════
// BOOKINGS
// ══════════════════════════════════════════════════════════════════

/**
 * Create a booking with optional discount code.
 */
export async function createBooking(params: {
  salonId: number;
  serviceName: string;
  appointmentDate: string;     // 'YYYY-MM-DD'
  appointmentTime: string;     // 'HH:MM'
  durationMinutes?: number;
  stylistName?: string;
  notes?: string;
  originalPricePence: number;
  discountCode?: string;
  paymentMethod?: 'wallet' | 'stripe' | 'pay_at_salon';
}): Promise<BookingResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'Not logged in' };

  const { data, error } = await supabase.rpc('create_booking', {
    p_user_id: session.user.id,
    p_salon_id: params.salonId,
    p_service_name: params.serviceName,
    p_appointment_date: params.appointmentDate,
    p_appointment_time: params.appointmentTime,
    p_duration_minutes: params.durationMinutes || null,
    p_stylist_name: params.stylistName || null,
    p_notes: params.notes || null,
    p_original_price_pence: params.originalPricePence,
    p_discount_code: params.discountCode || null,
    p_payment_method: params.paymentMethod || 'pay_at_salon',
  });

  if (error) return { success: false, error: error.message };
  return data;
}

/**
 * Get upcoming bookings for the current user.
 */
export async function getMyBookings(status?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  let query = supabase
    .from('bookings')
    .select('*, salons(name, area, city)')
    .eq('user_id', session.user.id)
    .order('appointment_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Cancel a booking.
 */
export async function cancelBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'Not logged in' };

  // Get the booking to check if there's a discount code to restore
  const { data: booking } = await supabase
    .from('bookings')
    .select('discount_code_id, status')
    .eq('id', bookingId)
    .eq('user_id', session.user.id)
    .single();

  if (!booking) return { success: false, error: 'Booking not found' };
  if (booking.status === 'cancelled') return { success: false, error: 'Already cancelled' };
  if (booking.status === 'completed') return { success: false, error: 'Cannot cancel a completed booking' };

  // Cancel the booking
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('user_id', session.user.id);

  if (error) return { success: false, error: error.message };

  // Restore the discount code so the user can use it again
  if (booking.discount_code_id) {
    await supabase
      .from('discount_codes')
      .update({ status: 'active', used_at: null, used_on_booking_id: null })
      .eq('id', booking.discount_code_id);
  }

  return { success: true };
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

/**
 * Format pence to display string.
 */
export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Get available XP redemption options for appointments.
 */
export async function getAppointmentRedemptionRates() {
  const { data } = await supabase
    .from('xp_redemption_rates')
    .select('*')
    .eq('redemption_type', 'appointment_discount')
    .eq('is_active', true)
    .order('xp_cost', { ascending: true });

  return data || [];
}
