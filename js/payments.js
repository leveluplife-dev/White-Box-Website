// payments.js
// Handles redirect to Stripe Checkout via Supabase Edge Function.

(function () {
  function qs(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function showError(msg) {
    const el = document.getElementById('checkoutError');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = msg;
  }

  function planToPriceId(plan) {
    const p = (plan || '').toLowerCase();
    if (p === 'monthly') return window.WHITEBOX_STRIPE_PRICE_MONTHLY;
    if (p === '6mo' || p === '6month' || p === '6-month' || p === '6months') return window.WHITEBOX_STRIPE_PRICE_6MONTH;
    if (p === 'annual' || p === 'yearly' || p === '12mo' || p === '12month' || p === '12-month') return window.WHITEBOX_STRIPE_PRICE_ANNUAL;
    // default
    return window.WHITEBOX_STRIPE_PRICE_6MONTH;
  }

  async function startCheckout() {
    try {
      // IMPORTANT:
      // window.supabase is the *library* from the CDN.
      // The initialized client is created in js/supabase-client.js.
      const supabase = (typeof window.getSupabaseClient === 'function')
        ? window.getSupabaseClient()
        : window.whiteboxSupabase;

      if (!supabase || !supabase.auth) {
        showError('Supabase client not initialized. Make sure js/supabase-client.js is loaded before payments.js.');
        return;
      }

      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;
      if (!session || !session.access_token) {
        // Redirect to login and come back here with same plan
        const plan = qs('plan') || '6mo';
        window.location.href = `login.html?next=${encodeURIComponent('pro_payment.html?plan=' + plan)}`;
        return;
      }

      const plan = qs('plan') || '6mo';
      const priceId = planToPriceId(plan);

      if (!priceId || String(priceId).includes('<')) {
        showError('Stripe Price IDs are not configured. Update js/supabase-config.js.');
        return;
      }

      const checkoutUrl = window.WHITEBOX_EDGE_STRIPE_CHECKOUT_URL;
      if (!checkoutUrl || String(checkoutUrl).includes('<')) {
        showError('Stripe checkout function URL is not configured. Update js/supabase-config.js.');
        return;
      }

      const origin = window.location.origin;
      const successUrl = origin + '/thank_you_pro.html';
      const cancelUrl  = origin + '/choose_plan.html';

      const res = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceId,
          successUrl,
          cancelUrl,
        })
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body && (body.error || body.message) ? (body.error || body.message) : `Checkout failed (${res.status}).`;
        showError(msg);
        return;
      }

      if (!body.url) {
        showError('Checkout failed: missing redirect URL.');
        return;
      }

      window.location.href = body.url;
    } catch (e) {
      console.error(e);
      showError(e && e.message ? e.message : 'Unexpected error starting checkout.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('startCheckoutBtn');
    if (btn) btn.addEventListener('click', startCheckout);
  });
})();
