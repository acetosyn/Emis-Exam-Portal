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

