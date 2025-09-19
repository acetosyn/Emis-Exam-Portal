// Utility functions for EMIS Exam Portal

// DOM ready function
function ready(fn) {
  if (document.readyState !== "loading") {
    fn()
  } else {
    document.addEventListener("DOMContentLoaded", fn)
  }
}

// Show/hide loading spinner
function showLoading(element) {
  if (element) {
    element.innerHTML = '<div class="spinner mx-auto"></div>'
    element.disabled = true
  }
}

function hideLoading(element, originalText) {
  if (element) {
    element.innerHTML = originalText
    element.disabled = false
  }
}

// Toast notification system
function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div")
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium slide-up ${
    type === "success"
      ? "bg-green-500"
      : type === "error"
        ? "bg-red-500"
        : type === "warning"
          ? "bg-yellow-500"
          : "bg-blue-500"
  }`
  toast.textContent = message

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateX(100%)"
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, duration)
}

// Local storage helpers
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error("Error saving to localStorage:", error)
    return false
  }
}

function getFromStorage(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error("Error reading from localStorage:", error)
    return null
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error("Error removing from localStorage:", error)
    return false
  }
}

// Session storage helpers
function saveToSession(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error("Error saving to sessionStorage:", error)
    return false
  }
}

function getFromSession(key) {
  try {
    const data = sessionStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error("Error reading from sessionStorage:", error)
    return null
  }
}

// Format time helper
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// Prevent right-click and copy
function enableAntiCheat() {
  // Disable right-click
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault()
    showToast("Right-click is disabled during the exam", "warning")
  })

  // Disable text selection
  document.addEventListener("selectstart", (e) => {
    e.preventDefault()
  })

  // Disable copy shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "c" || e.key === "a" || e.key === "v" || e.key === "x")) {
      e.preventDefault()
      showToast("Copy/paste is disabled during the exam", "warning")
    }

    // Disable F12, Ctrl+Shift+I, Ctrl+U
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I") || (e.ctrlKey && e.key === "u")) {
      e.preventDefault()
      showToast("Developer tools are disabled during the exam", "warning")
    }
  })
}

// Fullscreen helpers
function requestFullscreen() {
  const elem = document.documentElement
  if (elem.requestFullscreen) {
    elem.requestFullscreen()
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen()
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen()
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen()
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen()
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen()
  }
}

// Tab visibility detection
let tabSwitchCount = 0
function setupTabSwitchDetection(callback) {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      tabSwitchCount++
      if (tabSwitchCount === 1) {
        showToast("Warning: Tab switching detected. Next time will end the exam!", "warning", 5000)
      } else if (tabSwitchCount >= 2) {
        showToast("Exam ended due to multiple tab switches", "error")
        if (callback) callback()
      }
    }
  })
}

// Network status detection
function setupNetworkDetection() {
  function updateNetworkStatus() {
    if (!navigator.onLine) {
      showToast("You are offline. Please check your connection.", "error", 0)
    }
  }

  window.addEventListener("online", () => {
    showToast("Connection restored", "success")
  })

  window.addEventListener("offline", updateNetworkStatus)

  // Initial check
  updateNetworkStatus()
}

// Initialize common features
ready(() => {
  setupNetworkDetection()
})
