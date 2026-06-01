// supabase/functions/stripe-webhook/index.ts
// Deploy with: supabase functions deploy stripe-webhook --no-verify-jwt
//
// Set secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── Map Stripe price IDs to your tiers ──────────────────────────
// Create these products/prices in Stripe Dashboard first.
// Then paste the price IDs here.
const PRICE_TO_TIER: Record<string, { tier: 'pro' | 'pro_plus'; is_annual: boolean }> = {
  'price_1TMRU2DC9UscLZe9Os6ts0tz': { tier: 'pro', is_annual: false },       // Tressie Pro £6.99/mo
  'price_1TMRU2DC9UscLZe9P4HATV7y': { tier: 'pro', is_annual: true },        // Tressie Pro £54.99/yr
  'price_1TMRVJDC9UscLZe9dspjkCEN': { tier: 'pro_plus', is_annual: false },  // Tressie Pro+ £12.99/mo
  'price_1TMRVoDC9UscLZe9aez9K6NY': { tier: 'pro_plus', is_annual: true },   // Tressie Pro+ £99.99/yr
};

// ── Map wallet top-up amounts ───────────────────────────────────
const WALLET_AMOUNTS: Record<string, number> = {
  'price_wallet_500':  500,   // £5.00
  'price_wallet_1000': 1000,  // £10.00
  'price_wallet_2000': 2000,  // £20.00
  // Replace with your actual Stripe price IDs
};

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Processing event: ${event.type}`);

  try {
    switch (event.type) {

      // ════════════════════════════════════════════════════════
      // SUBSCRIPTION CREATED (first payment successful)
      // ════════════════════════════════════════════════════════
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const item = subscription.items?.data?.[0];
        const priceId = item?.price.id;
        const tierInfo = PRICE_TO_TIER[priceId];

        if (!tierInfo) {
          console.warn(`Unknown price ID: ${priceId}`);
          break;
        }

        // Only grant a paid tier once payment has actually gone through.
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          console.log(`Subscription ${subscription.id} status is ${subscription.status}, not granting tier yet`);
          break;
        }

        // Period dates: in newer Stripe API versions these live on the
        // subscription item, not the subscription. Fall back safely.
        const periodStartUnix = item?.current_period_start ?? (subscription as any).current_period_start;
        const periodEndUnix = item?.current_period_end ?? (subscription as any).current_period_end;
        const toISO = (unix: number | undefined) =>
          typeof unix === 'number' ? new Date(unix * 1000).toISOString() : null;

        // Find user by Stripe customer ID
        const userId = await getUserIdByStripeCustomer(customerId);
        if (!userId) {
          console.error(`No user found for Stripe customer: ${customerId}`);
          break;
        }

        // Upsert subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            tier: tierInfo.tier,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            is_annual: tierInfo.is_annual,
            current_period_start: toISO(periodStartUnix),
            current_period_end: toISO(periodEndUnix),
            cancel_at_period_end: subscription.cancel_at_period_end,
            // Reset usage on new period
            tryon_used_this_period: 0,
            tressie_chats_used_this_period: 0,
            ingredient_scans_used_this_period: 0,
            period_reset_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) console.error('Failed to upsert subscription:', error);
        else console.log(`Subscription ${tierInfo.tier} set for user ${userId}`);

        // Award XP for subscribing (first time only)
        if (event.type === 'customer.subscription.created') {
          await supabase.rpc('award_xp', {
            p_user_id: userId,
            p_action: 'bonus',
            p_description: `Subscribed to Tressie ${tierInfo.tier === 'pro_plus' ? 'Pro+' : 'Pro'}`,
            p_override_amount: 100,
          });
        }

        break;
      }

      // ════════════════════════════════════════════════════════
      // SUBSCRIPTION RENEWED (new billing period)
      // ════════════════════════════════════════════════════════
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break; // Not a subscription invoice (e.g. one-time)

        // Only reset usage on renewal, not first payment
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = subscription.customer as string;
        const userId = await getUserIdByStripeCustomer(customerId);
        if (!userId) break;

        // Reset usage counters for new period
        await supabase.rpc('reset_subscription_period', { p_user_id: userId });

        console.log(`Period reset for user ${userId}`);
        break;
      }

      // ════════════════════════════════════════════════════════
      // SUBSCRIPTION CANCELLED
      // ════════════════════════════════════════════════════════
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdByStripeCustomer(customerId);
        if (!userId) break;

        // Downgrade to free
        await supabase
          .from('user_subscriptions')
          .update({
            tier: 'free',
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        console.log(`Subscription cancelled, user ${userId} downgraded to free`);
        break;
      }

      // ════════════════════════════════════════════════════════
      // CHECKOUT COMPLETED (wallet top-up OR booking payment)
      // ════════════════════════════════════════════════════════
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionType = session.metadata?.type;

        if (sessionType === 'wallet_topup') {
          // ── WALLET TOP-UP ──
          const userId = session.metadata.user_id;
          const amountPence = parseInt(session.metadata.amount_pence || '0');

          if (!userId || !amountPence) {
            console.error('Missing wallet top-up metadata');
            break;
          }

          const { data: wallet } = await supabase
            .from('wallet_balances')
            .select('balance_pence')
            .eq('user_id', userId)
            .single();

          const currentBalance = wallet?.balance_pence || 0;
          const newBalance = currentBalance + amountPence;

          await supabase
            .from('wallet_balances')
            .upsert({
              user_id: userId,
              balance_pence: newBalance,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

          await supabase
            .from('wallet_transactions')
            .insert({
              user_id: userId,
              tx_type: 'top_up',
              amount_pence: amountPence,
              description: `Wallet top-up £${(amountPence / 100).toFixed(2)}`,
              reference_id: session.payment_intent as string,
              balance_after_pence: newBalance,
            });

          console.log(`Wallet topped up: user ${userId}, +£${(amountPence / 100).toFixed(2)}`);

        } else if (sessionType === 'booking') {
          // ── BOOKING PAYMENT ──
          const userId = session.metadata!.user_id;
          const bookingId = session.metadata!.booking_id;

          if (bookingId) {
            // Mark booking as paid
            await supabase
              .from('bookings')
              .update({
                paid: true,
                stripe_payment_intent_id: session.payment_intent as string,
                status: 'confirmed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', bookingId);

            console.log(`Booking ${bookingId} paid for user ${userId}`);
          }

          // Check if a Stripe promotion code was applied
          if (session.total_details?.breakdown?.discounts?.length) {
            const discount = session.total_details.breakdown.discounts[0];
            const promoCodeId = (discount as any).discount?.promotion_code;

            if (promoCodeId) {
              // Mark the corresponding discount_code as used in our DB
              // Look up by the Stripe promo code
              const promo = await stripe.promotionCodes.retrieve(promoCodeId as string);
              if (promo.code) {
                await supabase
                  .from('discount_codes')
                  .update({
                    status: 'used',
                    used_at: new Date().toISOString(),
                    used_on_booking_id: bookingId || null,
                  })
                  .eq('code', promo.code)
                  .eq('user_id', userId);

                console.log(`Discount code ${promo.code} marked as used`);
              }
            }
          }
        }

        break;
      }

      // ════════════════════════════════════════════════════════
      // CUSTOMER DISCOUNT EVENTS (coupon attached/removed)
      // ════════════════════════════════════════════════════════
      case 'customer.discount.created': {
        const discount = event.data.object as any;
        const customerId = discount.customer as string;
        console.log(`Coupon attached to customer ${customerId}: ${discount.coupon?.name || discount.coupon?.id}`);
        break;
      }

      case 'customer.discount.deleted': {
        const discount = event.data.object as any;
        const customerId = discount.customer as string;
        console.log(`Coupon removed from customer ${customerId}`);
        break;
      }

      // ════════════════════════════════════════════════════════
      // PAYMENT FAILED
      // ════════════════════════════════════════════════════════
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.warn(`Payment failed for customer ${customerId}`);
        // TODO: Send push notification to user about failed payment
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    return new Response(`Processing error: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ── Helper: look up user ID from Stripe customer ID ─────────────
async function getUserIdByStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  // First check user_subscriptions
  const { data } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();

  if (data) return data.user_id;

  // Fall back to profiles metadata (set when customer is first created)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();

  return profile?.id || null;
}