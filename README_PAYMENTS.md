# Stripe + Supabase payments checklist

Right now the website UI is in place (Upgrade / Choose Plan), but **Stripe payments are not fully wired up yet**.

To make payments work end-to-end you still need:

1) an endpoint that creates a **Stripe Checkout session**, and
2) a **Stripe webhook** endpoint that marks the user as Pro after Stripe confirms payment.

---

## 1) Stripe setup

1. In Stripe Dashboard, create a **Product** for WhiteBox Pro.
2. Create at least one **recurring Price** (monthly, yearly, or both).
   - Copy the Price IDs (they look like `price_...`).

## 2) Supabase setup (database)

You need one place to store subscription status. The simplest is your existing `public.profiles` table.

Suggested fields:
- `plan` text: `free` or `pro`
- `stripe_customer_id` text (nullable)
- `stripe_subscription_id` text (nullable)
- `is_pro` text (nullable: `active`, `trialing`, `canceled`, etc.)
- `current_period_end` timestamptz (nullable)

## 3) Supabase Edge Functions (required)

### A. create-checkout-session
Create an edge function that:
1. Reads the logged-in user (JWT) from the `Authorization: Bearer ...` header.
2. Takes a plan identifier (e.g., `monthly`/`yearly`) from the request body.
3. Creates (or reuses) a Stripe customer for that user.
4. Creates a Stripe Checkout session for a subscription.
5. Returns `{ url }` (the Checkout URL).

### B. stripe-webhook
Create another edge function that:
1. Verifies the Stripe webhook signature.
2. Listens for subscription events (at minimum: `checkout.session.completed`, plus one of the subscription update events).
3. Updates `public.profiles` for the user to `plan = 'pro'` when active.

## 4) Secrets / environment variables

In Supabase (Project Settings → Functions / Secrets), set:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- (optional) your price IDs such as `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY`
- `SITE_URL` (e.g., `https://whitebox-agency.com`) for success/cancel redirects

## 5) Stripe webhook endpoint

In Stripe Dashboard:
1. Go to Developers → Webhooks → Add endpoint
2. Endpoint URL should be your Supabase function URL for `stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET` in Supabase.

## 6) Website wiring

Once the functions exist, the website “Upgrade” button should:
1. call `create-checkout-session` using the current Supabase session token,
2. redirect the browser to the returned Checkout URL.

After Stripe redirects back to your `success_url`, you can show a “Thanks — your subscription is active” page, and your header logic will pick up the Pro status from `profiles`.

## 7) Testing flow

1. Use Stripe test mode.
2. Create a new free account on the site.
3. Click Upgrade → choose a plan → you should land on Stripe Checkout.
4. Complete checkout with a Stripe test card.
5. Confirm Stripe sends webhook events (Stripe dashboard shows deliveries succeed).
6. Confirm `profiles.plan` becomes `pro`.
7. Confirm the website header shows Pro state.

---

If you want, the fastest route is: tell me which plans you want (monthly only vs monthly+yearly), and I can wire the website buttons to the edge function endpoints after you create them (or I can add the edge function templates to your repo if you want to deploy them from CLI).
