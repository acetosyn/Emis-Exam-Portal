/* admin1.js — CORE (frontend only)
   Handles stepper and tabs only (upload logic removed).
*/

(() => {
  if (window.__ADMIN_CORE_INIT__) return;
  window.__ADMIN_CORE_INIT__ = true;

  const DEBUG = true;
  const log = (...a) => DEBUG && console.log("[admin1]", ...a);

  const ready = (cb) =>
    document.readyState !== "loading"
      ? cb()
      : document.addEventListener("DOMContentLoaded", cb);

  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------- Stepper + Tabs ----------------
  function initStepperAndTabs() {
    const steps = qsa("#stepper .step");
    const allTabs = qsa("#segmentTabs .tab");

    function showStep(stepSel) {
      steps.forEach((s) =>
        s.classList.toggle("active", s.getAttribute("data-target") === stepSel)
      );

      // Show right column content
      qsa(".step-specific").forEach((c) => {
        c.classList.toggle("active", "#" + c.id === stepSel + "Content");
        c.classList.toggle("hidden", "#" + c.id !== stepSel + "Content");
      });

      // Show tabs for this step
      allTabs.forEach((btn) => {
        const parent = btn.getAttribute("data-parent");
        const visible = parent === stepSel;
        btn.classList.toggle("hidden", !visible);
        if (!visible) btn.classList.remove("active");
      });
    }

    function activateTab(btn) {
      const parentSel = btn.getAttribute("data-parent");
      const targetSel = btn.getAttribute("data-tab");

      // Highlight tab
      allTabs
        .filter((b) => b.getAttribute("data-parent") === parentSel)
        .forEach((b) => b.classList.toggle("active", b === btn));

      // Toggle tab panels
      qsa(parentSel + " .tab-panel").forEach((p) => {
        p.classList.toggle("active", "#" + p.id === targetSel);
        p.classList.toggle("hidden", "#" + p.id !== targetSel);
      });
    }

    steps.forEach((step) =>
      step.addEventListener("click", () => showStep(step.getAttribute("data-target")))
    );
    allTabs.forEach((btn) =>
      btn.addEventListener("click", () => activateTab(btn))
    );

    showStep("#stepA"); // default
  }

  // ---------------- Init ----------------
  ready(() => {
    log("Core initialized (frontend only)");
    initStepperAndTabs();
  });
})();
