document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item, .nav-subitem");
  const panels = document.querySelectorAll(".route");
  const breadcrumbs = document.getElementById("breadcrumbs");
  const pageTitle = document.querySelector(".page-title");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const target = item.dataset.panel;

      if (!target) return;

      // hide all panels
      panels.forEach(panel => panel.classList.remove("is-active"));

      // show selected panel
      const activePanel = document.querySelector(target);
      if (activePanel) {
        activePanel.classList.add("is-active");
      }

      // highlight nav
      navItems.forEach(btn => btn.classList.remove("is-active"));
      item.classList.add("is-active");

      // update page title + breadcrumbs
      const label = item.innerText.trim();
      if (pageTitle) pageTitle.textContent = label;
      if (breadcrumbs) breadcrumbs.textContent = `Home / ${label}`;
    });
  });

  // default active
  const defaultPanel = document.querySelector("#panel-dashboard");
  if (defaultPanel) defaultPanel.classList.add("is-active");
});
