// admin-routes.js — unified panel routing (sidebar + quick actions + special actions)
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item, .nav-subitem");
  const quickActions = document.querySelectorAll("[data-panel]");
  const panels = document.querySelectorAll(".route");
  const breadcrumbs = document.getElementById("breadcrumbs");
  const pageTitle = document.querySelector(".page-title");

  // -----------------------------
  // Core: Activate a panel
  // -----------------------------
  function activatePanel(target, triggerEl = null) {
    if (!target) return;

    // hide all panels
    panels.forEach(panel => panel.classList.remove("is-active"));

    // show selected panel
    const activePanel = document.querySelector(target);
    if (activePanel) {
      activePanel.classList.add("is-active");
    }

    // highlight sidebar nav items only (not quick actions)
    navItems.forEach(btn => btn.classList.remove("is-active"));
    if (triggerEl && triggerEl.classList.contains("nav-item")) {
      triggerEl.classList.add("is-active");
    }

    // update page title + breadcrumbs
    const label =
      triggerEl?.innerText.trim() ||
      activePanel?.querySelector(".panel-title, .card-title")?.textContent ||
      "";
    if (pageTitle && label) pageTitle.textContent = label;
    if (breadcrumbs && label) breadcrumbs.textContent = `Home / ${label}`;
  }

  // -----------------------------
  // Sidebar navigation clicks
  // -----------------------------
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const action = item.dataset.action;
      const target = item.dataset.panel;

      if (action === "open-candidate-login") {
        // Always send candidates to login page first
        window.open("/user_login", "_blank");
        return;
      }

      activatePanel(target, item);
    });
  });

  // -----------------------------
  // Quick action buttons (by data-panel)
  // -----------------------------
// -----------------------------
// Quick action buttons (by data-panel)
// -----------------------------
quickActions.forEach(btn => {
  btn.addEventListener("click", e => {
    // 🛑 Prevent routing for results or credentials popups
    const action = btn.dataset.action;
    if (action === "view-results" || action === "view-credentials") {
      e.preventDefault();
      return; // Skip activating any panel — handled by modal instead
    }

    const target = btn.dataset.panel;
    activatePanel(target, btn);
  });
});

  // -----------------------------
  // Special quick actions (by data-action)
  // -----------------------------
// -----------------------------
// Special quick actions (by data-action)
// -----------------------------
document.querySelectorAll("[data-action]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const action = btn.dataset.action;

    switch (action) {
      case "open-candidate-login":
        // Always direct candidates to login page (not portal)
        window.open("/user_login", "_blank");
        break;

      case "refresh-dashboard":
        // Refresh current dashboard data without leaving page
        location.reload();
        break;

      case "view-credentials":
        // 🔹 Load credentials dynamically into modal (no routing)
        try {
          const res = await fetch("/view_credentials");
          const data = await res.json();
          showCredentialsModal(data.credentials);
        } catch (err) {
          console.error("Failed to load credentials", err);
          showToast("Failed to load credentials", "error");
        }
        break;

      case "view-results":
        // 🔹 Load results dynamically into modal (no routing)
        try {
          const res = await fetch("/view_results");
          const data = await res.json();
          showResultsModal(data.results);
        } catch (err) {
          console.error("Failed to load results", err);
          showToast("Failed to load results", "error");
        }
        break;

      default:
        console.warn(`⚠️ No handler defined for action: ${action}`);
    }
  });
});

  // -----------------------------
  // Default active dashboard
  // -----------------------------
  const defaultPanel = document.querySelector("#panel-dashboard");
  if (defaultPanel) {
    defaultPanel.classList.add("is-active");
  }
});
