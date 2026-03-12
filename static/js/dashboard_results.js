/* ===========================================================
   dashboard_results.js — EMIS Admin v6 Advanced Results Suite
   Features:
   - rich results table
   - live search / subject / status / score filters
   - sort by date / score / name / subject
   - pagination
   - compact mode
   - summary cards
   - row selection + bulk actions
   - per-row view / print / csv / copy email / send to EDA / delete(db)
   - bulk delete selected
   - dashboard wrappers + modals still work
=========================================================== */

(() => {
  if (window.__DASHBOARD_RESULTS_INIT__) return;
  window.__DASHBOARD_RESULTS_INIT__ = true;

  document.addEventListener("DOMContentLoaded", () => {
    const credentialsModal = document.getElementById("credentialsModal");
    const resultsModal = document.getElementById("resultsModal");
    const credsModalBody = document.getElementById("credsModalBody");
    const resultsModalBody = document.getElementById("resultsModalBody");

    const credentialsWrapper = document.getElementById("credentialsWrapper");
    const resultsWrapper = document.getElementById("resultsWrapper");

    const dashboardViewCredsBtn = document.getElementById("dashboardViewCredsBtn");
    const dashboardRefreshCredsBtn = document.getElementById("dashboardRefreshCredsBtn");
    const dashboardExportCredsBtn = document.getElementById("dashboardExportCredsBtn");
    const dashboardClearCredsBtn = document.getElementById("dashboardClearCredsBtn");

    const dashboardViewResultsBtn = document.getElementById("dashboardViewResultsBtn");
    const dashboardRefreshResultsBtn = document.getElementById("dashboardRefreshResultsBtn");
    const dashboardExportResultsBtn = document.getElementById("dashboardExportResultsBtn");
    const dashboardClearResultsBtn = document.getElementById("dashboardClearResultsBtn");

    // results center
    const panelSearchResults = document.getElementById("panelSearchResults");
    const panelRefreshResultsBtn = document.getElementById("panelRefreshResultsBtn");
    const panelCompactToggleBtn = document.getElementById("panelCompactToggleBtn");
    const panelOpenResultsModalBtn = document.getElementById("panelOpenResultsModalBtn");
    const panelDownloadResultsBtn = document.getElementById("panelDownloadResultsBtn");
    const panelDownloadSelectedResultsBtn = document.getElementById("panelDownloadSelectedResultsBtn");
    const panelPrintResultsBtn = document.getElementById("panelPrintResultsBtn");
    const panelPrintSelectedResultsBtn = document.getElementById("panelPrintSelectedResultsBtn");
    const panelSendSelectedToEdaBtn = document.getElementById("panelSendSelectedToEdaBtn");
    const panelDeleteSelectedResultsBtn = document.getElementById("panelDeleteSelectedResultsBtn");
    const panelResetResultsFiltersBtn = document.getElementById("panelResetResultsFiltersBtn");

    const resultsSubjectFilter = document.getElementById("resultsSubjectFilter");
    const resultsStatusFilter = document.getElementById("resultsStatusFilter");
    const resultsScoreFilter = document.getElementById("resultsScoreFilter");
    const resultsSortBy = document.getElementById("resultsSortBy");
    const resultsPageSize = document.getElementById("resultsPageSize");

    const resultsBulkBar = document.getElementById("resultsBulkBar");
    const resultsBulkCount = document.getElementById("resultsBulkCount");
    const resultsBulkSelectAllVisibleBtn = document.getElementById("resultsBulkSelectAllVisibleBtn");
    const resultsBulkClearBtn = document.getElementById("resultsBulkClearBtn");
    const resultsBulkExportBtn = document.getElementById("resultsBulkExportBtn");
    const resultsBulkPrintBtn = document.getElementById("resultsBulkPrintBtn");
    const resultsBulkSendBtn = document.getElementById("resultsBulkSendBtn");
    const resultsBulkDeleteBtn = document.getElementById("resultsBulkDeleteBtn");

    const resultsSummaryCards = document.getElementById("resultsSummaryCards");
    const resultsMetaText = document.getElementById("resultsMetaText");
    const resultsPrevPageBtn = document.getElementById("resultsPrevPageBtn");
    const resultsNextPageBtn = document.getElementById("resultsNextPageBtn");
    const resultsPageLabel = document.getElementById("resultsPageLabel");

    const resultsTable = document.getElementById("resultsTable");

    const closeCredsModal = document.getElementById("closeCredsModal");
    const closeResultsModal = document.getElementById("closeResultsModal");
    const refreshCredsModal = document.getElementById("refreshCredsModal");
    const refreshResultsModal = document.getElementById("refreshResultsModal");
    const exportCredsModal = document.getElementById("exportCredsModal");
    const exportResultsModal = document.getElementById("exportResultsModal");

    const statPending = document.getElementById("statPending");
    const statAvg = document.getElementById("statAvg");
    const statTotalStudents = document.getElementById("statTotalStudents");
    const statActiveExams = document.getElementById("statActiveExams");

    const notificationsPanel = document.getElementById("notificationsPanel");
    const notificationsPanelFull = document.getElementById("notificationsPanelFull");
    const recentActivity = document.getElementById("recentActivity");
    const recentActivityFull = document.getElementById("recentActivityFull");

    let latestCredentials = [];
    let latestResults = [];
    let filteredResults = [];
    let selectedResultKeys = new Set();
    let currentPage = 1;
    let pageSize = 20;
    let compactMode = false;

    // --------------------------------------------------
    // Helpers
    // --------------------------------------------------
    function showToast(msg, type = "info") {
      if (typeof window.showToast === "function") {
        window.showToast(msg, type);
        return;
      }

      const t = document.createElement("div");
      t.className = `toast toast-${type}`;
      t.textContent = msg;
      document.body.appendChild(t);

      requestAnimationFrame(() => t.classList.add("visible"));

      setTimeout(() => {
        t.classList.remove("visible");
        setTimeout(() => t.remove(), 300);
      }, 2600);
    }

    function escapeHtml(value = "") {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function openModal(modal) {
      if (!modal) return;
      modal.classList.remove("hidden");
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }

    function closeModal(modal) {
      if (!modal) return;
      modal.classList.add("hidden");
      modal.style.display = "";
      document.body.style.overflow = "";
    }

    function skeletonLoader(rows = 3, cols = 5) {
      let html = "<table class='modern-table w-full'><tbody>";
      for (let i = 0; i < rows; i++) {
        html += "<tr>";
        for (let j = 0; j < cols; j++) {
          html += "<td><div class='skeleton'></div></td>";
        }
        html += "</tr>";
      }
      html += "</tbody></table>";
      return html;
    }

    function getResultKey(r) {
      return [
        r?.username || "",
        r?.subject || "",
        r?.submitted_at || "",
        r?.email || ""
      ].join("|");
    }

    function parseScore(score) {
      return Number.parseFloat(score || 0) || 0;
    }

    function parseDate(dateStr) {
      const t = Date.parse(dateStr || "");
      return Number.isNaN(t) ? 0 : t;
    }

    function formatSubmitted(dateStr) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleString();
    }

    function getScoreBadge(score) {
      const n = parseScore(score);
      if (n >= 70) return "badge-success";
      if (n >= 50) return "badge-warning";
      return "badge-danger";
    }

    function getStatusBadge(status) {
      const s = String(status || "").toLowerCase();
      if (s === "completed") return "badge-success";
      if (s === "timeout") return "badge-warning";
      if (s === "disqualified") return "badge-danger";
      return "badge-secondary";
    }

    function ensureResultsEnhancementStyles() {
      if (document.getElementById("results-enhancement-inline-style")) return;

      const style = document.createElement("style");
      style.id = "results-enhancement-inline-style";
      style.textContent = `
        .results-summary-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
          gap:1rem;
          margin:1rem 0 1.2rem;
        }
        .result-mini-card{
          background:linear-gradient(180deg,#fff,#f8fbff);
          border:1px solid #e6edf5;
          border-radius:18px;
          padding:1rem;
          box-shadow:0 8px 24px rgba(15,43,70,.06);
        }
        .result-mini-label{
          font-size:.74rem;
          font-weight:700;
          color:#64748b;
          margin-bottom:.25rem;
        }
        .result-mini-value{
          font-size:1.25rem;
          font-weight:900;
          color:#0f2b46;
        }
        .results-toolbar{
          display:flex;
          flex-direction:column;
          gap:.8rem;
          margin-bottom:1rem;
        }
        .results-toolbar-row{
          display:flex;
          flex-wrap:wrap;
          gap:.65rem;
          align-items:center;
        }
        .results-search{
          min-width:260px;
          flex:1 1 260px;
        }
        .results-footer-bar{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:1rem;
          margin-top:1rem;
          flex-wrap:wrap;
        }
        .results-modern-table thead th{
          position:sticky;
          top:0;
          z-index:2;
          background:#f8fbff;
        }
        .results-modern-table tbody tr:hover{
          background:#f7fbff;
        }
        .results-modern-table.compact th,
        .results-modern-table.compact td{
          padding:.45rem .5rem;
          font-size:.74rem;
        }
        .result-name-cell{
          display:flex;
          flex-direction:column;
          gap:.2rem;
        }
        .result-name-main{
          font-weight:800;
          color:#0f2b46;
        }
        .result-name-sub{
          font-size:.72rem;
          color:#64748b;
        }
        .result-action-group{
          display:flex;
          gap:.35rem;
          flex-wrap:wrap;
        }
        .result-icon-btn{
          border:none;
          border-radius:12px;
          padding:.42rem .55rem;
          cursor:pointer;
          background:#eef4ff;
          color:#18406a;
          font-weight:800;
          transition:.2s ease;
        }
        .result-icon-btn:hover{
          transform:translateY(-1px);
          background:#dbeafe;
        }
        .result-icon-btn.primary{
          background:#e0f2fe;
          color:#075985;
        }
        .result-icon-btn.success{
          background:#dcfce7;
          color:#166534;
        }
        .result-icon-btn.warn{
          background:#fef3c7;
          color:#92400e;
        }
        .result-icon-btn.danger{
          background:#ffe4e6;
          color:#be123c;
        }
        .badge-danger{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:.32rem .62rem;
          border-radius:999px;
          background:#ffe4e6;
          color:#be123c;
          font-size:.72rem;
          font-weight:800;
        }
        .badge-secondary{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:.32rem .62rem;
          border-radius:999px;
          background:#e2e8f0;
          color:#334155;
          font-size:.72rem;
          font-weight:800;
        }
        .result-detail-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
          gap:.9rem;
          margin-top:1rem;
        }
        .result-detail-tile{
          background:#f8fbff;
          border:1px solid #e6edf5;
          border-radius:16px;
          padding:.9rem;
        }
        .result-detail-k{
          font-size:.73rem;
          font-weight:700;
          color:#64748b;
          margin-bottom:.18rem;
        }
        .result-detail-v{
          font-size:.95rem;
          font-weight:800;
          color:#0f2b46;
          word-break:break-word;
        }
        @media (max-width: 767.98px){
          .results-toolbar-row{
            flex-direction:column;
            align-items:stretch;
          }
          .results-search{
            min-width:100%;
          }
        }
      `;
      document.head.appendChild(style);
    }

    function downloadBlob(filename, content, type = "text/plain;charset=utf-8") {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function resultsToCSV(rows) {
      const cols = [
        "username", "fullname", "email", "subject", "score",
        "correct", "total", "answered", "time_taken", "status", "submitted_at"
      ];

      const lines = [
        cols.join(","),
        ...rows.map((r) =>
          cols
            .map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`)
            .join(",")
        )
      ];

      return lines.join("\n");
    }

    function exportRowsCSV(rows, filename) {
      if (!rows.length) {
        showToast("No results to export", "error");
        return;
      }

      downloadBlob(filename, resultsToCSV(rows), "text/csv;charset=utf-8");
      showToast(`${filename} exported`, "success");
    }

    function printRows(rows, title = "EMIS Exam Results") {
      if (!rows.length) {
        showToast("No results to print", "error");
        return;
      }

      const htmlRows = rows.map((r) => `
        <tr>
          <td>${escapeHtml(r.username || "")}</td>
          <td>${escapeHtml(r.fullname || "")}</td>
          <td>${escapeHtml(r.email || "")}</td>
          <td>${escapeHtml(r.subject || "")}</td>
          <td>${escapeHtml(r.score || "0")}%</td>
          <td>${escapeHtml(r.correct || "0")}</td>
          <td>${escapeHtml(r.total || "0")}</td>
          <td>${escapeHtml(r.answered || "0")}</td>
          <td>${escapeHtml(r.time_taken || "0")}s</td>
          <td>${escapeHtml(r.status || "")}</td>
          <td>${escapeHtml(formatSubmitted(r.submitted_at || ""))}</td>
        </tr>
      `).join("");

      const printWin = window.open("", "_blank", "width=1300,height=850");
      if (!printWin) {
        showToast("Pop-up blocked. Allow pop-ups to print.", "error");
        return;
      }

      printWin.document.write(`
        <html>
          <head>
            <title>${escapeHtml(title)}</title>
            <style>
              body{font-family:Arial,sans-serif;padding:24px;color:#111}
              h1{font-size:20px;margin-bottom:18px}
              table{width:100%;border-collapse:collapse}
              th,td{border:1px solid #d1d5db;padding:8px;font-size:12px;text-align:left}
              th{background:#f3f4f6}
            </style>
          </head>
          <body>
            <h1>${escapeHtml(title)}</h1>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Total</th>
                  <th>Answered</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>${htmlRows}</tbody>
            </table>
          </body>
        </html>
      `);

      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 300);
    }

    function enableSearch(input) {
      if (!input) return;
      input.addEventListener("input", () => applyResultFilters());
    }

    function enableSort(container) {
      if (!container) return;

      container.querySelectorAll("th.sortable-head").forEach((th) => {
        th.addEventListener("click", () => {
          const mode = th.dataset.sortMode || "submitted_desc";
          if (resultsSortBy) resultsSortBy.value = mode;
          currentPage = 1;
          applyResultFilters();
        });
      });
    }

    function syncResultsViews() {
      if (resultsWrapper) {
        resultsWrapper.innerHTML = renderResultsTable(latestResults);
        const wrapperSearch = resultsWrapper.querySelector("#searchResultsDynamic");
        enableSearch(wrapperSearch);
      }

      if (resultsModalBody && resultsModal && !resultsModal.classList.contains("hidden")) {
        resultsModalBody.innerHTML = renderResultsTable(latestResults);
        const modalSearch = resultsModalBody.querySelector("#searchResultsDynamic");
        enableSearch(modalSearch);
      }
    }

    // --------------------------------------------------
    // Credentials rendering
    // --------------------------------------------------
    function renderCredentialsTable(creds) {
      if (!Array.isArray(creds) || !creds.length) {
        return "<p class='muted'>No credentials found.</p>";
      }

      return `
        <div class="table-actions" style="margin-bottom:.75rem;">
          <input id="searchCredsDynamic" class="form-input" style="max-width:260px;" placeholder="Search username..." />
        </div>
        <table class="modern-table w-full">
          <thead>
            <tr>
              <th>Username</th>
              <th>Password</th>
              <th>Subject</th>
              <th>Issued</th>
            </tr>
          </thead>
          <tbody>
            ${creds.map((r) => `
              <tr>
                <td>${escapeHtml(r.username || "")}</td>
                <td>${escapeHtml(r.password || "")}</td>
                <td>${escapeHtml(r.subject || "")}</td>
                <td>${r.issued ? "Yes" : "No"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    // --------------------------------------------------
    // Results filtering / sorting / paging
    // --------------------------------------------------
    function populateSubjectFilter(rows) {
      if (!resultsSubjectFilter) return;

      const current = resultsSubjectFilter.value;
      const subjects = [
        ...new Set(rows.map((r) => String(r.subject || "").trim()).filter(Boolean))
      ].sort();

      resultsSubjectFilter.innerHTML =
        `<option value="">All Subjects</option>` +
        subjects.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");

      resultsSubjectFilter.value = current && subjects.includes(current) ? current : "";
    }

    function applyResultFilters() {
      const term = (panelSearchResults?.value || "").trim().toLowerCase();
      const subject = (resultsSubjectFilter?.value || "").trim().toLowerCase();
      const status = (resultsStatusFilter?.value || "").trim().toLowerCase();
      const scoreBand = resultsScoreFilter?.value || "";
      const sortBy = resultsSortBy?.value || "submitted_desc";
      pageSize = parseInt(resultsPageSize?.value || "20", 10) || 20;

      let rows = [...latestResults];

      if (term) {
        rows = rows.filter((r) =>
          [
            r.username,
            r.fullname,
            r.email,
            r.subject,
            r.status,
            r.submitted_at,
            r.score
          ].join(" ").toLowerCase().includes(term)
        );
      }

      if (subject) {
        rows = rows.filter((r) => String(r.subject || "").trim().toLowerCase() === subject);
      }

      if (status) {
        rows = rows.filter((r) => String(r.status || "").trim().toLowerCase() === status);
      }

      if (scoreBand) {
        rows = rows.filter((r) => {
          const n = parseScore(r.score);
          if (scoreBand === "90-100") return n >= 90;
          if (scoreBand === "70-89") return n >= 70 && n <= 89;
          if (scoreBand === "50-69") return n >= 50 && n <= 69;
          if (scoreBand === "0-49") return n < 50;
          return true;
        });
      }

      rows.sort((a, b) => {
        switch (sortBy) {
          case "submitted_asc":
            return parseDate(a.submitted_at) - parseDate(b.submitted_at);
          case "score_desc":
            return parseScore(b.score) - parseScore(a.score);
          case "score_asc":
            return parseScore(a.score) - parseScore(b.score);
          case "name_asc":
            return String(a.fullname || "").localeCompare(String(b.fullname || ""));
          case "subject_asc":
            return String(a.subject || "").localeCompare(String(b.subject || ""));
          case "submitted_desc":
          default:
            return parseDate(b.submitted_at) - parseDate(a.submitted_at);
        }
      });

      filteredResults = rows;

      const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      renderResultsSummary(filteredResults);
      renderResultsPanelTable();
      updateBulkBar();
      updateResultsMeta();
    }

    function getVisiblePageRows() {
      const start = (currentPage - 1) * pageSize;
      return filteredResults.slice(start, start + pageSize);
    }

    function updateResultsMeta() {
      const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));

      if (resultsMetaText) {
        resultsMetaText.textContent = `${filteredResults.length} filtered result(s) • ${latestResults.length} total`;
      }

      if (resultsPageLabel) {
        resultsPageLabel.textContent = `Page ${currentPage} of ${totalPages}`;
      }

      if (resultsPrevPageBtn) resultsPrevPageBtn.disabled = currentPage <= 1;
      if (resultsNextPageBtn) resultsNextPageBtn.disabled = currentPage >= totalPages;
    }

    function renderResultsSummary(rows) {
      if (!resultsSummaryCards) return;

      const total = rows.length;
      const completed = rows.filter((r) => String(r.status || "").toLowerCase() === "completed").length;
      const pass = rows.filter((r) => parseScore(r.score) >= 50).length;
      const avg = total ? Math.round(rows.reduce((sum, r) => sum + parseScore(r.score), 0) / total) : 0;
      const highest = total ? Math.max(...rows.map((r) => parseScore(r.score))) : 0;
      const timeout = rows.filter((r) => String(r.status || "").toLowerCase() === "timeout").length;

      resultsSummaryCards.innerHTML = `
        <div class="result-mini-card">
          <div class="result-mini-label">Visible Results</div>
          <div class="result-mini-value">${total}</div>
        </div>
        <div class="result-mini-card">
          <div class="result-mini-label">Completed</div>
          <div class="result-mini-value">${completed}</div>
        </div>
        <div class="result-mini-card">
          <div class="result-mini-label">Pass Count</div>
          <div class="result-mini-value">${pass}</div>
        </div>
        <div class="result-mini-card">
          <div class="result-mini-label">Average Score</div>
          <div class="result-mini-value">${total ? `${avg}%` : "--"}</div>
        </div>
        <div class="result-mini-card">
          <div class="result-mini-label">Highest Score</div>
          <div class="result-mini-value">${total ? `${highest}%` : "--"}</div>
        </div>
        <div class="result-mini-card">
          <div class="result-mini-label">Timeouts</div>
          <div class="result-mini-value">${timeout}</div>
        </div>
      `;
    }

    // --------------------------------------------------
    // Row actions
    // --------------------------------------------------
    function toggleResultSelection(key, checked) {
      if (checked) selectedResultKeys.add(key);
      else selectedResultKeys.delete(key);
      updateBulkBar();
    }

    function updateBulkBar() {
      const count = selectedResultKeys.size;
      if (resultsBulkCount) resultsBulkCount.textContent = String(count);
      resultsBulkBar?.classList.toggle("hidden", count <= 0);
    }

    function getSelectedRows() {
      return latestResults.filter((r) => selectedResultKeys.has(getResultKey(r)));
    }

    function viewSingleResult(row) {
      openModal(resultsModal);

      resultsModalBody.innerHTML = `
        <div class="card" style="box-shadow:none;border:1px solid #e6edf5;">
          <div class="card-head">
            <div>
              <h2 class="panel-title">Candidate Result Details</h2>
              <p class="panel-subtitle">${escapeHtml(row.fullname || row.username || "Candidate")}</p>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button class="btn-secondary" type="button" id="modalPrintSingleBtn">Print</button>
              <button class="btn-primary" type="button" id="modalSendSingleEdaBtn">Send to EDA</button>
            </div>
          </div>

          <div class="result-detail-grid">
            <div class="result-detail-tile"><div class="result-detail-k">Username</div><div class="result-detail-v">${escapeHtml(row.username || "")}</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Full Name</div><div class="result-detail-v">${escapeHtml(row.fullname || "")}</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Email</div><div class="result-detail-v">${escapeHtml(row.email || "")}</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Subject</div><div class="result-detail-v">${escapeHtml(row.subject || "")}</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Score</div><div class="result-detail-v">${escapeHtml(row.score || "0")}%</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Correct</div><div class="result-detail-v">${escapeHtml(row.correct || "0")}</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Total</div><div class="result-detail-v">${escapeHtml(row.total || "0")}</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Answered</div><div class="result-detail-v">${escapeHtml(row.answered || "0")}</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Time Taken</div><div class="result-detail-v">${escapeHtml(row.time_taken || "0")}s</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Status</div><div class="result-detail-v">${escapeHtml(row.status || "")}</div></div>
            <div class="result-detail-tile"><div class="result-detail-k">Submitted</div><div class="result-detail-v">${escapeHtml(formatSubmitted(row.submitted_at || ""))}</div></div>
          </div>
        </div>
      `;

      document.getElementById("modalPrintSingleBtn")?.addEventListener("click", () => {
        printRows([row], `EMIS Result Summary - ${row.fullname || row.username || "Candidate"}`);
      });

      document.getElementById("modalSendSingleEdaBtn")?.addEventListener("click", async () => {
        await sendRowsToEda([row]);
      });
    }

    async function copyEmail(row) {
      if (!row.email) {
        showToast("No email found for this candidate", "error");
        return;
      }

      try {
        await navigator.clipboard.writeText(row.email);
        showToast("Candidate email copied", "success");
      } catch {
        showToast("Failed to copy email", "error");
      }
    }

    function exportSingleRow(row) {
      exportRowsCSV([row], `${row.username || "result"}_result.csv`);
    }

    function printSingleRow(row) {
      printRows([row], `EMIS Result Summary - ${row.fullname || row.username || "Candidate"}`);
    }

    async function deleteSingleRow(row) {
      if (!row) return;

      const candidateName = row.fullname || row.username || "this candidate";
      const ok = window.confirm(`Delete result for ${candidateName}? This cannot be undone.`);
      if (!ok) return;

      try {
        const res = await fetch("/delete_result", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: row.username || "",
            subject: row.subject || "",
            submitted_at: row.submitted_at || "",
            email: row.email || ""
          })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.success === false) {
          throw new Error(data.message || data.error || "Failed to delete result");
        }

        const key = getResultKey(row);
        latestResults = latestResults.filter((r) => getResultKey(r) !== key);
        filteredResults = filteredResults.filter((r) => getResultKey(r) !== key);
        selectedResultKeys.delete(key);

        applyResultFilters();
        updateStats(latestResults, latestCredentials);
        updateBulkBar();
        syncResultsViews();

        showToast(data.message || "Result deleted successfully", "success");
      } catch (err) {
        console.error("[dashboard_results] deleteSingleRow failed:", err);
        showToast(err.message || "Failed to delete result", "error");
      }
    }

    async function deleteSelectedRows(rows) {
      if (!rows.length) {
        showToast("No selected results to delete", "error");
        return;
      }

      const ok = window.confirm(`Delete ${rows.length} selected result(s)? This cannot be undone.`);
      if (!ok) return;

      try {
        const res = await fetch("/delete_results_bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ results: rows })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.success === false) {
          throw new Error(data.message || data.error || "Bulk delete failed");
        }

        const deletedKeys = new Set(rows.map(getResultKey));

        latestResults = latestResults.filter((r) => !deletedKeys.has(getResultKey(r)));
        filteredResults = filteredResults.filter((r) => !deletedKeys.has(getResultKey(r)));

        deletedKeys.forEach((key) => selectedResultKeys.delete(key));

        applyResultFilters();
        updateStats(latestResults, latestCredentials);
        updateBulkBar();
        syncResultsViews();

        showToast(data.message || "Selected results deleted successfully", "success");
      } catch (err) {
        console.error("[dashboard_results] deleteSelectedRows failed:", err);
        showToast(err.message || "Failed to delete selected results", "error");
      }
    }

    async function sendRowsToEda(rows) {
      if (!rows.length) {
        showToast("No result selected", "error");
        return;
      }

      try {
        const res = await fetch("/api/results/send-to-eda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results: rows })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.success === false) {
          throw new Error(data.error || "Failed to send to EDA");
        }

        showToast(data.message || "Result sent to EDA", "success");
      } catch (err) {
        console.error("[dashboard_results] sendRowsToEda failed:", err);
        showToast(err.message || "Send to EDA failed", "error");
      }
    }

    // --------------------------------------------------
    // Results table rendering
    // --------------------------------------------------
    function renderResultsTable(rows) {
      if (!Array.isArray(rows) || !rows.length) {
        return "<p class='muted'>No exam results yet.</p>";
      }

      return `
        <div class="table-actions" style="margin-bottom:.75rem;">
          <input id="searchResultsDynamic" class="form-input" style="max-width:280px;" placeholder="Search name, subject, email..." />
        </div>
        <table class="modern-table w-full">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Subject</th>
              <th>Score</th>
              <th>Correct</th>
              <th>Total</th>
              <th>Answered</th>
              <th>Time</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td>${escapeHtml(r.username || "")}</td>
                <td>${escapeHtml(r.fullname || "")}</td>
                <td>${escapeHtml(r.email || "")}</td>
                <td>${escapeHtml(r.subject || "")}</td>
                <td>${escapeHtml(r.score || "0")}%</td>
                <td>${escapeHtml(r.correct || "0")}</td>
                <td>${escapeHtml(r.total || "0")}</td>
                <td>${escapeHtml(r.answered || "0")}</td>
                <td>${escapeHtml(r.time_taken || "0")}s</td>
                <td>${escapeHtml(r.status || "")}</td>
                <td>${escapeHtml(r.submitted_at || "")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    function renderResultsPanelTable() {
      if (!resultsTable) return;

      const pageRows = getVisiblePageRows();

      if (!filteredResults.length) {
        resultsTable.innerHTML = `
          <tbody>
            <tr>
              <td class="muted" style="padding:1rem;">No exam results match the current filters.</td>
            </tr>
          </tbody>
        `;
        updateResultsMeta();
        return;
      }

      resultsTable.classList.toggle("compact", compactMode);

      resultsTable.innerHTML = `
        <thead>
          <tr>
            <th style="width:40px;">
              <input type="checkbox" id="resultsSelectAllPage">
            </th>
            <th class="sortable-head" data-sort-mode="name_asc">Candidate</th>
            <th>Email</th>
            <th class="sortable-head" data-sort-mode="subject_asc">Subject</th>
            <th class="sortable-head" data-sort-mode="score_desc">Score</th>
            <th>Correct / Total</th>
            <th>Answered</th>
            <th>Time</th>
            <th>Status</th>
            <th class="sortable-head" data-sort-mode="submitted_desc">Submitted</th>
            <th style="min-width:260px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map((r) => {
            const key = getResultKey(r);
            const selected = selectedResultKeys.has(key) ? "checked" : "";

            return `
              <tr data-result-key="${escapeHtml(key)}">
                <td>
                  <input class="result-row-check" type="checkbox" data-result-key="${escapeHtml(key)}" ${selected}>
                </td>
                <td>
                  <div class="result-name-cell">
                    <span class="result-name-main">${escapeHtml(r.fullname || "—")}</span>
                    <span class="result-name-sub">@${escapeHtml(r.username || "")}</span>
                  </div>
                </td>
                <td>${escapeHtml(r.email || "")}</td>
                <td>${escapeHtml(r.subject || "")}</td>
                <td><span class="${getScoreBadge(r.score)}">${escapeHtml(r.score || "0")}%</span></td>
                <td>${escapeHtml(r.correct || "0")} / ${escapeHtml(r.total || "0")}</td>
                <td>${escapeHtml(r.answered || "0")}</td>
                <td>${escapeHtml(r.time_taken || "0")}s</td>
                <td><span class="${getStatusBadge(r.status)}">${escapeHtml(r.status || "")}</span></td>
                <td>${escapeHtml(formatSubmitted(r.submitted_at || ""))}</td>
                <td>
                  <div class="result-action-group">
                    <button class="result-icon-btn primary action-view" type="button" data-result-key="${escapeHtml(key)}">View</button>
                    <button class="result-icon-btn success action-eda" type="button" data-result-key="${escapeHtml(key)}">Send to EDA</button>
                    <button class="result-icon-btn warn action-print" type="button" data-result-key="${escapeHtml(key)}">Print</button>
                    <button class="result-icon-btn action-csv" type="button" data-result-key="${escapeHtml(key)}">CSV</button>
                    <button class="result-icon-btn action-copy-email" type="button" data-result-key="${escapeHtml(key)}">Copy Email</button>
                    <button class="result-icon-btn danger action-delete" type="button" data-result-key="${escapeHtml(key)}">Delete</button>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      `;

      enableSort(resultsTable);

      const pageKeys = pageRows.map(getResultKey);
      const selectAllPage = document.getElementById("resultsSelectAllPage");

      if (selectAllPage) {
        const allChecked = pageKeys.length > 0 && pageKeys.every((k) => selectedResultKeys.has(k));
        selectAllPage.checked = allChecked;

        selectAllPage.addEventListener("change", (e) => {
          pageKeys.forEach((k) => {
            if (e.target.checked) selectedResultKeys.add(k);
            else selectedResultKeys.delete(k);
          });
          renderResultsPanelTable();
          updateBulkBar();
        });
      }

      resultsTable.querySelectorAll(".result-row-check").forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          toggleResultSelection(e.target.dataset.resultKey, e.target.checked);
        });
      });

      resultsTable.querySelectorAll(".action-view").forEach((btn) => {
        btn.addEventListener("click", () => {
          const row = latestResults.find((r) => getResultKey(r) === btn.dataset.resultKey);
          if (row) viewSingleResult(row);
        });
      });

      resultsTable.querySelectorAll(".action-eda").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const row = latestResults.find((r) => getResultKey(r) === btn.dataset.resultKey);
          if (row) await sendRowsToEda([row]);
        });
      });

      resultsTable.querySelectorAll(".action-print").forEach((btn) => {
        btn.addEventListener("click", () => {
          const row = latestResults.find((r) => getResultKey(r) === btn.dataset.resultKey);
          if (row) printSingleRow(row);
        });
      });

      resultsTable.querySelectorAll(".action-csv").forEach((btn) => {
        btn.addEventListener("click", () => {
          const row = latestResults.find((r) => getResultKey(r) === btn.dataset.resultKey);
          if (row) exportSingleRow(row);
        });
      });

      resultsTable.querySelectorAll(".action-copy-email").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const row = latestResults.find((r) => getResultKey(r) === btn.dataset.resultKey);
          if (row) await copyEmail(row);
        });
      });

      resultsTable.querySelectorAll(".action-delete").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const row = latestResults.find((r) => getResultKey(r) === btn.dataset.resultKey);
          if (row) await deleteSingleRow(row);
        });
      });

      updateResultsMeta();
    }

    // --------------------------------------------------
    // Dashboard stats / feeds
    // --------------------------------------------------
    function updateStats(results = [], creds = []) {
      if (statTotalStudents) statTotalStudents.textContent = String(creds.length);

      if (statActiveExams) {
        const subjects = new Set(
          creds.map((c) => String(c.subject || "").trim()).filter(Boolean)
        );
        statActiveExams.textContent = String(subjects.size);
      }

      if (statPending) {
        const pending = results.filter((r) => String(r.status || "").toLowerCase() !== "completed").length;
        statPending.textContent = String(pending);
      }

      if (statAvg) {
        if (!results.length) {
          statAvg.textContent = "--";
        } else {
          const total = results.reduce((sum, r) => sum + parseScore(r.score), 0);
          statAvg.textContent = `${Math.round(total / results.length)}%`;
        }
      }
    }

    function updateFeeds(results = []) {
      if (!results.length) {
        if (notificationsPanel) {
          notificationsPanel.innerHTML = `
            <div class="empty-state compact-empty">
              <div class="empty-state-icon"><i class="fas fa-bell-slash"></i></div>
              <p class="muted">No notifications yet</p>
            </div>
          `;
        }

        if (notificationsPanelFull) {
          notificationsPanelFull.innerHTML = "<p class='muted'>No notifications yet</p>";
        }

        if (recentActivity) {
          recentActivity.innerHTML = `
            <div class="empty-state compact-empty">
              <div class="empty-state-icon"><i class="fas fa-wave-square"></i></div>
              <p class="muted">No activity logged</p>
            </div>
          `;
        }

        if (recentActivityFull) {
          recentActivityFull.innerHTML = "<p class='muted'>No activity logged</p>";
        }
        return;
      }

      const latest = results[0];

      const notificationHtml = `
        <div class="mini-feed-item">
          <div class="mini-feed-icon"><i class="fas fa-square-poll-vertical"></i></div>
          <div class="mini-feed-body">
            <div class="mini-feed-title">New result received</div>
            <div class="mini-feed-text">
              ${escapeHtml(latest.fullname || latest.username || "Candidate")} submitted
              ${escapeHtml(latest.subject || "exam")} with score
              ${escapeHtml(latest.score || "0")}%.
            </div>
          </div>
          <div class="mini-feed-time">Latest</div>
        </div>
      `;

      const activityHtml = `
        <div class="mini-feed-item">
          <div class="mini-feed-icon"><i class="fas fa-user-check"></i></div>
          <div class="mini-feed-body">
            <div class="mini-feed-title">Exam submission recorded</div>
            <div class="mini-feed-text">
              ${escapeHtml(latest.username || "Candidate")} finished
              ${escapeHtml(latest.subject || "exam")} (${escapeHtml(latest.status || "completed")}).
            </div>
          </div>
          <div class="mini-feed-time">Latest</div>
        </div>
      `;

      if (notificationsPanel) notificationsPanel.innerHTML = notificationHtml;
      if (notificationsPanelFull) notificationsPanelFull.innerHTML = notificationHtml;
      if (recentActivity) recentActivity.innerHTML = activityHtml;
      if (recentActivityFull) recentActivityFull.innerHTML = activityHtml;
    }

    // --------------------------------------------------
    // Data fetchers
    // --------------------------------------------------
    async function fetchCredentials(target = credentialsWrapper) {
      if (!target) return;
      target.innerHTML = skeletonLoader(3, 4);

      try {
        const res = await fetch("/view_credentials", { cache: "no-store" });
        const data = await res.json();
        const creds = Array.isArray(data.credentials) ? data.credentials : [];

        latestCredentials = creds;
        target.innerHTML = renderCredentialsTable(creds);
        updateStats(latestResults, latestCredentials);
      } catch (err) {
        console.error("[dashboard_results] fetchCredentials failed:", err);
        target.innerHTML = "<p class='muted'>Failed to load credentials.</p>";
        showToast("Failed to load credentials", "error");
      }
    }

    async function fetchResults(target = resultsWrapper) {
      if (!target) return;
      target.innerHTML = skeletonLoader(4, 11);

      try {
        const res = await fetch("/view_results", { cache: "no-store" });
        const data = await res.json();
        const rows = Array.isArray(data.results) ? data.results : [];

        latestResults = rows;
        filteredResults = [...rows];
        selectedResultKeys.clear();
        currentPage = 1;

        target.innerHTML = renderResultsTable(rows);
        const dynamicSearch = target.querySelector("#searchResultsDynamic");
        enableSearch(dynamicSearch);

        populateSubjectFilter(latestResults);
        applyResultFilters();
        updateStats(latestResults, latestCredentials);
        updateFeeds(latestResults);
      } catch (err) {
        console.error("[dashboard_results] fetchResults failed:", err);
        target.innerHTML = "<p class='muted'>Failed to load results.</p>";
        showToast("Failed to load results", "error");
      }
    }

    // --------------------------------------------------
    // Dashboard buttons — credentials
    // --------------------------------------------------
    dashboardViewCredsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(credentialsModal);
      fetchCredentials(credsModalBody);
    });

    dashboardRefreshCredsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      fetchCredentials(credentialsWrapper);
    });

    dashboardExportCredsBtn?.addEventListener("click", (e) => {
      e.preventDefault();

      if (!latestCredentials.length) {
        showToast("No credentials to export", "error");
        return;
      }

      downloadBlob(
        "credentials_export.csv",
        [
          "username,password,subject,issued",
          ...latestCredentials.map((r) =>
            `"${r.username || ""}","${r.password || ""}","${r.subject || ""}","${r.issued ? "Yes" : "No"}"`
          )
        ].join("\n"),
        "text/csv;charset=utf-8"
      );

      showToast("credentials_export.csv exported", "success");
    });

    dashboardClearCredsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      latestCredentials = [];
      if (credentialsWrapper) {
        credentialsWrapper.innerHTML = "<p class='muted'>No credentials data yet.</p>";
      }
      updateStats(latestResults, latestCredentials);
      showToast("Credentials table cleared", "info");
    });

    // --------------------------------------------------
    // Dashboard buttons — results
    // --------------------------------------------------
    dashboardViewResultsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(resultsModal);
      fetchResults(resultsModalBody);
    });

    dashboardRefreshResultsBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      await fetchResults(resultsWrapper);
    });

    dashboardExportResultsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      exportRowsCSV(latestResults, "results_export.csv");
    });

    dashboardClearResultsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      latestResults = [];
      filteredResults = [];
      selectedResultKeys.clear();

      if (resultsWrapper) {
        resultsWrapper.innerHTML = "<p class='muted'>No results yet.</p>";
      }

      renderResultsPanelTable();
      updateStats(latestResults, latestCredentials);
      updateFeeds(latestResults);
      updateBulkBar();
      showToast("Results table cleared", "info");
    });

    // --------------------------------------------------
    // Modal controls
    // --------------------------------------------------
    refreshCredsModal?.addEventListener("click", (e) => {
      e.preventDefault();
      fetchCredentials(credsModalBody);
    });

    refreshResultsModal?.addEventListener("click", (e) => {
      e.preventDefault();
      fetchResults(resultsModalBody);
    });

    exportCredsModal?.addEventListener("click", (e) => {
      e.preventDefault();

      const table = credsModalBody?.querySelector("table");
      if (!table) {
        showToast("No credentials to export", "error");
        return;
      }

      const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.children).map((td) => `"${td.innerText.replaceAll('"', '""')}"`).join(",")
      );

      downloadBlob("credentials_export.csv", rows.join("\n"), "text/csv;charset=utf-8");
      showToast("credentials_export.csv exported", "success");
    });

    exportResultsModal?.addEventListener("click", (e) => {
      e.preventDefault();
      exportRowsCSV(latestResults, "results_export.csv");
    });

    closeCredsModal?.addEventListener("click", () => closeModal(credentialsModal));
    closeResultsModal?.addEventListener("click", () => closeModal(resultsModal));

    credentialsModal?.addEventListener("click", (e) => {
      if (e.target === credentialsModal) closeModal(credentialsModal);
    });

    resultsModal?.addEventListener("click", (e) => {
      if (e.target === resultsModal) closeModal(resultsModal);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal(credentialsModal);
        closeModal(resultsModal);
      }
    });

    // --------------------------------------------------
    // Dedicated Results page controls
    // --------------------------------------------------
    panelRefreshResultsBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      await fetchResults(resultsWrapper);
      showToast("Results refreshed", "success");
    });

    panelDeleteSelectedResultsBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      await deleteSelectedRows(getSelectedRows());
    });

    resultsBulkDeleteBtn?.addEventListener("click", async () => {
      await deleteSelectedRows(getSelectedRows());
    });

    panelCompactToggleBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      compactMode = !compactMode;
      panelCompactToggleBtn.textContent = compactMode ? "Comfort View" : "Compact View";
      renderResultsPanelTable();
    });

    panelOpenResultsModalBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(resultsModal);
      window.showResultsModal(latestResults);
    });

    panelSearchResults?.addEventListener("input", () => {
      currentPage = 1;
      applyResultFilters();
    });

    resultsSubjectFilter?.addEventListener("change", () => {
      currentPage = 1;
      applyResultFilters();
    });

    resultsStatusFilter?.addEventListener("change", () => {
      currentPage = 1;
      applyResultFilters();
    });

    resultsScoreFilter?.addEventListener("change", () => {
      currentPage = 1;
      applyResultFilters();
    });

    resultsSortBy?.addEventListener("change", () => {
      currentPage = 1;
      applyResultFilters();
    });

    resultsPageSize?.addEventListener("change", () => {
      currentPage = 1;
      applyResultFilters();
    });

    panelResetResultsFiltersBtn?.addEventListener("click", (e) => {
      e.preventDefault();

      if (panelSearchResults) panelSearchResults.value = "";
      if (resultsSubjectFilter) resultsSubjectFilter.value = "";
      if (resultsStatusFilter) resultsStatusFilter.value = "";
      if (resultsScoreFilter) resultsScoreFilter.value = "";
      if (resultsSortBy) resultsSortBy.value = "submitted_desc";
      if (resultsPageSize) resultsPageSize.value = "20";

      currentPage = 1;
      applyResultFilters();
      showToast("Filters reset", "success");
    });

    resultsPrevPageBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = Math.max(1, currentPage - 1);
      renderResultsPanelTable();
      updateResultsMeta();
    });

    resultsNextPageBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
      currentPage = Math.min(totalPages, currentPage + 1);
      renderResultsPanelTable();
      updateResultsMeta();
    });

    panelDownloadResultsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      exportRowsCSV(filteredResults, "results_export.csv");
    });

    panelDownloadSelectedResultsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      exportRowsCSV(getSelectedRows(), "selected_results_export.csv");
    });

    panelPrintResultsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      printRows(filteredResults, "EMIS Exam Results");
    });

    panelPrintSelectedResultsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      printRows(getSelectedRows(), "EMIS Selected Results");
    });

    panelSendSelectedToEdaBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      await sendRowsToEda(getSelectedRows());
    });

    resultsBulkSelectAllVisibleBtn?.addEventListener("click", () => {
      getVisiblePageRows().forEach((r) => selectedResultKeys.add(getResultKey(r)));
      renderResultsPanelTable();
      updateBulkBar();
    });

    resultsBulkClearBtn?.addEventListener("click", () => {
      selectedResultKeys.clear();
      renderResultsPanelTable();
      updateBulkBar();
    });

    resultsBulkExportBtn?.addEventListener("click", () => {
      exportRowsCSV(getSelectedRows(), "selected_results_export.csv");
    });

    resultsBulkPrintBtn?.addEventListener("click", () => {
      printRows(getSelectedRows(), "EMIS Selected Results");
    });

    resultsBulkSendBtn?.addEventListener("click", async () => {
      await sendRowsToEda(getSelectedRows());
    });

    // --------------------------------------------------
    // Public modal helpers
    // --------------------------------------------------
    window.showCredentialsModal = async function (credentials = []) {
      openModal(credentialsModal);

      if (!credentials.length) {
        await fetchCredentials(credsModalBody);
        return;
      }

      credsModalBody.innerHTML = renderCredentialsTable(credentials);
    };

    window.showResultsModal = async function (results = []) {
      openModal(resultsModal);

      if (!results.length) {
        await fetchResults(resultsModalBody);
        return;
      }

      resultsModalBody.innerHTML = renderResultsTable(results);
      const search = resultsModalBody.querySelector("#searchResultsDynamic");
      enableSearch(search);
    };

    // --------------------------------------------------
    // Init
    // --------------------------------------------------
    ensureResultsEnhancementStyles();
    fetchCredentials(credentialsWrapper);
    fetchResults(resultsWrapper);

    console.log("[dashboard_results] v6 initialized");
  });
})();