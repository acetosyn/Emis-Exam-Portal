// ==========================================================
// admin-routes.js — Unified routing + sidebar submenu support
// Stable version for EMIS admin.html / admin.css
// Fixes:
// - Exams dropdown opens reliably
// - panel routing works from sidebar + quick actions
// - active nav state stays in sync
// - mobile sidebar closes correctly after route change
// - dispatches admin:panel-change for other scripts
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  const panels = Array.from(document.querySelectorAll(".route"));
  const breadcrumbs = document.getElementById("breadcrumbs");
  const pageTitle = document.querySelector(".page-title");

  const sidebar = document.getElementById("adminSidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileSidebarOpen = document.getElementById("mobileSidebarOpen");

  const profileBtn = document.getElementById("profileBtn");
  const profileMenu = document.getElementById("profileMenu");

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  function getLabelFromElement(el) {
    if (!el) return "";

    const navLabel = el.querySelector(".nav-label");
    if (navLabel?.textContent?.trim()) return navLabel.textContent.trim();

    const actionCopyStrong = el.querySelector(".action-copy strong");
    if (actionCopyStrong?.textContent?.trim()) return actionCopyStrong.textContent.trim();

    const text = el.textContent?.replace(/\s+/g, " ").trim();
    return text || "";
  }

  function getPanelLabel(panel) {
    if (!panel) return "Dashboard";

    return (
      panel.querySelector(".panel-title")?.textContent?.trim() ||
      panel.querySelector(".card-title")?.textContent?.trim() ||
      panel.querySelector(".section-title-xl")?.textContent?.trim() ||
      panel.getAttribute("data-route")?.replace(/-/g, " ") ||
      "Dashboard"
    );
  }

  function titleCase(str = "") {
    return str.replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function openMobileSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("mobile-open");
    sidebarOverlay?.classList.remove("hidden");
    sidebarOverlay?.classList.add("show");
  }

  function closeMobileSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("mobile-open");
    sidebarOverlay?.classList.remove("show");
    sidebarOverlay?.classList.add("hidden");
  }

  function closeProfileMenu() {
    profileMenu?.classList.add("hidden");
    profileBtn?.setAttribute("aria-expanded", "false");
  }

  function openProfileMenu() {
    profileMenu?.classList.remove("hidden");
    profileBtn?.setAttribute("aria-expanded", "true");
  }

  function closeAllSubmenus(exceptGroup = null) {
    qsa(".nav-group").forEach((group) => {
      if (exceptGroup && group === exceptGroup) return;
      group.classList.remove("open");
      group.querySelector(".nav-parent")?.setAttribute("aria-expanded", "false");
    });
  }

  function highlightNav(targetPanel, triggerEl = null) {
    qsa(".nav-item, .nav-subitem").forEach((btn) => btn.classList.remove("is-active"));

    if (triggerEl) {
      triggerEl.classList.add("is-active");

      const parentGroup = triggerEl.closest(".nav-group");
      if (parentGroup) {
        const parentBtn = parentGroup.querySelector(".nav-parent");
        parentGroup.classList.add("open");
        parentBtn?.classList.add("is-active");
        parentBtn?.setAttribute("aria-expanded", "true");
      }

      return;
    }

    if (!targetPanel) return;

    const matchingSub = qs(`.nav-subitem[data-panel="${targetPanel}"]`);
    if (matchingSub) {
      matchingSub.classList.add("is-active");
      const parentGroup = matchingSub.closest(".nav-group");
      if (parentGroup) {
        const parentBtn = parentGroup.querySelector(".nav-parent");
        parentGroup.classList.add("open");
        parentBtn?.classList.add("is-active");
        parentBtn?.setAttribute("aria-expanded", "true");
      }
      return;
    }

    const matchingNav = qs(`.nav-item[data-panel="${targetPanel}"]`);
    if (matchingNav) {
      matchingNav.classList.add("is-active");
    }
  }

  // ----------------------------------------------------------
  // Core: Activate panel
  // ----------------------------------------------------------
  function activatePanel(target, triggerEl = null, options = {}) {
    if (!target) return;

    const activePanel = qs(target);
    if (!activePanel) {
      console.warn("[admin-routes] Panel not found:", target);
      return;
    }

    panels.forEach((panel) => panel.classList.remove("is-active"));
    activePanel.classList.add("is-active");

    highlightNav(target, triggerEl);

    let label = getLabelFromElement(triggerEl) || getPanelLabel(activePanel);
    label = titleCase(label);

    if (pageTitle && label) pageTitle.textContent = label;
    if (breadcrumbs && label) breadcrumbs.textContent = `Home / ${label}`;

    window.dispatchEvent(
      new CustomEvent("admin:panel-change", {
        detail: {
          panel: target,
          label,
          trigger: triggerEl || null,
        },
      })
    );

    if (!options.skipScroll) {
      activePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (window.innerWidth <= 991) {
      closeMobileSidebar();
    }

    if (!options.skipHash) {
      history.replaceState(null, "", target);
    }
  }

  window.activateAdminPanel = activatePanel;

  // ----------------------------------------------------------
  // Dropdown / submenu toggle
  // ----------------------------------------------------------
  function toggleSubmenu(parentBtn, forceState = null) {
    const submenuSelector = parentBtn?.dataset?.submenu;
    if (!submenuSelector) return;

    const navGroup = parentBtn.closest(".nav-group");
    const submenu = qs(submenuSelector);

    if (!navGroup || !submenu) {
      console.warn("[admin-routes] submenu or nav group not found:", submenuSelector);
      return;
    }

    const isOpen = navGroup.classList.contains("open");
    const willOpen = typeof forceState === "boolean" ? forceState : !isOpen;

    closeAllSubmenus(navGroup);

    navGroup.classList.toggle("open", willOpen);
    parentBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
  }

  function bindSubmenus() {
    qsa(".nav-parent[data-submenu]").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSubmenu(btn);
      });
    });
  }

  // ----------------------------------------------------------
  // ACTION handlers
  // ----------------------------------------------------------
  async function handleAction(action, btn) {
    switch (action) {
      case "open-candidate-login":
        window.open(window.USER_LOGIN_URL || "/user_login", "_blank");
        return;

      case "refresh-dashboard":
        window.location.reload();
        return;

      case "open-upload":
        activatePanel("#panel-uploads", btn);
        return;

      case "view-credentials":
        try {
          const res = await fetch("/view_credentials");
          const data = await res.json();

          if (typeof window.showCredentialsModal === "function") {
            window.showCredentialsModal(data.credentials || []);
          } else if (typeof window.showToast === "function") {
            window.showToast("Credentials modal is not available", "error");
          }
        } catch (err) {
          console.error("[admin-routes] Failed to load credentials", err);
          window.showToast?.("Failed to load credentials", "error");
        }
        return;

      case "view-results":
        try {
          const res = await fetch("/view_results");
          const data = await res.json();

          if (typeof window.showResultsModal === "function") {
            window.showResultsModal(data.results || []);
          } else if (typeof window.showToast === "function") {
            window.showToast("Results modal is not available", "error");
          }
        } catch (err) {
          console.error("[admin-routes] Failed to load results", err);
          window.showToast?.("Failed to load results", "error");
        }
        return;

      case "refresh-results-modal":
        try {
          const res = await fetch("/view_results");
          const data = await res.json();
          window.showResultsModal?.(data.results || []);
        } catch (err) {
          console.error("[admin-routes] Failed to refresh results", err);
          window.showToast?.("Failed to refresh results", "error");
        }
        return;

      case "refresh-creds-modal":
        try {
          const res = await fetch("/view_credentials");
          const data = await res.json();
          window.showCredentialsModal?.(data.credentials || []);
        } catch (err) {
          console.error("[admin-routes] Failed to refresh credentials", err);
          window.showToast?.("Failed to refresh credentials", "error");
        }
        return;

      default:
        console.warn(`[admin-routes] No handler defined for action: ${action}`);
    }
  }

  // ----------------------------------------------------------
  // Bind direct route buttons
  // ----------------------------------------------------------
  function bindPanelTriggers() {
    qsa("[data-panel]").forEach((btn) => {
      if (btn.dataset.submenu) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = btn.dataset.panel;
        if (!target) return;
        activatePanel(target, btn);
      });
    });
  }

  function bindActionTriggers() {
    qsa("[data-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        await handleAction(btn.dataset.action, btn);
      });
    });
  }

  // ----------------------------------------------------------
  // Open parent submenu if child route already active
  // ----------------------------------------------------------
  function syncOpenSubmenusWithActiveRoute() {
    const activePanel = qs(".route.is-active");
    if (!activePanel) return;

    const panelId = `#${activePanel.id}`;
    const activeSub = qs(`.nav-subitem[data-panel="${panelId}"]`);

    if (activeSub) {
      activeSub.classList.add("is-active");
      const group = activeSub.closest(".nav-group");

      if (group) {
        const parentBtn = group.querySelector(".nav-parent");
        group.classList.add("open");
        parentBtn?.classList.add("is-active");
        parentBtn?.setAttribute("aria-expanded", "true");
      }
      return;
    }

    const activeNav = qs(`.nav-item[data-panel="${panelId}"]`);
    activeNav?.classList.add("is-active");
  }

  // ----------------------------------------------------------
  // Sidebar + overlay controls
  // ----------------------------------------------------------
  sidebarToggle?.addEventListener("click", (e) => {
    e.preventDefault();

    if (window.innerWidth <= 991) {
      if (sidebar.classList.contains("mobile-open")) closeMobileSidebar();
      else openMobileSidebar();
      return;
    }

    sidebar.classList.toggle("collapsed");
  });

  mobileSidebarOpen?.addEventListener("click", (e) => {
    e.preventDefault();
    openMobileSidebar();
  });

  sidebarOverlay?.addEventListener("click", () => {
    closeMobileSidebar();
  });

  // ----------------------------------------------------------
  // Profile dropdown
  // ----------------------------------------------------------
  profileBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isHidden = profileMenu?.classList.contains("hidden");
    if (isHidden) openProfileMenu();
    else closeProfileMenu();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".profile-menu")) {
      closeProfileMenu();
    }
  });

  // ----------------------------------------------------------
  // Keyboard support
  // ----------------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileSidebar();
      closeProfileMenu();
    }
  });

  // ----------------------------------------------------------
  // Initial route
  // ----------------------------------------------------------
  bindSubmenus();
  bindPanelTriggers();
  bindActionTriggers();

  const hashTarget =
    window.location.hash && qs(window.location.hash) ? window.location.hash : null;

  const activeRouteEl = qs(".route.is-active");
  const currentActivePanel = activeRouteEl ? `#${activeRouteEl.id}` : null;

  const initialPanel = hashTarget || currentActivePanel || "#panel-dashboard";

  activatePanel(initialPanel, null, { skipScroll: true, skipHash: false });
  syncOpenSubmenusWithActiveRoute();

  // ----------------------------------------------------------
  // React to hash changes
  // ----------------------------------------------------------
  window.addEventListener("hashchange", () => {
    const target = window.location.hash;
    if (target && qs(target)) {
      activatePanel(target, null, { skipHash: true });
    }
  });

  console.log("[admin-routes] initialized");
});