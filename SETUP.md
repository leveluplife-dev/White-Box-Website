# WhiteBox Website — Setup Notes

## 1) Update Supabase keys (website)
Edit: `js/supabase-config.js`

- `window.WHITEBOX_SUPABASE_URL`
- `window.WHITEBOX_SUPABASE_ANON_KEY`

Optional store URLs (placeholders are fine for now):
- `window.WHITEBOX_CHROME_STORE_URL`
- `window.WHITEBOX_EDGE_STORE_URL`

## 2) Supabase DB policies (profiles table)

Your site and extension expect a `public.profiles` table keyed by the auth user UUID.

### Required
- RLS enabled on `public.profiles`
- SELECT policy for authenticated users:
  - `using (id = auth.uid())`
- UPDATE policy for authenticated users:
  - `using (id = auth.uid())`
  - `with check (id = auth.uid())`

### Strongly recommended (so the site can create the profile row automatically)
Create an INSERT policy:

- Command: **INSERT**
- Target role: **authenticated**
- `with check (id = auth.uid())`

If you don’t add INSERT, the website will still work, but the `profiles` row may not be created automatically.

## 3) Subscription status source of truth (v1)
For now, the website will:
- try to read `profiles.subscription_status`
- fall back to `user.user_metadata.subscription_status` if needed

Later, when Stripe is wired up, we’ll update this automatically.

## 4) Pages added
- `account.html` – shows login status + preferences
- `reset_password.html` – handles password reset links
