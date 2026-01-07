// Supabase Edge Function: stripe-checkout
// Creates a Stripe Checkout Session for a subscription price.
// Deploy: supabase functions deploy stripe-checkout
//
// Required env vars (set in Supabase Dashboard → Project Settings → Functions → Secrets):
// - STRIPE_SECRET_KEY
//
// Optional env vars:
// - STRIPE_API_VERSION (e.g. 2024-06-20)
// - SITE_URL (fallback for redirect URLs)
//
// This function expects a logged-in Supabase user (Authorization: Bearer <access_token>).
// Body: { priceId: string, successUrl?: string, cancelUrl?: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_API_VERSION = (Deno.env.get("STRIPE_API_VERSION") ?? "2024-06-20") as any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });

  if (!STRIPE_SECRET_KEY) return json(500, { error: "Missing STRIPE_SECRET_KEY." });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(500, { error: "Missing SUPABASE env vars." });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json(401, { error: "Missing bearer token." });

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const priceId = payload.priceId;
  if (!priceId || typeof priceId !== "string") return json(400, { error: "Missing priceId." });

  const successUrl = (payload.successUrl && typeof payload.successUrl === "string")
    ? payload.successUrl
    : (SITE_URL ? `${SITE_URL.replace(/\/$/, "")}/thank_you_pro.html` : "");

  const cancelUrl = (payload.cancelUrl && typeof payload.cancelUrl === "string")
    ? payload.cancelUrl
    : (SITE_URL ? `${SITE_URL.replace(/\/$/, "")}/choose_plan.html` : "");

  if (!successUrl || !cancelUrl) {
    return json(400, { error: "Missing successUrl/cancelUrl, and SITE_URL is not set." });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json(401, { error: "Invalid user token." });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });

  // Reuse or create a Stripe Customer for this user
  const email = user.email ?? undefined;
  let customerId: string | undefined;

  try {
    // Try to find existing customer by email (best-effort). If multiple exist, pick the newest.
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length) customerId = existing.data[0].id;
    }

    if (!customerId) {
      const created = await stripe.customers.create({
        email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = created.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return json(200, { url: session.url });
  } catch (e) {
    console.error(e);
    return json(500, { error: (e as any)?.message ?? "Stripe error." });
  }
});
