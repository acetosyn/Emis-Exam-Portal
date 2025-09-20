// ==============================
// Admin Dashboard JS - Part 1
// Core + Stepper + Uploads + Push
// ==============================

let generatedCredentials = [];
let examResults = [];
let uploadedDocs = [];   // {id, name, size, type, uploadedAt}
let activeFile = null;

// ----------------- DOM Ready -----------------
function ready(cb) {
  document.readyState !== "loading" ? cb() : document.addEventListener("DOMContentLoaded", cb);
}

// ----------------- Storage -----------------
const getFromStorage = (k) => JSON.parse(localStorage.getItem(k));
const saveToStorage = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const removeFromStorage = (k) => localStorage.removeItem(k);

// ----------------- Toast -----------------
function showToast(message, type="info") {
  const container = document.querySelector(".toast-container") || (() => {
    const div = document.createElement("div");
    div.className = "toast-container";
    document.body.appendChild(div);
    return div;
  })();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 400); }, 3000);
}

// ----------------- Utilities -----------------
const fmtBytes = (bytes=0) => {
  if (!bytes && bytes !== 0) return "—";
  const units = ["B","KB","MB","GB"]; let i = 0;
  while (bytes >= 1024 && i < units.length-1) { bytes/=1024; i++; }
  return `${bytes.toFixed(1)} ${units[i]}`;
};
const nowISO = () => new Date().toISOString();
const byId = (id) => document.getElementById(id);

// ----------------- Stepper / Tabs -----------------
function setupStepperAndTabs() {
  const steps = Array.from(document.querySelectorAll(".stepper .step"));
  const stepPanels = Array.from(document.querySelectorAll(".step-panel"));
  const tabButtons = Array.from(document.querySelectorAll(".segment-tabs .tab"));

  const tabsForParent = (parentSel) =>
    tabButtons.filter(b => b.getAttribute("data-parent") === parentSel);

  const activateStep = (targetSel) => {
    steps.forEach(s => s.classList.toggle("active", s.getAttribute("data-target") === targetSel));
    stepPanels.forEach(p => p.classList.toggle("active", `#${p.id}` === targetSel));
    tabButtons.forEach(btn => {
      btn.classList.toggle("hidden", btn.getAttribute("data-parent") !== targetSel);
    });
    const stepTabs = tabsForParent(targetSel);
    if (stepTabs.length) {
      tabButtons.forEach(b => b.classList.remove("active"));
      stepTabs[0].classList.add("active");
      activateTab(stepTabs[0], targetSel);
    }
  };

  const activateTab = (btn, forcedParentSel = null) => {
    const tabSel = btn.getAttribute("data-tab");
    const parentSel = forcedParentSel || btn.getAttribute("data-parent");
    const parentPanel = document.querySelector(parentSel);
    if (!parentPanel) return;
    parentPanel.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    const panel = document.querySelector(tabSel);
    if (panel) panel.classList.add("active");
  };

  activateStep("#stepA");

  steps.forEach(s => s.addEventListener("click", () => activateStep(s.getAttribute("data-target"))));
  tabButtons.forEach(btn => btn.addEventListener("click", () => {
    if (btn.classList.contains("hidden")) return;
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activateTab(btn);
  }));
}

// ----------------- Uploads -----------------
function setupUpload() {
  const dropzone = byId("dropzone");
  const fileInput = byId("fileInput");
  const uploadMeta = byId("uploadMeta");
  const nameEl = byId("selectedFileName");
  const typeEl = byId("selectedFileType");
  const sizeEl = byId("selectedFileSize");

  const accept = [".pdf",".doc",".docx",".xls",".xlsx"];
  const validateExt = (filename) => accept.some(ext => filename.toLowerCase().endsWith(ext));

  const ensureInHistory = (file) => {
    const existing = uploadedDocs.find(d => d.name === file.name && d.size === file.size);
    if (existing) return existing;
    const item = {
      id: Date.now(),
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
      uploadedAt: nowISO()
    };
    uploadedDocs.unshift(item);
    saveToStorage("uploadedDocs", uploadedDocs);
    renderDocList(uploadedDocs);
    populateActiveDocSelect(uploadedDocs);
    return item;
  };

  const onFile = (file) => {
    if (!file) return;
    if (!validateExt(file.name)) {
      showToast("Unsupported format. Use PDF, Word, or Excel.", "error");
      return;
    }
    activeFile = file;
    nameEl.textContent = file.name;
    typeEl.textContent = file.type || "—";
    sizeEl.textContent = fmtBytes(file.size);
    uploadMeta.classList.remove("hidden");
    const saved = ensureInHistory(file);
    const sel = byId("activeDocSelect");
    if (sel) sel.value = String(saved.id);
    showToast("Document added to dashboard.", "success");
  };

  if (dropzone) {
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });
    ["dragenter","dragover"].forEach(ev =>
      dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); })
    );
    ["dragleave","drop"].forEach(ev =>
      dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); })
    );
    dropzone.addEventListener("drop", (e) => {
      const f = e.dataTransfer?.files?.[0];
      onFile(f);
    });
  }

  fileInput.addEventListener("change", (e) => onFile(e.target.files?.[0]));
  byId("saveDocBtn").addEventListener("click", () => {
    if (!activeFile) return showToast("Select a document first.", "warning");
    const saved = ensureInHistory(activeFile);
    const sel = byId("activeDocSelect");
    if (sel) sel.value = String(saved.id);
    showToast("Document saved to dashboard.", "success");
  });
  byId("clearDocBtn").addEventListener("click", () => {
    activeFile = null;
    uploadMeta.classList.add("hidden");
    nameEl.textContent = "—";
    typeEl.textContent = "—";
    sizeEl.textContent = "—";
  });
  byId("docSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = uploadedDocs.filter(d => d.name.toLowerCase().includes(q));
    renderDocList(filtered);
  });
  byId("clearHistoryBtn").addEventListener("click", () => {
    uploadedDocs = [];
    saveToStorage("uploadedDocs", uploadedDocs);
    renderDocList(uploadedDocs);
    populateActiveDocSelect(uploadedDocs);
    showToast("Document history cleared.", "success");
  });
}

function renderDocList(list) {
  const container = byId("docList");
  container.innerHTML = "";
  if (!list.length) {
    const p = document.createElement("p");
    p.className = "text-sm text-gray-500";
    p.textContent = "No documents yet. Upload a file to add it to your dashboard.";
    container.appendChild(p);
    return;
  }
  list.forEach(doc => {
    const card = document.createElement("div");
    card.className = "doc-card";
    card.innerHTML = `
      <div class="doc-title">${doc.name}</div>
      <div class="doc-meta">Uploaded: ${new Date(doc.uploadedAt).toLocaleString()}</div>
      <div class="doc-meta">Type: ${doc.type || "—"} • Size: ${fmtBytes(doc.size)}</div>
      <div class="doc-actions">
        <button class="btn-secondary use-btn">Use as Active</button>
        <button class="btn-secondary push-btn">Push Preview</button>
        <button class="btn-secondary del-btn">Delete</button>
      </div>
    `;
    card.querySelector(".use-btn").addEventListener("click", () => {
      const sel = byId("activeDocSelect");
      sel.value = String(doc.id);
      showToast(`Active document set: ${doc.name}`, "success");
    });
    card.querySelector(".push-btn").addEventListener("click", () => {
      previewPushJSON(doc);
      document.querySelector('.step[data-target="#stepA"]')?.click();
      Array.from(document.querySelectorAll('.segment-tabs .tab'))
        .find(t => t.dataset.tab === "#tab-push")?.click();
    });
    card.querySelector(".del-btn").addEventListener("click", () => {
      uploadedDocs = uploadedDocs.filter(d => d.id !== doc.id);
      saveToStorage("uploadedDocs", uploadedDocs);
      renderDocList(uploadedDocs);
      populateActiveDocSelect(uploadedDocs);
      showToast("Document removed.", "success");
    });
    container.appendChild(card);
  });
}

function populateActiveDocSelect(list) {
  const sel = byId("activeDocSelect");
  sel.innerHTML = "";
  if (!list.length) {
    const opt = document.createElement("option");
    opt.value = ""; opt.textContent = "No saved documents";
    sel.appendChild(opt);
    return;
  }
  list.forEach(d => {
    const opt = document.createElement("option");
    opt.value = String(d.id);
    opt.textContent = `${d.name} — ${new Date(d.uploadedAt).toLocaleString()}`;
    sel.appendChild(opt);
  });
}

// ----------------- Push to Exam -----------------
function setupPushToExam() {
  byId("pushToExamBtn").addEventListener("click", () => {
    const id = Number(byId("activeDocSelect").value);
    const doc = uploadedDocs.find(d => d.id === id);
    if (!doc) return showToast("Select an active document.", "warning");
    previewPushJSON(doc);
  });
  byId("copyJsonBtn").addEventListener("click", () => {
    const ta = byId("jsonPreview");
    navigator.clipboard.writeText(ta.value || "");
    showToast("JSON copied to clipboard.", "success");
  });
  byId("downloadJsonBtn").addEventListener("click", () => {
    const txt = byId("jsonPreview").value || "";
    const blob = new Blob([txt], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "exam_payload.json"; a.click();
    URL.revokeObjectURL(url);
  });
}

function previewPushJSON(doc) {
  const payload = {
    meta: { generatedAt: nowISO(), version: "v1", source: "dashboard-upload" },
    document: {
      id: doc.id, name: doc.name, mime: doc.type || null,
      size: doc.size || null, uploadedAt: doc.uploadedAt
    },
    mapping: {
      strategy: "backend-parse-pipeline",
      status: "pending",
      notes: "Backend will parse file into exam structure."
    },
    exam: { title: doc.name.replace(/\.[^.]+$/, ""), sections: [], questions: [] }
  };
  byId("jsonPreview").value = JSON.stringify(payload, null, 2);
  byId("jsonPreviewWrap").classList.remove("hidden");
  showToast("Preview generated.", "success");
}

// ----------------- Init Part 1 -----------------
ready(() => {
  uploadedDocs = getFromStorage("uploadedDocs") || [];
  renderDocList(uploadedDocs);
  populateActiveDocSelect(uploadedDocs);

  setupStepperAndTabs();
  setupUpload();
  setupPushToExam();
});
