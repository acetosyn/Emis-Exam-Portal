// Admin Dashboard JS

let generatedCredentials = [];
let examResults = [];

// ----------------- Utility -----------------
function ready(cb) {
  document.readyState !== "loading" ? cb() : document.addEventListener("DOMContentLoaded", cb);
}
function getFromStorage(key) { return JSON.parse(localStorage.getItem(key)); }
function saveToStorage(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function removeFromStorage(key) { localStorage.removeItem(key); }

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

// ----------------- Candidate Link -----------------
function generateCandidateLink() {
  const url = `${window.location.origin}/user_login`;
  document.getElementById("candidateLink").value = url;
  showToast("Candidate login link generated", "success");
}
function copyCandidateLink() {
  const input = document.getElementById("candidateLink");
  if (!input.value) return showToast("Generate a link first", "warning");
  navigator.clipboard.writeText(input.value);
  showToast("Link copied to clipboard", "success");
}
function openCandidateLink() {
  const link = document.getElementById("candidateLink").value;
  if (link) window.open(link, "_blank");
  else showToast("No link generated yet", "warning");
}

// ----------------- Credentials -----------------
function handleCredentialGeneration(e) {
  e.preventDefault();
  const count = parseInt(document.getElementById("studentCount").value);
  const prefix = document.getElementById("usernamePrefix").value;
  const passLen = parseInt(document.getElementById("passwordLength").value);

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
  document.getElementById("totalStudents").textContent = generatedCredentials.length;
  showToast(`Generated ${count} credentials`, "success");
}
function generatePassword(len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({length: len}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
}
function displayCredentials(list) {
  const section = document.getElementById("credentialsSection");
  const table = document.getElementById("credentialsTable");
  table.innerHTML = "";
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
  document.getElementById("credentialsSection").classList.add("hidden");
  document.getElementById("totalStudents").textContent = "0";
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
  generatedCredentials.forEach(c => win.document.write(`<p>${c.username} / ${c.password}</p>`));
  win.print();
}

// ----------------- Results -----------------
function displayResults(list) {
  const table = document.getElementById("resultsTable");
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

// ----------------- Quick Actions -----------------
function notifyDirector() { showToast("Director notified", "info"); }
function sendAdmitMails() { showToast("Admit emails sent", "success"); }
function sendRejectMails() { showToast("Reject emails sent", "error"); }

// ----------------- Init -----------------
ready(() => {
  document.getElementById("credentialForm").addEventListener("submit", handleCredentialGeneration);
  generatedCredentials = getFromStorage("generatedCredentials") || [];
  if (generatedCredentials.length) displayCredentials(generatedCredentials);

  examResults = getFromStorage("examResults") || [];
  if (examResults.length) displayResults(examResults);
});
