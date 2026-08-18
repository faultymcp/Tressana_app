// lib/payments.ts
// Handles subscription and wallet top-up flows via Stripe Checkout
// Uses Supabase Edge Functions + expo-web-browser for the checkout URL

import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { supabase } from './supabase';

const EDGE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// ── Stripe Price IDs ─────────────────────────────────────────────
// Replace these with your actual Stripe price IDs from the Dashboard.
// Create them at: https://dashboard.stripe.com/products
export const PRICES = {
  pro_monthly: 'price_1TMRU2DC9UscLZe9Os6ts0tz',       // Tressie Pro £6.99/mo
  pro_annual: 'price_1TMRU2DC9UscLZe9P4HATV7y',        // Tressie Pro £54.99/yr
  pro_plus_monthly: 'price_1TMRVJDC9UscLZe9dspjkCEN',  // Tressie Pro+ £12.99/mo
  pro_plus_annual: 'price_1TMRVoDC9UscLZe9aez9K6NY',   // Tressie Pro+ £99.99/yr
} as const;

// ── Wallet top-up amounts (pence) ────────────────────────────────
export const WALLET_AMOUNTS = [
  { label: '£5.00', pence: 500 },
  { label: '£10.00', pence: 1000 },
  { label: '£20.00', pence: 2000 },
] as const;

// ── Get current session token ────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not logged in');
  return session.access_token;
}

// ── Call the create-checkout Edge Function ────────────────────────
async function createCheckout(body: Record<string, any>): Promise<string> {
  const token = await getAccessToken();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create checkout session');
  }

  if (!data.url) {
    throw new Error('No checkout URL returned');
  }

  return data.url;
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════

/**
 * Start a subscription checkout flow.
 * Opens Stripe Checkout in an in-app browser.
 * The webhook handles the rest.
 */
export async function startSubscription(
  priceId: string,
  onSuccess?: () => void,
  onCancel?: () => void,
): Promise<void> {
  try {
    const url = await createCheckout({
      type: 'subscription',
      price_id: priceId,
    });

    const result = await WebBrowser.openAuthSessionAsync(url, 'tressie://payment-success');

    if (result.type === 'success') {
      // The webhook will update the DB. 
      // Give it a moment, then callback.
      setTimeout(() => onSuccess?.(), 1500);
    } else {
      onCancel?.();
    }
  } catch (err: any) {
    Alert.alert('Payment Error', err.message || 'Something went wrong. Please try again.');
  }
}

/**
 * Start a wallet top-up checkout flow.
 * Opens Stripe Checkout for a one-time payment.
 */
export async function startWalletTopUp(
  amountPence: number,
  onSuccess?: () => void,
  onCancel?: () => void,
): Promise<void> {
  try {
    const url = await createCheckout({
      type: 'wallet_topup',
      amount_pence: amountPence,
    });

    const result = await WebBrowser.openAuthSessionAsync(url, 'tressie://payment-success');

    if (result.type === 'success') {
      setTimeout(() => onSuccess?.(), 1500);
    } else {
      onCancel?.();
    }
  } catch (err: any) {
    Alert.alert('Payment Error', err.message || 'Something went wrong. Please try again.');
  }
}

/**
 * Purchase a try-on pack using wallet balance.
 * No Stripe involved — just deducts from wallet internally.
 */
export async function purchaseTryOnPack(packId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not logged in' };

    const { data, error } = await supabase.rpc('purchase_tryon_pack', {
      p_user_id: session.user.id,
      p_pack_id: packId,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Consume one AI try-on credit.
 * Checks subscription allowance first, then purchased credits.
 * Returns resolution and source if allowed, or error if not.
 */
export async function consumeTryOn(): Promise<{
  allowed: boolean;
  resolution?: string;
  source?: string;
  remaining_subscription?: number;
  remaining_credits?: number;
  reason?: string;
  can_purchase?: boolean;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { allowed: false, reason: 'Not logged in' };

    const { data, error } = await supabase.rpc('consume_tryon', {
      p_user_id: session.user.id,
      p_requested_resolution: '4k',
    });

    if (error) return { allowed: false, reason: error.message };
    return data;
  } catch (err: any) {
    return { allowed: false, reason: err.message };
  }
}

/**
 * Redeem XP for try-on credits.
 */
export async function redeemXpForTryOns(redemptionRateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not logged in' };

    const { data, error } = await supabase.rpc('redeem_xp_for_tryons', {
      p_user_id: session.user.id,
      p_redemption_rate_id: redemptionRateId,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get available try-on credit packs (for purchase with wallet).
 */
export async function getTryOnPacks() {
  const { data, error } = await supabase
    .from('tryon_credit_packs')
    .select('*')
    .eq('is_active', true)
    .order('price_pence', { ascending: true });

  return { packs: data || [], error };
}

/**
 * Get available XP redemption options.
 */
export async function getXpRedemptionRates() {
  const { data, error } = await supabase
    .from('xp_redemption_rates')
    .select('*')
    .eq('is_active', true)
    .order('xp_cost', { ascending: true });

  return { rates: data || [], error };
}

// ══════════════════════════════════════════════════════════════════
// STRIPE DISCOUNT CODES (XP → Stripe Coupon → Promotion Code)
// ══════════════════════════════════════════════════════════════════

/**
 * Redeem XP for a Stripe discount code.
 * Creates a real Stripe Coupon + Promotion Code that works at checkout.
 * The code can be applied to appointment bookings or subscriptions.
 */
export async function redeemXpForDiscount(
  redemptionRateId: string,
  type: 'appointment' | 'subscription' = 'appointment',
): Promise<{
  success: boolean;
  code?: string;
  discount_label?: string;
  discount_amount_pence?: number;
  expires_at?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();

    const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/create-discount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ redemption_rate_id: redemptionRateId, type }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to create discount' };
    }

    return {
      success: true,
      code: data.code,
      discount_label: data.discount_label,
      discount_amount_pence: data.discount_amount_pence,
      expires_at: data.expires_at,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Start a booking payment via Stripe Checkout.
 * The user can apply their XP-generated promo code at checkout.
 */
export async function startBookingPayment(
  params: {
    amountPence: number;
    description: string;
    bookingId?: string;
    salonName?: string;
  },
  onSuccess?: () => void,
  onCancel?: () => void,
): Promise<void> {
  try {
    const url = await createCheckout({
      type: 'booking',
      booking_amount_pence: params.amountPence,
      booking_description: params.description,
      booking_metadata: {
        booking_id: params.bookingId || '',
        salon_name: params.salonName || '',
      },
    });

    const result = await WebBrowser.openAuthSessionAsync(url, 'tressie://payment-success');

    if (result.type === 'success') {
      setTimeout(() => onSuccess?.(), 1500);
    } else {
      onCancel?.();
    }
  } catch (err: any) {
    Alert.alert('Payment Error', err.message || 'Something went wrong. Please try again.');
  }
}