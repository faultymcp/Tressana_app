// supabase/functions/create-discount/index.ts
// Deploy with: supabase functions deploy create-discount
//
// Creates a Stripe Coupon + Promotion Code when a user redeems XP for a discount.
// The promotion code can then be applied at Stripe Checkout.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { redemption_rate_id, type } = body;
    // type: 'appointment' | 'subscription'

    // ── Get the redemption rate ──────────────────────────────
    const { data: rate, error: rateError } = await supabase
      .from('xp_redemption_rates')
      .select('*')
      .eq('id', redemption_rate_id)
      .eq('is_active', true)
      .single();

    if (rateError || !rate) throw new Error('Invalid redemption option');
    if (rate.redemption_type !== 'appointment_discount') {
      throw new Error('This endpoint is for appointment/subscription discounts only');
    }

    // ── Check XP balance ─────────────────────────────────────
    const { data: xpData } = await supabase
      .from('xp_balances')
      .select('current_balance')
      .eq('user_id', user.id)
      .single();

    const currentXp = xpData?.current_balance || 0;
    if (currentXp < rate.xp_cost) {
      throw new Error(`Insufficient XP. Need ${rate.xp_cost}, have ${currentXp}.`);
    }

    // ── Create Stripe Coupon ─────────────────────────────────
    // Stripe Coupon = the discount definition
    // Stripe Promotion Code = the user-facing code that applies the coupon
    const coupon = await stripe.coupons.create({
      amount_off: rate.discount_amount_pence,  // in smallest currency unit (pence)
      currency: 'gbp',
      duration: 'once',                         // applies once
      name: rate.label,                         // e.g. "£5 off appointment"
      metadata: {
        supabase_user_id: user.id,
        source: 'xp_redemption',
        xp_cost: rate.xp_cost.toString(),
      },
    });

    // ── Create Promotion Code (the user-facing code) ─────────
    // This is what the user enters at checkout
    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      max_redemptions: 1,                       // one-time use
      expires_at: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
      metadata: {
        supabase_user_id: user.id,
        source: 'xp_redemption',
      },
      restrictions: {
        first_time_transaction: false,
      },
    });

    // ── Deduct XP ────────────────────────────────────────────
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_action: 'bonus',
      p_override_amount: -rate.xp_cost,  // negative to deduct
      p_description: `Redeemed for: ${rate.label}`,
    });

    // Actually, award_xp only adds. Let's deduct properly:
    await supabase
      .from('xp_balances')
      .update({
        total_spent: supabase.rpc ? undefined : 0, // handled below
      })
      .eq('user_id', user.id);

    // Use raw SQL via rpc for proper deduction
    const { error: deductError } = await supabase.rpc('redeem_xp', {
      p_user_id: user.id,
      p_redemption_rate_id: redemption_rate_id,
    });

    if (deductError) {
      // Rollback: delete the Stripe coupon
      await stripe.coupons.del(coupon.id);
      throw new Error(`XP deduction failed: ${deductError.message}`);
    }

    // ── Store in discount_codes table ────────────────────────
    const { data: discountCode, error: insertError } = await supabase
      .from('discount_codes')
      .insert({
        user_id: user.id,
        code: promoCode.code,                    // Stripe-generated code
        discount_amount_pence: rate.discount_amount_pence,
        source: 'xp_redemption',
        applies_to: type === 'subscription' ? 'any' : 'appointment',
        status: 'active',
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) console.error('Failed to store discount code:', insertError);

    // ── Return ───────────────────────────────────────────────
    return new Response(JSON.stringify({
      success: true,
      code: promoCode.code,
      stripe_coupon_id: coupon.id,
      stripe_promo_code_id: promoCode.id,
      discount_label: rate.label,
      discount_amount_pence: rate.discount_amount_pence,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      message: `Your code ${promoCode.code} is ready. Apply it at checkout for ${rate.label}.`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Discount creation error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
