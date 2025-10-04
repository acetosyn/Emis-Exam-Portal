/* admin2.js — UI placeholders and test generate link */

(() => {
  if (window.__ADMIN_FEATURES_INIT__) return;
  window.__ADMIN_FEATURES_INIT__ = true;

  const ready = (cb) =>
    document.readyState !== "loading"
      ? cb()
      : document.addEventListener("DOMContentLoaded", cb);

  function showToast(msg) {
    alert(msg); // simple placeholder
  }

  // Quick actions just demo toasts
  function notifyDirector() { showToast("Director notified (demo)"); }
  function sendAdmitMails() { showToast("Admit emails sent (demo)"); }
  function sendRejectMails() { showToast("Reject emails sent (demo)"); }

  window.notifyDirector = notifyDirector;
  window.sendAdmitMails = sendAdmitMails;
  window.sendRejectMails = sendRejectMails;

  // ---------------- Test Generate Link ----------------
  ready(() => {
    const testLink = document.getElementById("testGenLink");
    if (!testLink) return;

    testLink.addEventListener("click", async (e) => {
      e.preventDefault(); // prevent page jump
      console.log("[TEST] Test Generate link clicked");

      try {
        const res = await fetch("/generate_credentials", {
          method: "POST",
          body: new URLSearchParams({ count: 2 }),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const data = await res.json();
        console.log("[TEST] API response:", data);

        if (res.ok && Array.isArray(data) && data.length > 0) {
          if (window.showCredentials) {
            window.showCredentials(data); // use popup from user-credential.js
          } else {
            alert("Generated " + data.length + " creds. Check console.");
          }
        } else {
          alert(data.error || "Error generating creds. See console.");
        }
      } catch (err) {
        console.error("[TEST] Error:", err);
        alert("Network error. See console.");
      }
    });

    console.log("[admin2] initialized with Test Generate support");
  });
})();




ready(() => {
  // ---------- View Credentials ----------
  const viewCredsBtn = document.getElementById("viewCredsBtn");
  if (viewCredsBtn) {
    viewCredsBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/view_credentials"); // new Flask endpoint
        const data = await res.json();

        if (data.credentials && data.credentials.length > 0) {
          let html = "<h3>Generated Credentials</h3><table class='modern-table'><tr><th>Username</th><th>Password</th></tr>";
          data.credentials.forEach(c => {
            html += `<tr><td>${c.username}</td><td>${c.password}</td></tr>`;
          });
          html += "</table>";
          showPopup(html);
        } else {
          showPopup("<p>⚠️ You haven’t generated any credentials yet. Please generate one.</p>");
        }
      } catch (err) {
        console.error("[admin2] View Credentials error:", err);
        showPopup("<p>❌ Failed to load credentials.</p>");
      }
    });
  }

  // ---------- View Results ----------
  const viewResultsBtn = document.getElementById("viewResultsBtn");
  if (viewResultsBtn) {
    viewResultsBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/view_results"); // new Flask endpoint
        const data = await res.json();

        if (data.results && data.results.length > 0) {
          let html = "<h3>Exam Results</h3><table class='modern-table'><tr><th>User</th><th>Name</th><th>Email</th><th>Subject</th><th>Score</th><th>Status</th></tr>";
          data.results.forEach(r => {
            html += `<tr>
              <td>${r.username}</td>
              <td>${r.fullname}</td>
              <td>${r.email}</td>
              <td>${r.subject}</td>
              <td>${r.score}</td>
              <td>${r.status}</td>
            </tr>`;
          });
          html += "</table>";
          showPopup(html);
        } else {
          showPopup("<p>📭 No results found in the database.</p>");
        }
      } catch (err) {
        console.error("[admin2] View Results error:", err);
        showPopup("<p>❌ Failed to load results.</p>");
      }
    });
  }

  // ---------- Reusable Popup ----------
  function showPopup(content) {
    let modal = document.getElementById("dashboardPopup");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "dashboardPopup";
      modal.className = "modal-backdrop";
      modal.innerHTML = `
        <div class="modal-card small">
          <div class="modal-head">
            <h2>Info</h2>
            <button class="close-x" onclick="document.getElementById('dashboardPopup').remove()">✕</button>
          </div>
          <div class="modal-body" id="popupContent"></div>
        </div>`;
      document.body.appendChild(modal);
    }
    document.getElementById("popupContent").innerHTML = content;
  }
});
