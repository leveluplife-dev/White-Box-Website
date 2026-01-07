// Supabase Edge Function: stripe-webhook
// Stripe webhook that updates public.profiles.is_pro based on subscription status.
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// (Webhooks come from Stripe, not a logged-in user)
//
// Required env vars:
// - STRIPE_WEBHOOK_SECRET
// - STRIPE_SECRET_KEY
//
// Also requires a profiles table with columns:
// - id (uuid, matches auth.users.id)
// - is_pro (boolean, default false)
//
// The subscription is expected to have metadata.supabase_user_id
// (set in stripe-checkout function).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return json(500, { error: "Missing Stripe secrets." });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json(500, { error: "Missing Supabase service role." });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  const sig = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET) as Stripe.Event;
  } catch (e) {
    console.error(e);
    return json(400, { error: "Invalid signature." });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  async function setPro(userId: string, isPro: boolean) {
    // upsert profile row
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, is_pro: isPro }, { onConflict: "id" });
    if (error) throw error;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId = session.subscription as string | null;
      if (!subId) return json(200, { ok: true });

      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = (sub.metadata && sub.metadata.supabase_user_id) ? sub.metadata.supabase_user_id : "";
      if (userId) {
        const active = sub.status === "active" || sub.status === "trialing";
        await setPro(userId, active);
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata && sub.metadata.supabase_user_id) ? sub.metadata.supabase_user_id : "";
      if (userId) {
        const active = sub.status === "active" || sub.status === "trialing";
        await setPro(userId, active);
      }
    }

    return json(200, { received: true });
  } catch (e) {
    console.error(e);
    return json(500, { error: (e as any)?.message ?? "Webhook error" });
  }
});
