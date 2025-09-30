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
  quickActions.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.panel;
      activatePanel(target, btn);
    });
  });

  // -----------------------------
  // Special quick actions (by data-action)
  // -----------------------------
  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;

      switch (action) {
        case "open-candidate-login":
          // Always direct candidates to login page (not portal)
          window.open("/user_login", "_blank");
          break;

        case "refresh-dashboard":
          // Example: quick refresh action
          location.reload();
          break;

        // Add more quick actions here
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
