/**
 * WhiteBox Agency site UI helpers
 * - Shows login state in nav
 * - Displays "Welcome <name>" + subscription status when placeholders exist
 * - Provides simple account actions (logout)
 *
 * Requires:
 *  - js/supabase-config.js (window.WHITEBOX_SUPABASE_URL / window.WHITEBOX_SUPABASE_ANON_KEY)
 *  - js/supabase-client.js (window.getSupabaseClient)
 */

(function () {
  function el(id) { return document.getElementById(id); }

  async function getUserAndStatus(supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session || null;
    if (!session) return { session: null, user: null, status: "free" };

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;

    // Preferred: profile table (RLS-protected), fallback: user metadata
    let status = user?.user_metadata?.subscription_status || "free";
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && profile?.subscription_status) status = profile.subscription_status;
    } catch (_) {}

    return { session, user, status };
  }

  function renderNav({ user, status }) {
    const host = el("wb-nav-auth");
    if (!host) return;

    const accountHref = "account.html";
    if (!user) {
      host.innerHTML = `
        <a class="btn btn-secondary btn-sm" href="login.html">Log In</a>
        <a class="btn btn-primary btn-sm" href="choose_plan.html">Sign Up</a>
      `;
      return;
    }

    const label = (status === "pro" || status === "active" || status === "subscribed") ? "Pro" : "Free";
    host.innerHTML = `
      <a class="btn btn-secondary btn-sm" href="${accountHref}">Account</a>
      ${label === "Free" ? `<a class="btn btn-primary btn-sm" href="pricing.html">Upgrade</a>` : ``}
      <button class="btn btn-ghost btn-sm" id="wb-logout">Log out</button>
    `;

    const btn = el("wb-logout");
    if (btn) btn.addEventListener("click", async () => {
      try { await window.getSupabaseClient().auth.signOut(); } catch (_) {}
      window.location.href = "index.html";
    });
  }

  function renderWelcome({ user, status }) {
    const host = el("wb-userbar");
    if (!host) return;

    if (!user) {
      host.innerHTML = "";
      return;
    }

    const display =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "there";

    const label = (status === "pro" || status === "active" || status === "subscribed") ? "Pro" : "Free";
    host.innerHTML = `
      <div class="wb-userbar-inner">
        <span>Welcome, <strong>${escapeHtml(display)}</strong></span>
        <span class="wb-status-pill ${label === "Pro" ? "wb-status-pro" : "wb-status-free"}">${label}</span>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  async function ensureProfileExists(supabase, user) {
    // This requires an INSERT policy (see SETUP.md). If it fails, we just ignore it.
    try {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        subscription_status: user.user_metadata?.subscription_status || "free",
      }, { onConflict: "id" });
    } catch (_) {}
  }

  async function init() {
    if (!window.getSupabaseClient) return;
    const supabase = window.getSupabaseClient();
    const info = await getUserAndStatus(supabase);

    if (info.user) await ensureProfileExists(supabase, info.user);

    renderNav({ user: info.user, status: info.status });
    renderWelcome({ user: info.user, status: info.status });
    // Prevent "logged-out" header flash on page loads.
    document.documentElement.classList.add('wb-nav-ready');

    // Keep UI in sync if auth changes (login/logout in another tab)
    supabase.auth.onAuthStateChange(async () => {
      const updated = await getUserAndStatus(supabase);
      if (updated.user) await ensureProfileExists(supabase, updated.user);
      renderNav({ user: updated.user, status: updated.status });
      renderWelcome({ user: updated.user, status: updated.status });
      document.documentElement.classList.add('wb-nav-ready');
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
