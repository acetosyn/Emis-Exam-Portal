// user_portal.js — Candidate Portal (Dashboard interactivity)

document.addEventListener("DOMContentLoaded", () => {
  const supportModal = document.getElementById("supportModal");
  const openSupport = document.getElementById("openSupport");
  const closeSupport = document.getElementById("closeSupport");
  const dismissSupport = document.getElementById("dismissSupport");

  // Open support modal
  openSupport?.addEventListener("click", () => {
    supportModal?.classList.remove("hidden");
  });

  function closeModal() {
    supportModal?.classList.add("hidden");
  }

  closeSupport?.addEventListener("click", closeModal);
  dismissSupport?.addEventListener("click", closeModal);

  // Add recent activity on load
  const list = document.getElementById("activityList");
  if (list) {
    const item = document.createElement("div");
    item.className = "up-activity-item";
    item.innerHTML = `
      <div class="dot"></div>
      <div>
        <div class="title">Signed in</div>
        <div class="meta">${new Date().toLocaleString()}</div>
      </div>`;
    list.prepend(item);
  }
});
