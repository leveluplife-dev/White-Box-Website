// Simple mobile nav toggle for WhiteBox site
(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    const btn = document.getElementById("wb-nav-toggle");
    const links = document.getElementById("wb-nav-links");
    if (!btn || !links) return;

    function setOpen(open) {
      document.body.classList.toggle("wb-nav-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    btn.addEventListener("click", function () {
      const isOpen = document.body.classList.contains("wb-nav-open");
      setOpen(!isOpen);
    });

    // Close menu when a nav link is clicked (mobile UX)
    links.addEventListener("click", function (e) {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (a && document.body.classList.contains("wb-nav-open")) setOpen(false);
    });

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    // If we resize to desktop, ensure menu is closed
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 820) setOpen(false);
    });
  });
})();