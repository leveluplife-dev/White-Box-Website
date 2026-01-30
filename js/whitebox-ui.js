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

  function setNavReady() {
    document.documentElement.classList.add("wb-nav-ready");
  }

  function updatePlanPill(status) {
    const pill = el("wb-plan-pill");
    if (!pill) return;
    const isPro = (status === "pro" || status === "active" || status === "subscribed" || status === true);
    pill.textContent = isPro ? "Pro" : "Free";
    pill.classList.toggle("pro", isPro);
  }

  function updateStaticUpgradeLink({ user, status }) {
    const link = el("wb-upgrade-link");
    if (!link) return;
    // If you're not logged in, keep Upgrade visible.
    if (!user) {
      link.style.display = "";
      return;
    }
    const isPro = (status === "pro" || status === "active" || status === "subscribed" || status === true);
    link.style.display = isPro ? "none" : "";
  }

  // NOTE: This helper is used by multiple pages (including /account/).
  // It must be available globally to avoid "ReferenceError: getUserAndStatus is not defined".
  async function getUserAndStatus(supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session || null;
    if (!session) return { session: null, user: null, status: "free" };

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;
    if (!user) return { session, user: null, status: "free" };

    // Preferred: profiles table (RLS-protected), fallback: user metadata.
    // NOTE: On Supabase/PostgREST, selecting columns that do not exist can yield a 400.
    // To be resilient across schema iterations, select(*) and then read fields if present.
    // Also note: is_pro may be a boolean (true/false) depending on how it was written.
    let status = (user?.user_metadata?.subscription_status ?? user?.user_metadata?.is_pro ?? "free");
    let profile = null;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && data) {
        profile = data;

        // If is_pro is true, treat the user as Pro even if subscription_status is stale.
        if (data.is_pro === true) {
          status = "pro";
        } else if (typeof data.subscription_status !== "undefined" && data.subscription_status !== null) {
          status = data.subscription_status;
        } else if (typeof data.is_pro !== "undefined" && data.is_pro !== null) {
          status = data.is_pro;
        }
      }
    } catch (_) { }

    // Normalize to a string status we can consistently use across the UI.
    if (typeof status === "boolean") {
      status = status ? "pro" : "free";
    }
    if (typeof status !== "string") status = String(status ?? "free");
    status = status.toLowerCase();

    return { session, user, status, profile };
  }

  // Expose helpers needed by standalone pages.
  window.getUserAndStatus = getUserAndStatus;

  function renderNav({ user, status }) {
    const host = el("wb-nav-auth");
    if (!host) return;

    // Use an absolute path so it works from /account/ and any nested routes.
    const accountHref = "/account/";
    if (!user) {
      host.innerHTML = `
        <a class="btn btn-secondary btn-sm" href="/login.html">Log In</a>
        <a class="btn btn-primary btn-sm" href="/choose_plan.html">Sign Up</a>
      `;
      return;
    }

    const label = (status === "pro" || status === "active" || status === "subscribed" || status === true) ? "Pro" : "Free";
    host.innerHTML = `
      <a class="btn btn-secondary btn-sm" href="${accountHref}">Account</a>
      ${label === "Free" ? `<a class="btn btn-primary btn-sm" href="/choose_plan.html">Upgrade</a>` : ``}
      <button class="btn btn-ghost btn-sm" id="wb-logout">Log out</button>
    `;

    const btn = el("wb-logout");
    if (btn) btn.addEventListener("click", async () => {
      // Switch UI immediately
      renderNav({ user: null, status: "free" });
      renderWelcome({ user: null, status: "free" });
      setNavReady();
      try { await window.getSupabaseClient().auth.signOut(); } catch (_) { }
      // Optional: keep user on the current page; if you prefer redirect, uncomment next line
      // window.location.href = "index.html";
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

    const label = (status === "pro" || status === "active" || status === "subscribed" || status === true) ? "Pro" : "Free";
    host.innerHTML = `
      <div class="wb-userbar-inner">
        <span>Welcome, <strong>${escapeHtml(display)}</strong></span>
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
      });
    } catch (_) { }
  }

  async function init() {
    if (!window.getSupabaseClient) return;
    const supabase = window.getSupabaseClient();

    const path = (window.location.pathname || "").toLowerCase();

    // 🚫 CRITICAL FIX:
    // Signup + welcome pages are transitional.
    // They must NOT resolve auth state or redirect.
    const isTransitionalPage =
      path.includes("signup") ||
      path.includes("welcome") ||
      path.includes("thank") ||
      path.includes("pro_disclosure") ||
      path.includes("pro_payment");

    if (isTransitionalPage) {
      // Render minimal logged-out UI and STOP
      renderNav({ user: null, status: "free" });
      renderWelcome({ user: null, status: "free" });
      updatePlanPill("free");
      updateStaticUpgradeLink({ user: null, status: "free" });
      setNavReady();
      return;
    }

    // --- NORMAL AUTH FLOW BELOW ---

    const info = await getUserAndStatus(supabase);

    if (info.user) {
      const name =
        info.user.user_metadata?.full_name ||
        info.user.user_metadata?.name ||
        "";
      localStorage.setItem("wb_cached_status", info.status || "free");
      localStorage.setItem("wb_cached_email", info.user.email || "");
      localStorage.setItem("wb_cached_name", name);
    } else {
      localStorage.removeItem("wb_cached_status");
      localStorage.removeItem("wb_cached_email");
      localStorage.removeItem("wb_cached_name");
    }

    renderNav({ user: info.user, status: info.status });
    renderWelcome({ user: info.user, status: info.status });
    updatePlanPill(info.status);
    updateStaticUpgradeLink({ user: info.user, status: info.status });
    setNavReady();
  }

  document.addEventListener("DOMContentLoaded", init);
})();


// --- Signup UX guards ---
function wireSignupGuards(supabase) {
  const path = (window.location.pathname || "").toLowerCase();
  const isSignupPage = path.includes("signup_") || path.includes("choose_plan");
  if (!isSignupPage) return;

  const msg = document.getElementById("wb-signup-msg");

  // If already logged in, prevent creating another account
  supabase.auth.getUser().then(({ data }) => {
    if (data && data.user) {
      if (msg) msg.innerHTML = 'You are already logged in. <a href="/account/">Go to Account</a> or <a href="/choose_plan.html">Upgrade to Pro</a>.';
      // Disable obvious signup submit buttons
      document.querySelectorAll("form button[type='submit'], form input[type='submit']").forEach(btn => {
        btn.setAttribute("disabled", "disabled");
        btn.style.opacity = "0.6";
        btn.title = "You are already logged in.";
      });
      // Disable any "Create free account" style buttons if present
      const freeBtn = document.getElementById("create-free") || document.getElementById("createFree");
      if (freeBtn) {
        freeBtn.setAttribute("disabled", "disabled");
        freeBtn.style.opacity = "0.6";
        freeBtn.title = "You are already logged in.";
      }
    }
  });

  // Helper to show "already registered" message on signup submit
  window.__wbHandleSignupError = function (err) {
    const msg2 = document.getElementById("wb-signup-msg");
    const text = (err && (err.message || err.error_description || err.error)) ? (err.message || err.error_description || err.error) : String(err || "");
    if (/already|exists|registered/i.test(text)) {
      if (msg2) msg2.innerHTML = 'It looks like you already have an account. <a href="login.html">Log in instead</a>.';
      return true;
    }
    return false;
  }
}
