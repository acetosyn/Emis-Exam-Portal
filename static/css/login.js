/* ================================
   Admin Login Script
   ================================ */

(() => {
  const ready = (cb) =>
    document.readyState !== "loading"
      ? cb()
      : document.addEventListener("DOMContentLoaded", cb);

  ready(() => {
    const form = document.getElementById("adminLoginForm");
    const overlay = document.getElementById("loadingOverlay");
    const toggleBtns = document.querySelectorAll(".toggle-password");

    // Password visibility toggle
    toggleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        if (!input) return;

        if (input.type === "password") {
          input.type = "text";
          btn.textContent = "🙈";
        } else {
          input.type = "password";
          btn.textContent = "👁";
        }
      });
    });

    // Handle form submit
    if (form) {
      form.addEventListener("submit", () => {
        if (overlay) {
          overlay.classList.remove("hidden");
        }
      });
    }
  });
})();
