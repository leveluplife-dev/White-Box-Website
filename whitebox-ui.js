/**
 * WhiteBox Agency site UI helpers
 * - Shows login state in nav
 * - Displays "Welcome <name>" + subscription status when placeholders exist
 * - Provides simple account actions (logout)
 *
 * Requires:
 *  - js/supabase-config.js
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
    if (!user) {
      link.style.display = "";
      return;
    }
    const isPro = (status === "pro" || status === "active" || status === "subscribed" || status === true);
    link.style.display = isPro ? "none" : "";
  }

  async function getUserAndStatus(supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session || null;
    if (!session) return { session: null, user: null, status: "free" };

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;
    if (!user) return { session, user: null, status: "free" };

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
        if (data.is_pro === true) {
          status = "pro";
        } else if (typeof data.subscription_status !== "undefined") {
          status = data.subscription_status;
        }
      }
    } catch (_) {}

    if (typeof status === "boolean") status = status ? "pro" : "free";
    status = String(status || "free").toLowerCase();

    return { session, user, status, profile };
  }

  window.getUserAndStatus = getUserAndStatus;

  function renderNav({ user, status }) {
    const host = el("wb-nav-auth");
    if (!host) return;

    if (!user) {
      host.innerHTML = `
        <a class="btn btn-secondary btn-sm" href="/login.html">Log In</a>
        <a class="btn btn-primary btn-sm" href="/choose_plan.html">Sign Up</a>
      `;
      return;
    }

    const isPro = (status === "pro" || status === "active" || status === "subscribed");
    host.innerHTML = `
      <a class="btn btn-secondary btn-sm" href="/account/">Account</a>
      ${!isPro ? `<a class="btn btn-primary btn-sm" href="/choose_plan.html">Upgrade</a>` : ``}
      <button class="btn btn-ghost btn-sm" id="wb-logout">Log out</button>
    `;

    const btn = el("wb-logout");
    if (btn) btn.addEventListener("click", async () => {
      renderNav({ user: null, status: "free" });
      try { await window.getSupabaseClient().auth.signOut(); } catch (_) {}
    });
  }

  function renderWelcome({ user }) {
    const host = el("wb-userbar");
    if (!host || !user) return;
    const name = user.user_metadata?.full_name || user.email;
    host.innerHTML = `Welcome, <strong>${name}</strong>`;
  }

  async function ensureProfileExists(supabase, user) {
    try {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
      });
    } catch (_) {}
  }

  async function init() {
    if (!window.getSupabaseClient) return;
    const supabase = window.getSupabaseClient();

    renderNav({ user: null, status: "free" });
    updatePlanPill("free");
    updateStaticUpgradeLink({ user: null, status: "free" });
    setNavReady();

    // ✅ FIX: call via window to support module/defer loading
    try { window.wireSignupGuards?.(supabase); } catch (_) {}
    try { window.wireSignupSubmit?.(supabase); } catch (_) {}

    const info = await getUserAndStatus(supabase);
    if (info.user) await ensureProfileExists(supabase, info.user);

    renderNav({ user: info.user, status: info.status });
    renderWelcome({ user: info.user, status: info.status });
    updatePlanPill(info.status);
    updateStaticUpgradeLink({ user: info.user, status: info.status });
  }

  document.addEventListener("DOMContentLoaded", init);
})();


// --- Signup UX guards ---
function wireSignupGuards(supabase){
  const path = (window.location.pathname || "").toLowerCase();
  const isSignupPage = path.includes("signup_") || path.includes("choose_plan");
  if (!isSignupPage) return;

  const msg = document.getElementById("wb-signup-msg");

  supabase.auth.getUser().then(({data})=>{
    if (data && data.user){
      if (msg) msg.innerHTML = 'You are already logged in. <a href="/account/">Go to Account</a>.';
      document.querySelectorAll("form button[type='submit']").forEach(btn=>{
        btn.disabled = true;
        btn.style.opacity = "0.6";
      });
    }
  });

  window.__wbHandleSignupError = function(err){
    const text = err?.message || "";
    if (/already|exists|registered/i.test(text)){
      if (msg) msg.innerHTML = 'You already have an account. <a href="/login.html">Log in instead</a>.';
      return true;
    }
    return false;
  }
}


// --- ACTUAL SIGNUP HANDLER ---
function wireSignupSubmit(supabase) {
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;
    const confirm = document.getElementById("confirm_password")?.value;
    const msg = document.getElementById("wb-signup-msg");

    if (!email || !password || password !== confirm) {
      if (msg) msg.textContent = "Please check your inputs.";
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      if (window.__wbHandleSignupError?.(error)) return;
      if (msg) msg.textContent = error.message;
      return;
    }

    const path = window.location.pathname.toLowerCase();
    window.location.href = path.includes("paid") || path.includes("pro")
      ? "/pro_disclosure.html"
      : "/thank_you_free.html";
  });
}


// ✅ FIX: explicitly expose for module/defer environments
window.wireSignupGuards = wireSignupGuards;
window.wireSignupSubmit = wireSignupSubmit;