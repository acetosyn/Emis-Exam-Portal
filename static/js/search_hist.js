// ==========================================================
// search_hist.js — EMIS Admin v2
// Dynamic document history + upload panel search
// Matches new admin.html / admin.css
// ==========================================================
(() => {
  if (window.__SEARCH_HIST_INIT__) return;
  window.__SEARCH_HIST_INIT__ = true;

  const ready = (cb) =>
    document.readyState !== "loading"
      ? cb()
      : document.addEventListener("DOMContentLoaded", cb);

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ----------------------------------------------------------
  // Toast
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  function formatBytes(bytes) {
    if (bytes === null || bytes === undefined || bytes === "") return "";
    const num = Number(bytes);
    if (Number.isNaN(num) || num < 0) return "";

    if (num === 0) return "0 B";

    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(num) / Math.log(1024)), sizes.length - 1);
    const value = num / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  function escapeHtml(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function debounce(fn, ms = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function getFileIcon(ext = "") {
    const e = ext.toLowerCase();
    if (e === "pdf") return "📕";
    if (e === "doc" || e === "docx") return "📄";
    if (e === "xls" || e === "xlsx" || e === "csv") return "📊";
    if (e === "ppt" || e === "pptx") return "📽️";
    if (e === "jpg" || e === "jpeg" || e === "png" || e === "webp") return "🖼️";
    return "📁";
  }

  function getBadgeClass(ext = "") {
    const e = ext.toLowerCase();
    if (e === "pdf") return "pdf";
    if (e === "doc" || e === "docx") return "doc";
    if (e === "xls" || e === "xlsx" || e === "csv") return "sheet";
    return "file";
  }

  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------
  let cachedDocs = [];
  let hasLoadedOnce = false;
  let isLoading = false;

  // ----------------------------------------------------------
  // UI render helpers
  // ----------------------------------------------------------
  function renderLoading(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="doc-card">
        <div class="skeleton" style="height:18px; width:60%; margin-bottom:12px;"></div>
        <div class="skeleton" style="height:12px; width:75%; margin-bottom:16px;"></div>
        <div class="skeleton" style="height:86px; width:100%; margin-bottom:14px;"></div>
        <div class="skeleton" style="height:36px; width:100%;"></div>
      </div>
      <div class="doc-card">
        <div class="skeleton" style="height:18px; width:55%; margin-bottom:12px;"></div>
        <div class="skeleton" style="height:12px; width:70%; margin-bottom:16px;"></div>
        <div class="skeleton" style="height:86px; width:100%; margin-bottom:14px;"></div>
        <div class="skeleton" style="height:36px; width:100%;"></div>
      </div>
      <div class="doc-card">
        <div class="skeleton" style="height:18px; width:58%; margin-bottom:12px;"></div>
        <div class="skeleton" style="height:12px; width:65%; margin-bottom:16px;"></div>
        <div class="skeleton" style="height:86px; width:100%; margin-bottom:14px;"></div>
        <div class="skeleton" style="height:36px; width:100%;"></div>
      </div>
    `;
  }

  function renderEmpty(container, message = "No documents found.") {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state compact-empty" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📂</div>
        <p class="muted">${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderList(container, list) {
    if (!container) return;

    if (!Array.isArray(list) || list.length === 0) {
      renderEmpty(container, "No documents found.");
      return;
    }

    const html = list
      .map((doc) => {
        const name = doc.name || "Untitled document";
        const safeName = escapeHtml(name);
        const ext = (doc.ext || "").toLowerCase();
        const safeExt = escapeHtml(ext || "file");
        const icon = getFileIcon(ext);
        const badgeClass = getBadgeClass(ext);
        const size = formatBytes(doc.size);
        const dt = doc.mtime_str || doc.updated_at || "";
        const url = doc.url || "#";
        const previewable = ext === "pdf";

        return `
          <div class="doc-card" data-name="${escapeHtml(name.toLowerCase())}">
            <div class="doc-card-header">
              <span class="doc-badge ${badgeClass}">${safeExt.toUpperCase()}</span>
              <button class="doc-menu" type="button" aria-label="Document options">⋮</button>
            </div>

            <h4 class="doc-title" title="${safeName}">${safeName}</h4>

            <p class="doc-meta">
              ${size ? `<span>${escapeHtml(size)}</span>` : ""}
              ${size && dt ? `<span>•</span>` : ""}
              ${dt ? `<span>${escapeHtml(dt)}</span>` : ""}
            </p>

            <div class="doc-preview ${previewable ? "" : "doc-preview--static"}">
              ${
                previewable
                  ? `
                  <button class="modern-btn modern-btn-secondary preview-btn" type="button" data-url="${escapeHtml(url)}">
                    Preview
                  </button>
                  <div class="preview-frame hidden"></div>
                `
                  : `
                  <div class="doc-preview-placeholder">
                    <span style="font-size: 1.4rem;">${icon}</span>
                    <span>Preview not available</span>
                  </div>
                `
              }
            </div>

            <div class="doc-actions">
              <a class="modern-btn modern-btn-primary open-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">
                Open
              </a>
              <button class="modern-btn modern-btn-secondary copy-btn" type="button" data-url="${escapeHtml(url)}">
                Copy Link
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    container.innerHTML = html;

    bindCardActions(container);
  }

  function bindCardActions(container) {
    // copy
    qsa(".copy-btn", container).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const url = btn.dataset.url;
        if (!url) return;

        try {
          await navigator.clipboard.writeText(url);
          const original = btn.textContent;
          btn.textContent = "Copied";
          toast("Link copied", "success");
          setTimeout(() => {
            btn.textContent = original;
          }, 1200);
        } catch (err) {
          console.error("[search_hist] copy failed:", err);
          toast("Failed to copy link", "error");
        }
      });
    });

    // preview toggle
    qsa(".preview-btn", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const wrap = btn.closest(".doc-preview");
        const frameWrap = qs(".preview-frame", wrap);
        const url = btn.dataset.url;
        if (!frameWrap || !url) return;

        const isHidden = frameWrap.classList.contains("hidden");

        if (isHidden) {
          frameWrap.innerHTML = `
            <iframe
              src="${url}#toolbar=0&navpanes=0&scrollbar=0"
              class="w-full"
              style="width:100%; height:180px; border:1px solid #d7e2ee; border-radius:14px; background:#fff;"
              title="PDF preview"
              loading="lazy">
            </iframe>
          `;
          frameWrap.classList.remove("hidden");
          btn.textContent = "Hide Preview";
        } else {
          frameWrap.innerHTML = "";
          frameWrap.classList.add("hidden");
          btn.textContent = "Preview";
        }
      });
    });
  }

  function filterLocalDocs(term) {
    const normalized = (term || "").trim().toLowerCase();

    if (!normalized) return cachedDocs;

    return cachedDocs.filter((doc) => {
      const name = (doc.name || "").toLowerCase();
      const ext = (doc.ext || "").toLowerCase();
      const mtime = (doc.mtime_str || "").toLowerCase();
      return (
        name.includes(normalized) ||
        ext.includes(normalized) ||
        mtime.includes(normalized)
      );
    });
  }

  // ----------------------------------------------------------
  // API
  // ----------------------------------------------------------
  async function fetchDocs(q = "") {
    const url = q ? `/documents?q=${encodeURIComponent(q)}` : "/documents";
    const res = await fetch(url, {
      headers: { "X-Requested-With": "fetch" },
    });

    if (!res.ok) {
      throw new Error(`Load failed (${res.status})`);
    }

    const data = await res.json();
    return Array.isArray(data.documents) ? data.documents : [];
  }

  // ----------------------------------------------------------
  // Loader
  // ----------------------------------------------------------
  async function loadAll(container, { force = false, silent = false } = {}) {
    if (!container) return;
    if (isLoading) return;
    if (hasLoadedOnce && !force) {
      renderList(container, cachedDocs);
      return;
    }

    isLoading = true;
    renderLoading(container);

    try {
      const docs = await fetchDocs("");
      cachedDocs = docs;
      hasLoadedOnce = true;
      renderList(container, cachedDocs);
      if (!silent) toast("Documents loaded", "success");
    } catch (err) {
      console.error("[search_hist] loadAll failed:", err);
      cachedDocs = [];
      renderEmpty(container, "Could not load documents.");
      toast("Could not load documents", "error");
    } finally {
      isLoading = false;
    }
  }

  async function remoteSearch(container, term) {
    if (!container) return;

    const clean = (term || "").trim();

    if (!clean) {
      renderList(container, cachedDocs);
      return;
    }

    try {
      const docs = await fetchDocs(clean);
      renderList(container, docs);
    } catch (err) {
      console.error("[search_hist] remote search failed:", err);
      renderEmpty(container, "Search failed.");
      toast("Search failed", "error");
    }
  }

  // ----------------------------------------------------------
  // Init
  // ----------------------------------------------------------
  ready(() => {
    const docList = document.getElementById("docList");
    const input = document.getElementById("docSearch");
    const clearBtn = document.getElementById("clearHistoryBtn");
    const uploadsPanel = document.getElementById("panel-uploads");

    if (!docList || !uploadsPanel) return;

    // initial if uploads already active
    if (uploadsPanel.classList.contains("is-active")) {
      loadAll(docList, { silent: true });
    }

    // route observer
    const observer = new MutationObserver(() => {
      if (uploadsPanel.classList.contains("is-active")) {
        loadAll(docList, { silent: true });
      }
    });

    observer.observe(uploadsPanel, { attributes: true, attributeFilter: ["class"] });

    // local filter first, remote fallback after debounce
    const debouncedSearch = debounce(async () => {
      const term = input?.value || "";

      if (!term.trim()) {
        renderList(docList, cachedDocs);
        return;
      }

      const local = filterLocalDocs(term);
      if (local.length > 0) {
        renderList(docList, local);
      } else {
        await remoteSearch(docList, term);
      }
    }, 260);

    input?.addEventListener("input", debouncedSearch);

    clearBtn?.addEventListener("click", () => {
      if (input) input.value = "";
      renderEmpty(docList, "History cleared.");
      const reloadWrap = document.createElement("div");
      reloadWrap.style.gridColumn = "1 / -1";
      reloadWrap.style.display = "flex";
      reloadWrap.style.justifyContent = "center";
      reloadWrap.style.marginTop = ".25rem";
      reloadWrap.innerHTML = `
        <button id="reloadHistoryBtn" class="modern-btn modern-btn-secondary" type="button">
          Reload Documents
        </button>
      `;
      docList.appendChild(reloadWrap);

      const reloadBtn = document.getElementById("reloadHistoryBtn");
      reloadBtn?.addEventListener("click", () => {
        loadAll(docList, { force: true });
      });

      toast("History view cleared", "info");
    });

    // external refresh hook after upload
    window.addEventListener("documents:refresh", () => {
      loadAll(docList, { force: true, silent: false });
    });

    // optional global helper
    window.refreshDocumentHistory = () => loadAll(docList, { force: true });

    console.log("[search_hist] initialized");
  });
})();