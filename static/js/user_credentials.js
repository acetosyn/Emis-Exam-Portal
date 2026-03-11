/* ==========================================================
   user_credentials.js — EMIS Admin v3
   Fixes:
   - modal opens correctly
   - quick buttons use 1..5
   - custom count works
   - generate button works reliably
   - no default 10 from JS
========================================================== */

(() => {
  if (window.__CRED_INIT__) return;
  window.__CRED_INIT__ = true;

  const ready = (cb) =>
    document.readyState !== "loading"
      ? cb()
      : document.addEventListener("DOMContentLoaded", cb);

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  ready(() => {
    const modal = document.getElementById("cred-modal");
    const closeBtn = document.getElementById("closeCredModal");
    const countInput = document.getElementById("credCount");
    const generateBtn = document.getElementById("generateNowBtn");
    const quickBtns = qsa(".quick-gen-btn", modal || document);
    const results = document.getElementById("credResults");
    const instruction = document.getElementById("credInstruction");
    const summary = document.getElementById("credSummary");
    const csvBtn = document.getElementById("downloadCSVBtn");

    const openBtns = [
      document.getElementById("generateCredsBtnSidebar"),
      document.getElementById("generateCredsBtnQuick"),
    ].filter(Boolean);

    if (!modal || !results || !generateBtn || !countInput) {
      console.warn("[user_credentials] modal elements missing");
      return;
    }

    let latestCredentials = [];
    let isGenerating = false;

    function toast(message, type = "info") {
      if (typeof window.showToast === "function") {
        window.showToast(message, type);
        return;
      }

      const el = document.createElement("div");
      el.className = `toast toast-${type}`;
      el.textContent = message;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add("visible"));
      setTimeout(() => {
        el.classList.remove("visible");
        setTimeout(() => el.remove(), 300);
      }, 2400);
    }

    function show(el) {
      el?.classList.remove("hidden");
    }

    function hide(el) {
      el?.classList.add("hidden");
    }

    function escapeHtml(str = "") {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function openModal() {
      show(modal);
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      hide(modal);
      modal.style.display = "";
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    function setLoadingState(state) {
      isGenerating = state;
      generateBtn.disabled = state;
      generateBtn.textContent = state ? "Generating..." : "⚙️ Generate";

      quickBtns.forEach((btn) => {
        btn.disabled = state;
      });
    }

    function renderLoading(count) {
      results.innerHTML = `
        <div class="empty-state compact-empty">
          <div class="empty-state-icon">⏳</div>
          <p class="muted">Generating ${count} credential${count > 1 ? "s" : ""}...</p>
        </div>
      `;
    }

    function renderError(message) {
      results.innerHTML = `
        <div class="empty-state compact-empty">
          <div class="empty-state-icon">⚠️</div>
          <p class="muted">${escapeHtml(message)}</p>
        </div>
      `;
    }

    function downloadCSV(creds) {
      if (!Array.isArray(creds) || !creds.length) {
        toast("No credentials to download", "error");
        return;
      }

      const rows = [
        ["username", "password", "subject", "issued"],
        ...creds.map((c) => [
          c.username || "",
          c.password || "",
          c.subject || "",
          c.issued ? "yes" : "no",
        ]),
      ];

      const csv = rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "generated_credentials.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast("CSV downloaded", "success");
    }

    async function copyText(btn, value) {
      const original = btn.textContent;
      try {
        await navigator.clipboard.writeText(value);
        btn.textContent = "✅";
        toast("Copied", "success");
      } catch (err) {
        console.error("[user_credentials] copy failed:", err);
        btn.textContent = "❌";
        toast("Copy failed", "error");
      } finally {
        setTimeout(() => {
          btn.textContent = original;
        }, 700);
      }
    }

    function bindViewToggle(btn, input) {
      btn.addEventListener("click", () => {
        const hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        btn.textContent = hidden ? "🙈" : "👁";
      });
    }

    async function markIssued(username, btn) {
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Saving...";

      try {
        const res = await fetch("/mark_issued", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username] }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to mark as issued");
        }

        btn.textContent = "✅ Issued";
        btn.classList.add("disabled");

        latestCredentials = latestCredentials.map((cred) =>
          cred.username === username ? { ...cred, issued: true } : cred
        );

        toast(`${username} marked issued`, "success");
      } catch (err) {
        console.error("[user_credentials] markIssued failed:", err);
        btn.disabled = false;
        btn.textContent = original;
        toast(err.message || "Failed to mark issued", "error");
      }
    }

    function renderCredentialCard(cred, index) {
      const card = document.createElement("div");
      card.className = "cred-card animate-fadeIn";

      const username = cred.username || "";
      const password = cred.password || "";
      const issued = Boolean(cred.issued);

      card.innerHTML = `
        <div class="cred-card-header">
          <div class="cred-card-title">Credential ${index + 1}</div>
          <span class="cred-badge">${issued ? "Issued" : "New"}</span>
        </div>

        <div class="cred-field">
          <input type="password" value="${escapeHtml(username)}" readonly />
          <button type="button" class="view-btn">👁</button>
          <button type="button" class="copy-btn">📋</button>
        </div>

        <div class="cred-field" style="margin-top:.5rem;">
          <input type="password" value="${escapeHtml(password)}" readonly />
          <button type="button" class="view-btn">👁</button>
          <button type="button" class="copy-btn">📋</button>
        </div>

        <div style="margin-top:.65rem; display:flex; justify-content:flex-end;">
          <button type="button" class="issue-btn ${issued ? "disabled" : ""}" ${issued ? "disabled" : ""}>
            ${issued ? "✅ Issued" : "Mark Issued"}
          </button>
        </div>
      `;

      const [uInput, pInput] = qsa("input", card);
      const [uView, pView] = qsa(".view-btn", card);
      const [uCopy, pCopy] = qsa(".copy-btn", card);
      const issueBtn = qs(".issue-btn", card);

      if (uView) bindViewToggle(uView, uInput);
      if (pView) bindViewToggle(pView, pInput);

      if (uCopy) uCopy.addEventListener("click", () => copyText(uCopy, uInput.value));
      if (pCopy) pCopy.addEventListener("click", () => copyText(pCopy, pInput.value));

      if (issueBtn && !issued) {
        issueBtn.addEventListener("click", () => markIssued(username, issueBtn));
      }

      return card;
    }

    function renderCredentials(creds) {
      results.innerHTML = "";

      if (!Array.isArray(creds) || creds.length === 0) {
        renderError("No credentials were returned.");
        hide(instruction);
        hide(summary);
        hide(csvBtn);
        return;
      }

      creds.forEach((cred, index) => {
        results.appendChild(renderCredentialCard(cred, index));
      });

      summary.textContent = `✅ Generated ${creds.length} credential${creds.length > 1 ? "s" : ""} successfully.`;
      show(summary);
      show(instruction);
      show(csvBtn);
    }

    async function generateCreds(count) {
      if (isGenerating) return;

      const safeCount = Math.max(1, parseInt(count || "1", 10) || 1);
      countInput.value = safeCount;

      setLoadingState(true);
      renderLoading(safeCount);
      hide(instruction);
      hide(summary);
      hide(csvBtn);

      try {
        const res = await fetch("/generate_credentials", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: new URLSearchParams({
            count: safeCount,
            prefix: "candidate",
            pwd_length: 8,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate credentials");

        const credentials = Array.isArray(data.credentials) ? data.credentials : [];
        latestCredentials = credentials;
        renderCredentials(credentials);
        toast("Credentials generated", "success");
      } catch (err) {
        console.error("[user_credentials] generate failed:", err);
        renderError(err.message || "Generation failed");
        toast(err.message || "Generation failed", "error");
      } finally {
        setLoadingState(false);
      }
    }

    openBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
      });
    });

    closeBtn?.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        closeModal();
      }
    });

    generateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      generateCreds(countInput.value);
    });

    quickBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const count = parseInt(btn.dataset.count || btn.textContent.trim(), 10) || 1;
        generateCreds(count);
      });
    });

    csvBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      downloadCSV(latestCredentials);
    });

    window.openCredentialModal = openModal;
    window.closeCredentialModal = closeModal;
    window.generateCredentialsFromAdmin = generateCreds;

    console.log("[user_credentials] v3 initialized");
  });
})();