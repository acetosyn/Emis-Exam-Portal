/* user-credential.js
   Handles dynamic popup for generated user credentials
*/

(() => {
  if (window.__USER_CREDENTIALS_INIT__) return;
  window.__USER_CREDENTIALS_INIT__ = true;

  const ready = (cb) =>
    document.readyState !== "loading"
      ? cb()
      : document.addEventListener("DOMContentLoaded", cb);

  function showCredentials(creds) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "cred-overlay";

    // Create modal card
    const modal = document.createElement("div");
    modal.className = "cred-modal scale-in";

    modal.innerHTML = `
      <div class="cred-head">
        <h3>Generated Credentials</h3>
        <button class="cred-close" aria-label="Close">&times;</button>
      </div>
      <div class="cred-body">
        ${creds
          .map(
            (c) => `
          <div class="cred-card">
            <div class="cred-row">
              <span class="cred-label">Username:</span>
              <span class="cred-value">${c.username}</span>
              <button class="cred-copy" data-value="${c.username}">📋</button>
            </div>
            <div class="cred-row">
              <span class="cred-label">Password:</span>
              <span class="cred-value cred-pass hidden">${c.password}</span>
              <span class="cred-dots">•••••</span>
              <button class="cred-toggle">👁</button>
              <button class="cred-copy" data-value="${c.password}">📋</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="cred-foot">
        <button class="cred-close-btn">Close</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close logic
    modal.querySelectorAll(".cred-close, .cred-close-btn").forEach((btn) =>
      btn.addEventListener("click", () => overlay.remove())
    );

    // Copy buttons
    modal.querySelectorAll(".cred-copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-value");
        navigator.clipboard.writeText(val).then(() => {
          btn.textContent = "✅";
          setTimeout(() => (btn.textContent = "📋"), 1000);
        });
      });
    });

    // Toggle password visibility
    modal.querySelectorAll(".cred-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".cred-row");
        const passEl = row.querySelector(".cred-pass");
        const dotsEl = row.querySelector(".cred-dots");
        const isHidden = passEl.classList.contains("hidden");

        passEl.classList.toggle("hidden", !isHidden);
        dotsEl.classList.toggle("hidden", isHidden);
      });
    });
  }

  function initGenerateHandler() {
    const btn = document.getElementById("autoCredsBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const response = await fetch("/generate_credentials", {
        method: "POST",
        body: new URLSearchParams({ count: 1 }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const creds = await response.json();
      if (creds && creds.length > 0) {
        showCredentials(creds);
      }
    });
  }

  // Init
  ready(() => {
    initGenerateHandler();
  });
})();
