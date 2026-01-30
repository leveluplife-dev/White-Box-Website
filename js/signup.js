// js/signup.js
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form[data-signup]");
    if (!form) return;

    const supabase = window.getSupabaseClient?.();
    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    const statusMsg = document.getElementById("statusMsg");
    const submitBtn = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      submitBtn.disabled = true;
      statusMsg.textContent = "Creating account…";

      const email = form.email.value.trim();
      const password = form.password.value;

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          statusMsg.textContent = error.message;
          submitBtn.disabled = false;
          return;
        }

        // Decide redirect based on page type
        const flow = form.dataset.signup;
        if (flow === "free") {
          window.location.href = "/thank_you_free.html";
        } else {
          window.location.href = "/pro_disclosure.html";
        }
      } catch (err) {
        console.error(err);
        statusMsg.textContent = "Unexpected error. Please try again.";
        submitBtn.disabled = false;
      }
    });
  });
})();