/* user_credentials.js - dynamic credential generator */
(() => {
  if (window.__CRED_INIT__) return;
  window.__CRED_INIT__ = true;

  const ready = (cb) =>
    document.readyState !== "loading"
      ? cb()
      : document.addEventListener("DOMContentLoaded", cb);

  ready(() => {
    const overlay = document.getElementById("overlay");
    const modal = document.getElementById("cred-modal");
    const openBtns = [
      document.getElementById("generateCredsBtnSidebar"),
      document.getElementById("generateCredsBtnQuick"),
    ].filter(Boolean);
    const closeBtn = document.getElementById("closeCredModal");
    const countInput = document.getElementById("credCount");
    const generateBtn = document.getElementById("generateNowBtn");
    const quickBtns = document.querySelectorAll(".quick-gen-btn");
    const results = document.getElementById("credResults");
    const instruction = document.getElementById("credInstruction");

    function show(el) { el?.classList.remove("hidden"); }
    function hide(el) { el?.classList.add("hidden"); }

    function openModal() {
      console.log("[user_credentials] Opening modal");
      show(modal); show(overlay);
    }
    function closeModal() {
      console.log("[user_credentials] Closing modal");
      hide(modal); hide(overlay);
      results.innerHTML = "";
      hide(instruction);
    }

    // Copy utility
    function bindCopy(btn, input) {
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(input.value);
          btn.textContent = "✅ Copied";
          setTimeout(() => (btn.textContent = "📋"), 1500);
        } catch {
          btn.textContent = "❌";
        }
      });
    }

    // Mark issued
    async function markIssued(username, btn) {
      try {
        const res = await fetch("/mark_issued", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username] }),
        });
        const data = await res.json();
        if (data.success) {
          btn.textContent = "✅ Issued";
          btn.disabled = true;
        }
      } catch (err) {
        console.error("[user_credentials] Mark issued failed:", err);
      }
    }

    // Generate request
    async function generateCreds(count) {
      console.log("[user_credentials] Requesting", count, "credentials");
      try {
        const res = await fetch("/generate_credentials", {
          method: "POST",
          body: new URLSearchParams({ count }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        results.innerHTML = "";
        show(instruction);

        data.credentials.forEach((cred, i) => {
          const card = document.createElement("div");
          card.className = "cred-card animate-fadeIn";
          card.innerHTML = `
            <div class="font-medium text-navy mb-2">Credential ${i + 1}</div>
            <div class="cred-field">
              <input type="password" value="${cred.username}" readonly />
              <button class="view-btn">👁</button>
              <button class="copy-btn">📋</button>
            </div>
            <div class="cred-field">
              <input type="password" value="${cred.password}" readonly />
              <button class="view-btn">👁</button>
              <button class="copy-btn">📋</button>
            </div>
            <div class="mt-2">
              <button class="issue-btn btn-sm ${cred.issued ? "disabled" : ""}">
                ${cred.issued ? "✅ Issued" : "Mark Issued"}
              </button>
            </div>
          `;
          results.appendChild(card);

          // Toggle view
          card.querySelectorAll(".view-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
              const input = btn.previousElementSibling;
              input.type = input.type === "password" ? "text" : "password";
            });
          });

          // Copy
          card.querySelectorAll(".copy-btn").forEach((btn, idx) => {
            const input = card.querySelectorAll("input")[idx];
            bindCopy(btn, input);
          });

          // Mark issued
          const issueBtn = card.querySelector(".issue-btn");
          if (!cred.issued) {
            issueBtn.addEventListener("click", () =>
              markIssued(cred.username, issueBtn)
            );
          }
        });
      } catch (err) {
        console.error("[user_credentials] Error:", err);
        results.innerHTML = `<div class="text-red-600">${err.message}</div>`;
      }
    }

    // Event listeners
    openBtns.forEach((btn) => btn.addEventListener("click", openModal));
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (overlay) overlay.addEventListener("click", closeModal);

    // Main generate (custom count, min 4)
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        const count = Math.max(4, parseInt(countInput.value || "4"));
        generateCreds(count);
      });
    }

    // Quick generate (1, 2, 3)
    quickBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const count = parseInt(btn.dataset.count, 10);
        generateCreds(count);
      });
    });

    console.log("[user_credentials] Credential modal initialized");
  });
})();
