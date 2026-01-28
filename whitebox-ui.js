/**
 * WhiteBox Agency – UI helpers
 *
 * DEBUG BUILD
 * All debug lines are marked with: // WB_DEBUG
 */

(function () {
  // WB_DEBUG
  console.log('[WB_DEBUG] whitebox-ui.js loaded');

  function $(id) {
    return document.getElementById(id);
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  // WB_DEBUG
  console.log('[WB_DEBUG] document.readyState =', document.readyState);

  onReady(async () => {
    // WB_DEBUG
    console.log('[WB_DEBUG] DOMContentLoaded fired');

    // ---- Detect page ----
    const isFree =
      !!document.getElementById('freeSignupForm') ||
      window.location.pathname.includes('signup_free');

    const isPaid =
      !!document.getElementById('paidSignupForm') ||
      window.location.pathname.includes('signup_paid') ||
      window.location.pathname.includes('pro_step');

    // WB_DEBUG
    console.log('[WB_DEBUG] page detection', {
      isFree,
      isPaid,
      path: window.location.pathname
    });

    // ---- Check Supabase ----
    if (!window.supabase && !window.whiteboxSupabase) {
      // WB_DEBUG
      console.error('[WB_DEBUG] Supabase client NOT found on window');
    } else {
      // WB_DEBUG
      console.log('[WB_DEBUG] Supabase client detected', {
        supabase: !!window.supabase,
        whiteboxSupabase: !!window.whiteboxSupabase
      });
    }

    // ---- Inspect buttons ----
    const buttons = Array.from(document.querySelectorAll('button'));

    // WB_DEBUG
    console.log(
      '[WB_DEBUG] buttons on page:',
      buttons.map(b => ({
        text: b.textContent.trim(),
        id: b.id,
        type: b.type,
        disabled: b.disabled
      }))
    );

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        // WB_DEBUG
        console.log('[WB_DEBUG] button CLICK detected:', {
          text: btn.textContent.trim(),
          id: btn.id,
          disabled: btn.disabled
        });
      });
    });

    // ---- Inspect forms ----
    const forms = Array.from(document.querySelectorAll('form'));

    // WB_DEBUG
    console.log(
      '[WB_DEBUG] forms on page:',
      forms.map(f => ({
        id: f.id,
        action: f.action,
        hasSubmitListener: 'unknown'
      }))
    );

    forms.forEach(form => {
      form.addEventListener('submit', e => {
        // WB_DEBUG
        console.log('[WB_DEBUG] FORM SUBMIT event fired', {
          id: form.id,
          defaultPrevented: e.defaultPrevented
        });
      });
    });

    // ---- Session check (non-blocking) ----
    try {
      const client = window.whiteboxSupabase || window.supabase;
      if (client?.auth?.getSession) {
        const { data } = await client.auth.getSession();
        // WB_DEBUG
        console.log('[WB_DEBUG] getSession result:', data);
      }
    } catch (err) {
      // WB_DEBUG
      console.error('[WB_DEBUG] getSession threw error', err);
    }
  });
})();