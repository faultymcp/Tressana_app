// supabase/functions/create-checkout/index.ts
// Deploy with: supabase functions deploy create-checkout
//
// Called from React Native app to get a Stripe Checkout URL

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
    // Authenticate user via Supabase JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { type, price_id, amount_pence, booking_amount_pence, booking_description, booking_metadata } = body;

    // ── Get or create Stripe customer ────────────────────────
    let stripeCustomerId: string;

    // Check if user already has a Stripe customer ID
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Store the customer ID
      await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          tier: 'free',
        }, { onConflict: 'user_id' });
    }

    // ── Create checkout session ──────────────────────────────
    if (type === 'subscription') {
      if (!price_id) throw new Error('Missing price_id for subscription');

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        line_items: [{ price: price_id, quantity: 1 }],
        allow_promotion_codes: true,  // User can enter XP-generated promo codes
        success_url: 'tressie://payment-success?type=subscription',
        cancel_url: 'tressie://payment-cancel',
        subscription_data: {
          metadata: { supabase_user_id: user.id },
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'booking') {
      // Appointment booking paid via Stripe
      if (!booking_amount_pence) throw new Error('Missing booking_amount_pence');

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: booking_description || 'Salon Appointment',
              description: 'Booked via Tressie',
            },
            unit_amount: booking_amount_pence,
          },
          quantity: 1,
        }],
        allow_promotion_codes: true,  // User can enter XP-generated promo codes
        success_url: 'tressie://payment-success?type=booking',
        cancel_url: 'tressie://payment-cancel',
        metadata: {
          type: 'booking',
          user_id: user.id,
          ...(booking_metadata || {}),
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'wallet_topup') {
      if (!amount_pence) throw new Error('Missing amount_pence for wallet top-up');

      // Validate amount
      const validAmounts = [500, 1000, 2000];
      if (!validAmounts.includes(amount_pence)) {
        throw new Error('Invalid top-up amount. Must be 500, 1000, or 2000 pence.');
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Tressie Wallet Top-Up`,
              description: `Add £${(amount_pence / 100).toFixed(2)} to your Tressie wallet`,
            },
            unit_amount: amount_pence,
          },
          quantity: 1,
        }],
        success_url: 'tressie://payment-success?type=wallet',
        cancel_url: 'tressie://payment-cancel',
        metadata: {
          type: 'wallet_topup',
          user_id: user.id,
          amount_pence: amount_pence.toString(),
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      throw new Error('Invalid type. Must be "subscription", "wallet_topup", or "booking".');
    }

  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
