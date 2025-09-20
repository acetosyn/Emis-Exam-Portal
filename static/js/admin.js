// Admin Dashboard JS (Front-end only; backend wiring later)

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
    // Highlight active step
    steps.forEach(s => s.classList.toggle("active", s.getAttribute("data-target") === targetSel));
    stepPanels.forEach(p => p.classList.toggle("active", `#${p.id}` === targetSel));

    // Show only this step’s tabs
    tabButtons.forEach(btn => {
      btn.classList.toggle("hidden", btn.getAttribute("data-parent") !== targetSel);
    });

    // Auto-activate first tab in this step
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

    // Hide all tab-panels inside that step
    parentPanel.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

    // Show chosen panel
    const panel = document.querySelector(tabSel);
    if (panel) panel.classList.add("active");
  };

  // Init Step A
  activateStep("#stepA");

  // Events
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

    // auto-select it
    const sel = byId("activeDocSelect");
    if (sel) sel.value = String(saved.id);

    showToast("Document added to dashboard.", "success");
  };

  // Dropzone events
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

  // Input file change
  fileInput.addEventListener("change", (e) => onFile(e.target.files?.[0]));

  // Save button (manual)
  byId("saveDocBtn").addEventListener("click", () => {
    if (!activeFile) return showToast("Select a document first.", "warning");
    const saved = ensureInHistory(activeFile);
    const sel = byId("activeDocSelect");
    if (sel) sel.value = String(saved.id);
    showToast("Document saved to dashboard.", "success");
  });

  // Clear button
  byId("clearDocBtn").addEventListener("click", () => {
    activeFile = null;
    uploadMeta.classList.add("hidden");
    nameEl.textContent = "—";
    typeEl.textContent = "—";
    sizeEl.textContent = "—";
  });

  // Search
  byId("docSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = uploadedDocs.filter(d => d.name.toLowerCase().includes(q));
    renderDocList(filtered);
  });

  // Clear history
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
    p.textContent = "No documents yet. Upload (or drag) a file to add it to your dashboard.";
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
      // jump to Step A -> Push tab
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

// ----------------- Push to Exam (JSON preview) -----------------
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
    meta: {
      generatedAt: nowISO(),
      version: "v1",
      source: "dashboard-upload"
    },
    document: {
      id: doc.id,
      name: doc.name,
      mime: doc.type || null,
      size: doc.size || null,
      uploadedAt: doc.uploadedAt
    },
    mapping: {
      strategy: "backend-parse-pipeline",
      status: "pending",
      notes: "Backend will parse file into exam structure (sections, questions, options)."
    },
    exam: {
      title: doc.name.replace(/\.[^.]+$/, ""),
      sections: [],
      questions: []
    }
  };

  const pretty = JSON.stringify(payload, null, 2);
  byId("jsonPreview").value = pretty;
  byId("jsonPreviewWrap").classList.remove("hidden");
  showToast("Preview generated. Ready for backend integration.", "success");
}

// ----------------- Candidate Link -----------------
function setupLink() {
  byId("generateLinkBtn").addEventListener("click", generateCandidateLink);
  byId("copyLinkBtn").addEventListener("click", copyCandidateLink);
  byId("openLinkBtn").addEventListener("click", openCandidateLink);
  byId("autoLinkBtn").addEventListener("click", () => {
    generateCandidateLink();
    saveToStorage("candidateLink", byId("candidateLink").value);
    showToast("Auto-generated & saved link.", "success");
  });

  const saved = getFromStorage("candidateLink");
  if (saved) byId("candidateLink").value = saved;
}

function generateCandidateLink() {
  const url = `${window.location.origin}/user_login`;
  byId("candidateLink").value = url;
  showToast("Candidate login link generated", "success");
}
function copyCandidateLink() {
  const input = byId("candidateLink");
  if (!input.value) return showToast("Generate a link first", "warning");
  navigator.clipboard.writeText(input.value);
  showToast("Link copied to clipboard", "success");
}
function openCandidateLink() {
  const link = byId("candidateLink").value;
  if (link) window.open(link, "_blank");
  else showToast("No link generated yet", "warning");
}

// ----------------- Credentials -----------------
function setupCredentials() {
  byId("credentialForm").addEventListener("submit", handleCredentialGeneration);
  byId("autoCredsBtn").addEventListener("click", () => {
    handleCredentialGeneration(new Event("submit", {cancelable: true, bubbles: true,}));
  });
  byId("clearCredsBtn").addEventListener("click", clearAllCredentials);
  byId("downloadCredsBtn").addEventListener("click", downloadCredentials);
  byId("printCredsBtn").addEventListener("click", printCredentials);
  byId("searchCredentials").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = generatedCredentials.filter(c => c.username.toLowerCase().includes(q));
    displayCredentials(filtered);
  });

  // Generate All
  byId("generateAllBtn").addEventListener("click", () => {
    generateCandidateLink();
    handleCredentialGeneration(new Event("submit", {cancelable: true, bubbles: true,}));
    showToast("Generated link + credentials.", "success");
  });

  // Load persisted
  generatedCredentials = getFromStorage("generatedCredentials") || [];
  if (generatedCredentials.length) {
    displayCredentials(generatedCredentials);
    byId("totalStudents").textContent = generatedCredentials.length;
  }
}

function handleCredentialGeneration(e) {
  e.preventDefault();
  const count = parseInt(byId("studentCount").value);
  const prefix = byId("usernamePrefix").value.trim() || "candidate";
  const passLen = parseInt(byId("passwordLength").value);

  if (!count || count < 1) return showToast("Enter a valid number", "error");

  const creds = [];
  for (let i=0;i<count;i++) {
    creds.push({
      id: Date.now() + i,
      username: `${prefix}${Math.floor(Math.random()*9000+1000)}`,
      password: generatePassword(passLen),
      status: "Active"
    });
  }
  generatedCredentials = [...generatedCredentials, ...creds];
  saveToStorage("generatedCredentials", generatedCredentials);
  displayCredentials(generatedCredentials);
  byId("totalStudents").textContent = generatedCredentials.length;
  showToast(`Generated ${count} credentials`, "success");
}

function generatePassword(len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({length: len}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
}

function displayCredentials(list) {
  const section = byId("credentialsSection");
  const table = byId("credentialsTable");
  table.innerHTML = "";
  if (!list.length) {
    section.classList.add("hidden");
    return;
  }
  list.forEach(c => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="px-4 py-2">${c.id}</td>
      <td class="px-4 py-2">${c.username}</td>
      <td class="px-4 py-2 font-mono">${c.password}</td>
      <td class="px-4 py-2">${c.status}</td>`;
    table.appendChild(row);
  });
  section.classList.remove("hidden");
}

function clearAllCredentials() {
  generatedCredentials = [];
  removeFromStorage("generatedCredentials");
  byId("credentialsSection").classList.add("hidden");
  byId("totalStudents").textContent = "0";
  showToast("All credentials cleared", "success");
}

function downloadCredentials() {
  if (!generatedCredentials.length) return showToast("No credentials", "warning");
  const rows = [["ID","Username","Password","Status"], ...generatedCredentials.map(c=>[c.id,c.username,c.password,c.status])];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download="emis_credentials.csv"; a.click();
  URL.revokeObjectURL(url);
}

function printCredentials() {
  if (!generatedCredentials.length) return showToast("No credentials", "warning");
  const win = window.open("", "_blank");
  win.document.write("<h1>EMIS Credentials</h1>");
  win.document.write("<pre style='font-family:ui-monospace,monospace'>");
  generatedCredentials.forEach(c => win.document.write(`${c.username} / ${c.password}\n`));
  win.document.write("</pre>");
  win.print();
}

// ----------------- Results (sample list placeholder) -----------------
function setupResults() {
  byId("downloadResultsBtn").addEventListener("click", downloadResults);
  byId("printResultsBtn").addEventListener("click", printResults);
  byId("searchResults").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = examResults.filter(r => r.name.toLowerCase().includes(q));
    displayResults(filtered);
  });

  // Load demo or persisted
  examResults = getFromStorage("examResults") || [
    { name: "Jane Doe", score: 86, status: "Passed" },
    { name: "John Smith", score: 48, status: "Failed" }
  ];
  saveToStorage("examResults", examResults);
  displayResults(examResults);
}

function displayResults(list) {
  const table = byId("resultsTable");
  table.innerHTML = "";
  list.forEach((r, idx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="px-4 py-2">${r.name}</td>
      <td class="px-4 py-2">${r.score}%</td>
      <td class="px-4 py-2">${r.status}</td>
      <td class="px-4 py-2">
        <button class="btn-secondary text-xs" onclick="viewResult(${idx})">View</button>
        <button class="btn-secondary text-xs" onclick="deleteResult(${idx})">Delete</button>
      </td>`;
    table.appendChild(row);
  });
}
function viewResult(idx) {
  const r = examResults[idx];
  alert(`Result for ${r.name}: ${r.score}% (${r.status})`);
}
function deleteResult(idx) {
  examResults.splice(idx,1);
  saveToStorage("examResults", examResults);
  displayResults(examResults);
  showToast("Result deleted","success");
}
function downloadResults() {
  if (!examResults.length) return showToast("No results", "warning");
  const rows = [["Name","Score","Status"], ...examResults.map(r=>[r.name,r.score,r.status])];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download="emis_results.csv"; a.click();
  URL.revokeObjectURL(url);
}
function printResults() {
  if (!examResults.length) return showToast("No results", "warning");
  const win = window.open("", "_blank");
  win.document.write("<h1>EMIS Results</h1>");
  win.document.write("<pre style='font-family:ui-monospace,monospace'>");
  examResults.forEach(c => win.document.write(`${c.name} — ${c.score}% — ${c.status}\n`));
  win.document.write("</pre>");
  win.print();
}

// ----------------- Right Column Quick Actions -----------------
function notifyDirector() { showToast("Director notified", "info"); }
function sendAdmitMails() { showToast("Admit emails sent", "success"); }
function sendRejectMails() { showToast("Reject emails sent", "error"); }

// ----------------- Modal helpers (optional) -----------------
function setupModal() {
  const root = document.getElementById("modalRoot");
  const close = document.getElementById("modalClose");
  if (!root || !close) return;
  close.addEventListener("click", () => root.classList.add("hidden"));
  document.getElementById("modalCopy")?.addEventListener("click", () => {
    const txt = document.getElementById("modalTextarea").value || "";
    navigator.clipboard.writeText(txt);
    showToast("Copied.", "success");
  });
  document.getElementById("modalDownload")?.addEventListener("click", () => {
    const txt = document.getElementById("modalTextarea").value || "";
    const blob = new Blob([txt], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "payload.json"; a.click();
    URL.revokeObjectURL(url);
  });
}

// ----------------- Init -----------------
ready(() => {
  // load persisted docs
  uploadedDocs = getFromStorage("uploadedDocs") || [];
  renderDocList(uploadedDocs);
  populateActiveDocSelect(uploadedDocs);

  setupStepperAndTabs();
  setupUpload();
  setupPushToExam();
  setupLink();
  setupCredentials();
  setupResults();
  setupModal();
});
