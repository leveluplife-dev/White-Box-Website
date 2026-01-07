# Stripe setup (Supabase Edge Functions)

This repo includes two Supabase Edge Functions to power Stripe subscriptions:

- `stripe-checkout` (creates a Stripe Checkout Session and returns a redirect URL)
- `stripe-webhook` (Stripe webhook to set `public.profiles.is_pro` true/false)

## 1) Create/confirm DB column
In Supabase SQL editor, ensure `profiles` has:

```sql
alter table public.profiles add column if not exists is_pro boolean not null default false;
```

## 2) Set Function secrets (Supabase Dashboard)
Project Settings → Functions → Secrets:

- STRIPE_SECRET_KEY = (Stripe secret key)
- STRIPE_WEBHOOK_SECRET = (created in Stripe Webhooks)
- SUPABASE_SERVICE_ROLE_KEY = (for webhook only)
- SITE_URL = https://whitebox-agency.com  (optional fallback)
- STRIPE_API_VERSION = 2024-06-20 (optional)

## 3) Deploy functions
Using Supabase CLI:

```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 4) Configure Stripe Webhook
Stripe Dashboard → Developers → Webhooks:

- Endpoint URL:
  `https://<project-ref>.functions.supabase.co/stripe-webhook`
- Events:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted

## 5) Update website config
Edit `js/supabase-config.js`:

- `WHITEBOX_EDGE_STRIPE_CHECKOUT_URL` must be:
  `https://<project-ref>.functions.supabase.co/stripe-checkout`

Price IDs are already filled in.

