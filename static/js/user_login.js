// user_login.js — EMIS Candidate Login (modernized + field-level validation)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("userLoginForm");
  const overlay = document.getElementById("loadingOverlay");
  const passwordToggle = document.querySelector(".toggle-password");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.querySelector(".login-btn");
  const btnText = loginBtn?.querySelector(".btn-text");
  const btnSpinner = loginBtn?.querySelector(".loading-spinner");
  const subjectSelect = document.getElementById("subject");
  const emailInput = document.getElementById("email");
  const fullNameInput = document.getElementById("full-name");
  const usernameInput = document.getElementById("username");
  const genderSelect = document.getElementById("gender");

  const allFields = [
    fullNameInput,
    emailInput,
    genderSelect,
    subjectSelect,
    usernameInput,
    passwordInput
  ].filter(Boolean);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  function showOverlay(message = "Signing you in...") {
    if (!overlay) return;
    const heading = overlay.querySelector("h4");
    if (heading) heading.textContent = message;
    show(overlay);
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function hideOverlay() {
    if (!overlay) return;
    hide(overlay);
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function setButtonLoading(isLoading) {
    if (!loginBtn) return;

    loginBtn.disabled = isLoading;
    loginBtn.classList.toggle("is-loading", isLoading);

    if (btnText) btnText.textContent = isLoading ? "Signing in..." : "Login";
    if (btnSpinner) btnSpinner.classList.toggle("hidden", !isLoading);
  }

  function showToast(message, type = "warning") {
    let stack = document.querySelector(".login-toast-stack");

    if (!stack) {
      stack = document.createElement("div");
      stack.className = "login-toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }

    const toast = document.createElement("div");
    toast.className = `login-toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas ${getToastIcon(type)}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    stack.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    setTimeout(() => {
      toast.classList.remove("is-visible");
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  function getToastIcon(type) {
    switch (type) {
      case "success":
        return "fa-circle-check";
      case "error":
        return "fa-circle-exclamation";
      case "warning":
        return "fa-triangle-exclamation";
      default:
        return "fa-circle-info";
    }
  }

  function escapeHtml(str = "") {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function getFieldWrap(field) {
    return field?.closest(".form-field") || field?.parentElement;
  }

  function getFieldLabel(field) {
    if (field === fullNameInput) return "full name";
    if (field === emailInput) return "email";
    if (field === genderSelect) return "gender";
    if (field === subjectSelect) return "subject";
    if (field === usernameInput) return "username";
    if (field === passwordInput) return "password";
    return "this field";
  }

  function isSelectField(field) {
    return field?.tagName === "SELECT";
  }

  function getRequiredMessage(field) {
    const label = getFieldLabel(field);
    return isSelectField(field)
      ? `Please select ${label}`
      : `Please enter ${label}`;
  }

  function getInvalidMessage(field) {
    if (field === emailInput) return "Please enter a valid email address";
    return getRequiredMessage(field);
  }

  function getErrorElement(field) {
    if (!field) return null;

    let errorEl = field.parentElement?.querySelector(".field-error-message");
    if (errorEl) return errorEl;

    const wrap = getFieldWrap(field);
    if (!wrap) return null;

    errorEl = wrap.querySelector(".field-error-message");
    if (errorEl) return errorEl;

    errorEl = document.createElement("small");
    errorEl.className = "field-error-message";
    errorEl.setAttribute("aria-live", "polite");

    wrap.appendChild(errorEl);
    return errorEl;
  }

  function showFieldError(field, message) {
    if (!field) return;

    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    getFieldWrap(field)?.classList.add("has-error");

    const errorEl = getErrorElement(field);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add("is-visible");
    }

    if (field.dataset.originalPlaceholder === undefined) {
      field.dataset.originalPlaceholder = field.getAttribute("placeholder") || "";
    }

    if (!isSelectField(field)) {
      field.setAttribute("placeholder", message);
    }
  }

  function clearFieldError(field) {
    if (!field) return;

    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
    getFieldWrap(field)?.classList.remove("has-error");

    const errorEl = getErrorElement(field);
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.remove("is-visible");
    }

    if (!isSelectField(field) && field.dataset.originalPlaceholder !== undefined) {
      field.setAttribute("placeholder", field.dataset.originalPlaceholder);
    }
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  }

  function validateField(field) {
    if (!field) return true;

    clearFieldError(field);

    const value = String(field.value || "").trim();

    if (!value) {
      showFieldError(field, getRequiredMessage(field));
      return false;
    }

    if (field === emailInput && !validateEmail(value)) {
      showFieldError(field, getInvalidMessage(field));
      return false;
    }

    return true;
  }

  function validateForm() {
    let valid = true;

    allFields.forEach((field) => {
      const ok = validateField(field);
      if (!ok) valid = false;
    });

    return valid;
  }

  function getMissingFieldsMessage() {
    const missing = [];

    if (!fullNameInput?.value.trim()) missing.push("full name");
    if (!emailInput?.value.trim()) missing.push("email");
    if (!genderSelect?.value.trim()) missing.push("gender");
    if (!subjectSelect?.value.trim()) missing.push("subject");
    if (!usernameInput?.value.trim()) missing.push("username");
    if (!passwordInput?.value.trim()) missing.push("password");

    if (missing.length === 0 && emailInput && !validateEmail(emailInput.value)) {
      return "Please enter a valid email address.";
    }

    if (!missing.length) return "Please check the form and try again.";

    return `Please fill in: ${missing.join(", ")}.`;
  }

  function persistSubject() {
    if (!subjectSelect) return;
    sessionStorage.setItem("chosenSubject", subjectSelect.value || "");
  }

  function restoreSubject() {
    if (!subjectSelect) return;
    const saved = sessionStorage.getItem("chosenSubject");
    if (saved) subjectSelect.value = saved;
  }

  // --------------------------------------------------
  // Password toggle
  // --------------------------------------------------
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener("click", () => {
      const icon = passwordToggle.querySelector("i");
      const isPassword = passwordInput.type === "password";

      passwordInput.type = isPassword ? "text" : "password";

      if (icon) {
        icon.className = `fas ${isPassword ? "fa-eye-slash" : "fa-eye"}`;
      }

      passwordToggle.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
      );
    });
  }

  // --------------------------------------------------
  // Live validation
  // --------------------------------------------------
  allFields.forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";

    field.addEventListener(eventName, () => {
      validateField(field);

      if (field === subjectSelect) {
        persistSubject();
      }
    });

    field.addEventListener("blur", () => {
      validateField(field);
    });
  });

  restoreSubject();

  // --------------------------------------------------
  // Submit handling
  // --------------------------------------------------
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const valid = validateForm();

      if (!valid) {
        showToast(getMissingFieldsMessage(), "warning");

        const firstInvalid = form.querySelector(".is-invalid");
        if (firstInvalid) firstInvalid.focus();

        hideOverlay();
        setButtonLoading(false);
        return;
      }

      persistSubject();
      setButtonLoading(true);
      showOverlay("Signing you in...");

      setTimeout(() => {
        form.submit();
      }, 700);
    });
  }

  // --------------------------------------------------
  // Focus first field nicely
  // --------------------------------------------------
  setTimeout(() => {
    if (fullNameInput && !fullNameInput.value.trim()) {
      fullNameInput.focus();
    }
  }, 120);

  // --------------------------------------------------
  // Reset UI on back/restore
  // --------------------------------------------------
  window.addEventListener("pageshow", () => {
    hideOverlay();
    setButtonLoading(false);
  });

  // --------------------------------------------------
  // Global helper
  // --------------------------------------------------
  window.showCandidateLoginToast = showToast;
});