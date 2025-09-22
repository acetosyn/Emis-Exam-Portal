/* admin2.js — UI placeholders only
   All backend/logic removed.
   Just keeps Quick Actions + minimal tab structure.
*/

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

  ready(() => {
    console.log("[admin2] initialized (frontend only)");
  });
})();
