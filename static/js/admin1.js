/* ==========================================================
   admin2.js — EMIS Admin Features v2
   Handles:
   - toast system
   - notification placeholders
   - quick tools demo actions
   - link generation helpers
   - panel-specific extra actions
   - small UX glue for new dashboard
========================================================== */

(() => {
  if (window.__ADMIN_FEATURES_V2_INIT__) return;
  window.__ADMIN_FEATURES_V2_INIT__ = true;

  const DEBUG = true;
  const log = (...args) => DEBUG && console.log("[admin2:v2]", ...args);

  const ready = (cb) => {
    if (document.readyState !== "loading") cb();
    else document.addEventListener("DOMContentLoaded", cb);
  };

  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const $ = (selector, root = document) => root.querySelector(selector);

  ready(() => {
    const notificationsPanel = document.getElementById("notificationsPanel");
    const notificationsPanelFull = document.getElementById("notificationsPanelFull");
    const recentActivity = document.getElementById("recentActivity");
    const recentActivityFull = document.getElementById("recentActivityFull");

    const notifBtn = document.getElementById("notifBtn");
    const notifBtnHeader = document.getElementById("notifBtnHeader");
    const notifCount = document.getElementById("notifCount");
    const notifCountHeader = document.getElementById("notifCountHeader");

    const candidateLink = document.getElementById("candidateLink");
    const generateLinkBtn = document.getElementById("generateLinkBtn");
    const copyLinkBtn = document.getElementById("copyLinkBtn");
    const openLinkBtn = document.getElementById("openLinkBtn");
    const autoLinkBtn = document.getElementById("autoLinkBtn");
    const regenLinkBtn = document.getElementById("regenLinkBtn");

    /* ==========================================================
       TOAST
    ========================================================== */
    function showToast(message, type = "info") {
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add("visible");
      });

      setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
      }, 2600);
    }

    window.showToast = showToast;

    /* ==========================================================
       DEMO NOTIFICATIONS / ACTIVITY
    ========================================================== */
    const notifications = [
      {
        icon: "fa-bell",
        title: "System ready",
        text: "Admin dashboard loaded successfully.",
        time: "Just now",
      },
      {
        icon: "fa-folder-open",
        title: "Uploads section available",
        text: "You can now add new exam documents.",
        time: "Today",
      },
    ];

    const activities = [
      {
        icon: "fa-right-to-bracket",
        title: "Admin session started",
        text: "Dashboard session is active.",
        time: "Now",
      },
    ];

    function renderNotificationItem(item) {
      return `
        <div class="mini-feed-item">
          <div class="mini-feed-icon"><i class="fas ${item.icon}"></i></div>
          <div class="mini-feed-body">
            <div class="mini-feed-title">${item.title}</div>
            <div class="mini-feed-text">${item.text}</div>
          </div>
          <div class="mini-feed-time">${item.time}</div>
        </div>
      `;
    }

    function renderActivityItem(item) {
      return `
        <div class="mini-feed-item">
          <div class="mini-feed-icon"><i class="fas ${item.icon}"></i></div>
          <div class="mini-feed-body">
            <div class="mini-feed-title">${item.title}</div>
            <div class="mini-feed-text">${item.text}</div>
          </div>
          <div class="mini-feed-time">${item.time}</div>
        </div>
      `;
    }

    function renderFeeds() {
      if (notificationsPanel) {
        notificationsPanel.innerHTML = notifications.length
          ? notifications.map(renderNotificationItem).join("")
          : `<div class="empty-state compact-empty"><div class="empty-state-icon"><i class="fas fa-bell-slash"></i></div><p class="muted">No notifications yet</p></div>`;
      }

      if (notificationsPanelFull) {
        notificationsPanelFull.innerHTML = notifications.length
          ? notifications.map(renderNotificationItem).join("")
          : `<p class="muted">No notifications yet</p>`;
      }

      if (recentActivity) {
        recentActivity.innerHTML = activities.length
          ? activities.map(renderActivityItem).join("")
          : `<div class="empty-state compact-empty"><div class="empty-state-icon"><i class="fas fa-wave-square"></i></div><p class="muted">No activity logged</p></div>`;
      }

      if (recentActivityFull) {
        recentActivityFull.innerHTML = activities.length
          ? activities.map(renderActivityItem).join("")
          : `<p class="muted">No activity logged</p>`;
      }

      const count = notifications.length;
      [notifCount, notifCountHeader].forEach((el) => {
        if (!el) return;
        el.textContent = String(count);
        el.classList.toggle("hidden", count <= 0);
      });
    }

    renderFeeds();

    /* ==========================================================
       NOTIFICATION BUTTONS -> OPEN NOTIFICATIONS PANEL
    ========================================================== */
    function openNotificationsPanel() {
      document.querySelectorAll(".route").forEach((panel) => panel.classList.remove("is-active"));
      const panel = document.querySelector("#panel-notifications");
      if (panel) panel.classList.add("is-active");

      const pageTitle = document.querySelector(".page-title");
      const breadcrumbs = document.getElementById("breadcrumbs");
      if (pageTitle) pageTitle.textContent = "Notifications Center";
      if (breadcrumbs) breadcrumbs.textContent = "Home / Notifications Center";

      document.querySelectorAll(".nav-item, .nav-subitem").forEach((el) => {
        el.classList.remove("is-active");
      });

      document
        .querySelector('.nav-item[data-panel="#panel-notifications"]')
        ?.classList.add("is-active");

      panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    notifBtn?.addEventListener("click", openNotificationsPanel);
    notifBtnHeader?.addEventListener("click", openNotificationsPanel);

    /* ==========================================================
       QUICK TOOL ACTIONS
    ========================================================== */
    window.notifyDirector = () => showToast("Director notified", "success");
    window.sendAdmitMails = () => showToast("Admit emails sent", "success");
    window.sendRejectMails = () => showToast("Reject emails sent", "success");

    document.querySelectorAll('[data-action="notify-director"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showToast("Director notified", "success");
      });
    });

    document.querySelectorAll('[data-action="send-admit-mails"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showToast("Admit emails sent", "success");
      });
    });

    document.querySelectorAll('[data-action="send-reject-mails"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showToast("Reject emails sent", "success");
      });
    });

    /* ==========================================================
       CANDIDATE LOGIN LINK GENERATOR
    ========================================================== */
    function buildCandidateLoginLink() {
      const base = window.location.origin;
      const loginPath = window.USER_LOGIN_URL || "/user_login";
      return `${base}${loginPath}`;
    }

    function setCandidateLink() {
      if (!candidateLink) return;
      candidateLink.value = buildCandidateLoginLink();
    }

    generateLinkBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      setCandidateLink();
      showToast("Candidate login link generated", "success");
    });

    autoLinkBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      setCandidateLink();
      showToast("Candidate login link generated and ready", "success");
    });

    regenLinkBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      setCandidateLink();
      showToast("Candidate login link regenerated", "success");
    });

    copyLinkBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!candidateLink) return;

      if (!candidateLink.value.trim()) {
        setCandidateLink();
      }

      try {
        await navigator.clipboard.writeText(candidateLink.value);
        showToast("Link copied", "success");
      } catch {
        showToast("Failed to copy link", "error");
      }
    });

    openLinkBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      window.open(window.USER_LOGIN_URL || "/user_login", "_blank");
    });

    /* ==========================================================
       PANEL CHANGE LISTENER
    ========================================================== */
    window.addEventListener("admin:panel-change", (e) => {
      const panel = e.detail?.panel;
      log("Panel changed:", panel);

      if (panel === "#panel-link" && candidateLink && !candidateLink.value) {
        setCandidateLink();
      }
    });

    /* ==========================================================
       MINI FEED STYLES INJECTOR
       keeps dashboard feed items looking okay even if CSS lacks them
    ========================================================== */
    if (!document.getElementById("admin2-inline-feed-style")) {
      const style = document.createElement("style");
      style.id = "admin2-inline-feed-style";
      style.textContent = `
        .mini-feed-item{
          display:grid;
          grid-template-columns:40px 1fr auto;
          gap:.7rem;
          align-items:start;
          padding:.75rem;
          border:1px solid #e6edf5;
          background:linear-gradient(180deg,#ffffff,#f8fbff);
          border-radius:16px;
        }
        .mini-feed-icon{
          width:40px;
          height:40px;
          border-radius:14px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:linear-gradient(135deg,#eff6ff,#dbeafe);
          color:#2563eb;
          font-size:.9rem;
        }
        .mini-feed-title{
          font-size:.82rem;
          font-weight:800;
          color:#0f2b46;
          line-height:1.15;
        }
        .mini-feed-text{
          font-size:.75rem;
          color:#64748b;
          margin-top:.16rem;
          line-height:1.35;
        }
        .mini-feed-time{
          font-size:.68rem;
          color:#94a3b8;
          font-weight:700;
          white-space:nowrap;
          margin-top:.1rem;
        }
      `;
      document.head.appendChild(style);
    }

    log("Admin features v2 initialized");
  });
})();