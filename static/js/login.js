document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#adminLoginForm") || document.querySelector("#userLoginForm");
  const overlay = document.querySelector(".loading-overlay");

  // ================= PASSWORD TOGGLE =================
  document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);

      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
      } else {
        input.type = "password";
        btn.textContent = "👁️";
      }
    });
  });

  // ================= FORM SUBMIT =================
  if (form) {
    form.addEventListener("submit", (e) => {
      const inputs = form.querySelectorAll("input, select");
      let valid = true;

      inputs.forEach(i => {
        if (!i.value.trim()) valid = false;
      });

      if (!valid) {
        e.preventDefault(); // stop form from submitting
        showToast("⚠️ Please fill in all fields", "error");
        return;
      }

      // Show loading overlay while backend processes
      if (overlay) overlay.classList.remove("hidden");

      // No redirect logic here → Flask will handle validation and redirect
    });
  }
});

// ================= TOAST FUNCTION =================
function showToast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
