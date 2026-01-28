/**
 * WhiteBox Agency site UI helpers
 * FIXED: robust signup handling for button-click + form-submit
 */

(function () {
  function el(id) { return document.getElementById(id); }

  async function init() {
    if (!window.getSupabaseClient) return;
    const supabase = window.getSupabaseClient();

    try { window.wireSignupGuards?.(supabase); } catch (_) {}
    try { window.wireSignupSubmit?.(supabase); } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", init);
})();


// ---------------- Signup guards ----------------
function wireSignupGuards(supabase){
  const path = (window.location.pathname || "").toLowerCase();
  if (!path.includes("signup") && !path.includes("pro_")) return;

  const msg = document.getElementById("wb-signup-msg");

  supabase.auth.getUser().then(({ data }) => {
    if (data?.user) {
      if (msg) {
        msg.innerHTML =
          'You are already logged in. <a href="/account/">Go to Account</a>.';
      }
      document.querySelectorAll("button").forEach(b => {
        b.disabled = true;
        b.style.opacity = "0.6";
      });
    }
  });

  window.__wbHandleSignupError = function (err) {
    const text = err?.message || "";
    if (/already|exists|registered/i.test(text)) {
      if (msg) {
        msg.innerHTML =
          'You already have an account. <a href="/login.html">Log in instead</a>.';
      }
      return true;
    }
    return false;
  };
}


// ---------------- Signup submit (FIXED) ----------------
function wireSignupSubmit(supabase) {
  const msg = document.getElementById("wb-signup-msg");

  function getValue(id, fallbackName) {
    return (
      document.getElementById(id)?.value ??
      document.querySelector(`[name="${fallbackName}"]`)?.value ??
      ""
    ).trim();
  }

  async function handleSignup() {
    const email = getValue("email", "email");
    const password = getValue("password", "password");
    const confirm = getValue("confirm_password", "confirm");

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
    window.location.href = path.includes("pro")
      ? "/pro_disclosure.html"
      : "/thank_you_free.html";
  }

  // 1️⃣ Support real form submit if present
  document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      handleSignup();
    });
  });

  // 2️⃣ Support button click (YOUR CURRENT CASE)
  document.querySelectorAll("button").forEach(btn => {
    if (/create account/i.test(btn.textContent)) {
      btn.addEventListener("click", e => {
        e.preventDefault();
        handleSignup();
      });
    }
  });
}


// expose explicitly
window.wireSignupGuards = wireSignupGuards;
window.wireSignupSubmit = wireSignupSubmit;