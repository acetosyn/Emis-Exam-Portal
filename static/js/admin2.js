// ==============================
// Admin Dashboard JS - Part 2
// Links + Credentials + Results + Modal
// ==============================

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
  showToast("Link copied", "success");
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
    handleCredentialGeneration(new Event("submit", {cancelable: true, bubbles: true}));
  });
  byId("clearCredsBtn").addEventListener("click", clearAllCredentials);
  byId("downloadCredsBtn").addEventListener("click", downloadCredentials);
  byId("printCredsBtn").addEventListener("click", printCredentials);
  byId("searchCredentials").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = generatedCredentials.filter(c => c.username.toLowerCase().includes(q));
    displayCredentials(filtered);
  });
  byId("generateAllBtn").addEventListener("click", () => {
    generateCandidateLink();
    handleCredentialGeneration(new Event("submit", {cancelable: true, bubbles: true}));
    showToast("Generated link + credentials", "success");
  });
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
  if (!list.length) { section.classList.add("hidden"); return; }
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
  win.document.write("<h1>EMIS Credentials</h1><pre>");
  generatedCredentials.forEach(c => win.document.write(`${c.username} / ${c.password}\n`));
  win.document.write("</pre>"); win.print();
}

// ----------------- Results -----------------
function setupResults() {
  byId("downloadResultsBtn").addEventListener("click", downloadResults);
  byId("printResultsBtn").addEventListener("click", printResults);
  byId("searchResults").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = examResults.filter(r => r.name.toLowerCase().includes(q));
    displayResults(filtered);
  });
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
  win.document.write("<h1>EMIS Results</h1><pre>");
  examResults.forEach(c => win.document.write(`${c.name} — ${c.score}% — ${c.status}\n`));
  win.document.write("</pre>"); win.print();
}

// ----------------- Quick Actions -----------------
function notifyDirector() { showToast("Director notified", "info"); }
function sendAdmitMails() { showToast("Admit emails sent", "success"); }
function sendRejectMails() { showToast("Reject emails sent", "error"); }

// ----------------- Modal -----------------
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

// ----------------- Init Part 2 -----------------
ready(() => {
  setupLink();
  setupCredentials();
  setupResults();
  setupModal();
});
