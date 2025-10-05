/* ===========================================================
   dashboard_results.js — Admin Results & Credentials Panel
   Architect Build v6 (Unified Modal Edition)
   =========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const ids = [
    "viewCredsBtn", "refreshCredsBtn", "exportCredsBtn", "clearCredsBtn",
    "viewResultsBtn", "refreshResultsBtn", "exportResultsBtn", "clearResultsBtn",
    "resultsModal", "resultsModalBody", "closeResultsModal", "refreshResultsModal",
    "credentialsModal", "credsModalBody", "closeCredsModal", "refreshCredsModal", "exportCredsModal", "exportResultsModal"
  ];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const credsWrapper = byId("credentialsWrapper");
  const resultsWrapper = byId("resultsWrapper");

  // ========================== Toast ==========================
  function showToast(msg, type = "info") {
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("visible"), 50);
    setTimeout(() => t.remove(), 4000);
  }

  // ========================== Loader ==========================
  function skeletonLoader(rows = 3, cols = 5) {
    let s = "<table class='modern-table w-full'><tbody>";
    for (let i = 0; i < rows; i++) {
      s += "<tr>";
      for (let j = 0; j < cols; j++) s += "<td><div class='skeleton'></div></td>";
      s += "</tr>";
    }
    s += "</tbody></table>";
    return s;
  }

  // ========================== Fetch Credentials ==========================
  async function fetchCredentials(target = credsWrapper) {
    target.innerHTML = skeletonLoader(3, 2);
    try {
      const res = await fetch("/view_credentials");
      const data = (await res.json()).credentials || [];
      if (!data.length) {
        target.innerHTML = "<p class='muted'>⚠️ No credentials found.</p>";
        return;
      }
      target.innerHTML = `
        <div class="table-actions">
          <input id="searchCreds" class="form-input w-1/3 mb-2" placeholder="Search username..." />
        </div>
        <table class="modern-table sortable w-full">
          <thead><tr><th>Username</th><th>Password</th></tr></thead>
          <tbody>${data.map(r => `<tr><td>${r.username}</td><td>${r.password}</td></tr>`).join("")}</tbody>
        </table>`;
      enableSearch("searchCreds", target);
      enableSort(target);
      showToast("✅ Credentials loaded", "success");
    } catch {
      target.innerHTML = `<p class='error'>❌ Failed to load credentials.</p>`;
      showToast("Failed to load credentials", "error");
    }
  }

  // ========================== Fetch Results ==========================
  async function fetchResults(target = resultsWrapper) {
    target.innerHTML = skeletonLoader(4, 8);
    try {
      const res = await fetch("/view_results");
      const data = (await res.json()).results || [];
      if (!data.length) {
        target.innerHTML = "<p class='muted'>⚠️ No exam results yet.</p>";
        return;
      }
      target.innerHTML = `
        <div class="table-actions">
          <input id="searchResults" class="form-input w-1/3 mb-2" placeholder="Search name or subject..." />
        </div>
        <table class="modern-table sortable w-full">
          <thead>
            <tr>
              <th>Username</th><th>Full Name</th><th>Email</th>
              <th>Subject</th><th>Score</th><th>Correct</th>
              <th>Total</th><th>Answered</th><th>Time</th><th>Status</th>
            </tr>
          </thead>
          <tbody>${data.map(r => `
            <tr>
              <td>${r.username || ""}</td>
              <td>${r.fullname || ""}</td>
              <td>${r.email || ""}</td>
              <td>${r.subject || ""}</td>
              <td>${r.score || "0"}%</td>
              <td>${r.correct || "0"}</td>
              <td>${r.total || "0"}</td>
              <td>${r.answered || "0"}</td>
              <td>${r.time_taken || "0"}s</td>
              <td>${r.status || ""}</td>
            </tr>`).join("")}
          </tbody>
        </table>`;
      enableSearch("searchResults", target);
      enableSort(target);
      showToast("✅ Results loaded", "success");
    } catch {
      target.innerHTML = `<p class='error'>❌ Failed to load results.</p>`;
      showToast("Failed to load results", "error");
    }
  }

  // ========================== Helpers ==========================
  function enableSearch(id, container) {
    const input = byId(id);
    if (!input) return;
    input.addEventListener("input", e => {
      const term = e.target.value.toLowerCase();
      container.querySelectorAll("tbody tr").forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(term) ? "" : "none";
      });
    });
  }

  function enableSort(container) {
    container.querySelectorAll("th").forEach(th => {
      th.addEventListener("click", () => {
        const table = th.closest("table");
        const idx = Array.from(th.parentNode.children).indexOf(th);
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        const asc = th.classList.toggle("asc");
        rows.sort((a, b) => {
          const x = a.children[idx].innerText.toLowerCase();
          const y = b.children[idx].innerText.toLowerCase();
          return asc ? x.localeCompare(y) : y.localeCompare(x);
        });
        rows.forEach(r => table.querySelector("tbody").appendChild(r));
      });
    });
  }

  function exportTableToCSV(wrapper, filename) {
    const table = wrapper.querySelector(".modern-table");
    if (!table) return showToast("⚠️ No table data to export", "warning");
    let csv = "";
    table.querySelectorAll("tr").forEach(row => {
      csv += Array.from(row.children).map(td => `"${td.innerText}"`).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    showToast(`📁 ${filename} exported`, "success");
  }

  // ========================== Event Bindings ==========================
  el.viewCredsBtn?.addEventListener("click", () => {
    el.credentialsModal.classList.remove("hidden");
    fetchCredentials(el.credsModalBody);
  });
  el.refreshCredsBtn?.addEventListener("click", fetchCredentials);
  el.exportCredsBtn?.addEventListener("click", () =>
    exportTableToCSV(credsWrapper, "credentials_export.csv")
  );
  el.clearCredsBtn?.addEventListener("click", () => {
    credsWrapper.innerHTML = "<p class='muted'>No data yet.</p>";
    showToast("🧹 Credentials cleared", "info");
  });

  el.refreshCredsModal?.addEventListener("click", () => fetchCredentials(el.credsModalBody));
  el.exportCredsModal?.addEventListener("click", () =>
    exportTableToCSV(el.credsModalBody, "credentials_export.csv")
  );
  el.closeCredsModal?.addEventListener("click", () =>
    el.credentialsModal.classList.add("hidden")
  );

  el.viewResultsBtn?.addEventListener("click", () => {
    el.resultsModal.classList.remove("hidden");
    fetchResults(el.resultsModalBody);
  });
  el.refreshResultsBtn?.addEventListener("click", fetchResults);
  el.exportResultsBtn?.addEventListener("click", () =>
    exportTableToCSV(resultsWrapper, "results_export.csv")
  );
  el.clearResultsBtn?.addEventListener("click", () => {
    resultsWrapper.innerHTML = "<p class='muted'>No results yet.</p>";
    showToast("🧹 Results cleared", "info");
  });

  el.refreshResultsModal?.addEventListener("click", () =>
    fetchResults(el.resultsModalBody)
  );
  el.exportResultsModal?.addEventListener("click", () =>
    exportTableToCSV(el.resultsModalBody, "results_export.csv")
  );
  el.closeResultsModal?.addEventListener("click", () =>
    el.resultsModal.classList.add("hidden")
  );

  function byId(id) { return document.getElementById(id); }
});
