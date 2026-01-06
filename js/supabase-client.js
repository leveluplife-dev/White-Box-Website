// Initializes a Supabase client on window.whiteboxSupabase
// Requires:
//  - https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//  - js/supabase-config.js (WHITEBOX_SUPABASE_URL + WHITEBOX_SUPABASE_ANON_KEY)

(function () {
  if (!window.supabase) {
    console.error('Supabase JS library not loaded.');
    return;
  }

  const url = window.WHITEBOX_SUPABASE_URL;
  const anonKey = window.WHITEBOX_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes('YOUR_PROJECT_REF') || anonKey.includes('YOUR_SUPABASE')) {
    console.warn(
      'Supabase config not set. Edit js/supabase-config.js and paste your project URL + anon public key.'
    );
  }

  // Persist session in local storage so your website (and later your extension) can read auth state.
  window.whiteboxSupabase = window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'whitebox.auth',
    },
  });

  // Backwards-compatible helper used throughout the site.
  // Several pages call window.getSupabaseClient(); keep this stable.
  window.getSupabaseClient = function getSupabaseClient(){
    return window.whiteboxSupabase;
  };

  // Optional: expose a simple readiness flag
  window.WHITEBOX_SUPABASE_READY = true;
})();
