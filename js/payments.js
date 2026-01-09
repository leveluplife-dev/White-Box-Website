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

  function planToUi(plan) {
    const p = (plan || '').toLowerCase();
    if (p === 'monthly') return { label: 'Monthly — $4.99 / month', summary: '($4.99 / month)' };
    if (p === '6mo' || p === '6month' || p === '6-month' || p === '6months') return { label: '6-Month — $24.99 / 6 months (recommended)', summary: '($24.99 / 6 months (recommended))' };
    if (p === 'annual' || p === 'yearly' || p === '12mo' || p === '12month' || p === '12-month') return { label: 'Annual — $49.98 / year', summary: '($49.98 / year)' };
    return { label: 'Unknown plan', summary: '' };
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

      const origin = window.location.origin;
      const successUrl = origin + '/thank_you_pro.html';
      const cancelUrl  = origin + '/choose_plan.html';

      let body = null;

      // Preferred path: invoke via supabase-js (it automatically includes apikey + access token)
      if (supabase.functions && typeof supabase.functions.invoke === 'function') {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { priceId, successUrl, cancelUrl }
        });
        if (error) throw error;
        body = data || {};
      } else {
        // Fallback path: direct fetch to the function URL.
        const derivedUrl = window.WHITEBOX_SUPABASE_URL
          ? `${String(window.WHITEBOX_SUPABASE_URL).replace(/\/$/, '')}/functions/v1/create-checkout`
          : '';
        const checkoutUrl = window.WHITEBOX_EDGE_STRIPE_CHECKOUT_URL || derivedUrl;
        if (!checkoutUrl || String(checkoutUrl).includes('<')) {
          showError('Stripe checkout function URL is not configured. Update js/supabase-config.js.');
          return;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        };
        if (window.WHITEBOX_SUPABASE_ANON_KEY && !String(window.WHITEBOX_SUPABASE_ANON_KEY).includes('<')) {
          headers['apikey'] = window.WHITEBOX_SUPABASE_ANON_KEY;
        }

        const res = await fetch(checkoutUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ priceId, successUrl, cancelUrl })
        });

        body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = body && (body.error || body.message) ? (body.error || body.message) : `Checkout failed (${res.status}).`;
          showError(msg);
          return;
        }
      }

      if (!body || !body.url) {
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
    // Require the early-access disclosure acknowledgment before showing payment.
    const ACK_KEY = 'wb_pro_early_access_ack_v1';
    const plan = qs('plan') || '6mo';

    // Show which plan the user selected.
    const ui = planToUi(plan);
    const planLabelEl = document.getElementById('planLabel');
    if (planLabelEl) planLabelEl.textContent = ui.label;
    const planSummaryEl = document.getElementById('planSummary');
    if (planSummaryEl) planSummaryEl.textContent = ui.summary;

    if (localStorage.getItem(ACK_KEY) !== 'true') {
      window.location.replace(`pro_disclosure.html?plan=${encodeURIComponent(plan)}`);
      return;
    }

    const btn = document.getElementById('startCheckoutBtn');
    if (btn) btn.addEventListener('click', startCheckout);
  });
})();
