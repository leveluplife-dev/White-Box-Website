/**
 * WhiteBox Agency site UI helpers
 * TEMPORARY DEBUG INSTRUMENTATION ENABLED
 * Search for "WB_DEBUG" to remove all debug code later
 */

(function () {

  // WB_DEBUG: prove script execution
  console.log("WB_DEBUG 🚨 whitebox-ui.js EXECUTED");

  function el(id) {
    return document.getElementById(id);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // WB_DEBUG: prove DOM readiness
    console.log("WB_DEBUG 🚨 DOMContentLoaded fired");

    // WB_DEBUG: list all buttons
    const buttons = document.querySelectorAll("button");
    console.log("WB_DEBUG 🚨 buttons found:", buttons.length, buttons);

    // WB_DEBUG: list all forms
    const forms = document.querySelectorAll("form");
    console.log("WB_DEBUG 🚨 forms found:", forms.length, forms);

    // WB_DEBUG: attach click logger to all buttons
    buttons.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        console.log(`WB_DEBUG 🚨 button[${i}] CLICKED`, btn.textContent);
      });
    });

    // WB_DEBUG: attach submit logger to all forms
    forms.forEach((form, i) => {
      form.addEventListener("submit", () => {
        console.log(`WB_DEBUG 🚨 form[${i}] SUBMIT event fired`);
      });
    });

    // WB_DEBUG: check Supabase availability
    console.log("WB_DEBUG 🚨 window.getSupabaseClient:", window.getSupabaseClient);
    console.log("WB_DEBUG 🚨 window.supabase:", window.supabase);

    init();
  });

  async function init() {
    // WB_DEBUG: init entered
    console.log("WB_DEBUG 🚨 init() entered");

    if (!window.getSupabaseClient) {
      console.warn("WB_DEBUG ⚠️ getSupabaseClient not found");
      return;
    }

    const supabase = window.getSupabaseClient();

    // WB_DEBUG: Supabase client resolved
    console.log("WB_DEBUG 🚨 Supabase client:", supabase);

    try {
      window.wireSignupGuards?.(supabase);
      console.log("WB_DEBUG 🚨 wireSignupGuards attached");
    } catch (e) {
      console.error("WB_DEBUG ❌ wireSignupGuards error", e);
    }

    try {
      window.wireSignupSubmit?.(supabase);
      console.log("WB_DEBUG 🚨 wireSignupSubmit attached");
    } catch (e) {
      console.error("WB_DEBUG ❌ wireSignupSubmit error", e);
    }
  }

})();


// ---------------- Signup guards ----------------
function wireSignupGuards(supabase) {
  // WB_DEBUG
  console.log("WB_DEBUG 🚨 wireSignupGuards() called");

  const path = (window.location.pathname || "").toLowerCase();
  if (!path.includes("signup") && !path.includes("pro_")) return;

  const msg = document.getElementById("wb-signup-msg");

  supabase.auth.getUser().then(({ data }) => {
    // WB_DEBUG
    console.log("WB_DEBUG 🚨 auth.getUser()", data);

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
    // WB_DEBUG
    console.log("WB_DEBUG 🚨 signup error handler:", err);

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


// ---------------- Signup submit ----------------
function wireSignupSubmit(supabase) {
  // WB_DEBUG
  console.log("WB_DEBUG 🚨 wireSignupSubmit() called");

  const msg = document.getElementById("wb-signup-msg");

  function getValue(id, fallbackName) {
    const value =
      document.getElementById(id)?.value ??
      document.querySelector(`[name="${fallbackName}"]`)?.value ??
      "";

    // WB_DEBUG
    console.log(`WB_DEBUG 🚨 getValue(${id}/${fallbackName}) =`, value);

    return value.trim();
  }

  async function handleSignup() {
    // WB_DEBUG
    console.log("WB_DEBUG 🚨 handleSignup() invoked");

    const email = getValue("email", "email");
    const password = getValue("password", "password");
    const confirm = getValue("confirm_password", "confirm");

    if (!email || !password || password !== confirm) {
      console.warn("WB_DEBUG ⚠️ input validation failed");
      if (msg) msg.textContent = "Please check your inputs.";
      return;
    }

    // WB_DEBUG
    console.log("WB_DEBUG 🚨 calling supabase.auth.signUp", email);

    const { data, error } = await supabase.auth.signUp({ email, password });

    // WB_DEBUG
    console.log("WB_DEBUG 🚨 signup result", { data, error });

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

  // WB_DEBUG: form submit wiring
  document.querySelectorAll("form").forEach((form, i) => {
    console.log(`WB_DEBUG 🚨 attaching submit handler to form[${i}]`);
    form.addEventListener("submit", e => {
      e.preventDefault();
      handleSignup();
    });
  });

  // WB_DEBUG: button click wiring
  document.querySelectorAll("button").forEach((btn, i) => {
    if (/create account/i.test(btn.textContent)) {
      console.log(`WB_DEBUG 🚨 attaching click handler to button[${i}]`);
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