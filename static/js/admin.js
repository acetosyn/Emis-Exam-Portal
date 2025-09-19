// Admin Dashboard JavaScript

let generatedCredentials = []

function ready(callback) {
  if (document.readyState !== "loading") {
    callback()
  } else {
    document.addEventListener("DOMContentLoaded", callback)
  }
}

function getFromStorage(key) {
  return JSON.parse(localStorage.getItem(key))
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function removeFromStorage(key) {
  localStorage.removeItem(key)
}

function removeFromSession(key) {
  sessionStorage.removeItem(key)
}

function showToast(message, type) {
  const toast = document.createElement("div")
  toast.className = `fixed bottom-4 right-4 p-4 bg-${type}-100 text-${type}-800 rounded-lg shadow-lg`
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    document.body.removeChild(toast)
  }, 3000)
}

ready(() => {
  loadDashboardData()
  setupEventListeners()
  loadExistingCredentials()
})

function setupEventListeners() {
  const credentialForm = document.getElementById("credentialForm")
  credentialForm.addEventListener("submit", handleCredentialGeneration)
}

function loadDashboardData() {
  // Load existing credentials count
  const existingCredentials = getFromStorage("generatedCredentials") || []
  document.getElementById("totalStudents").textContent = existingCredentials.length

  // Load exam results for statistics
  const examResults = getFromStorage("examResults") || []
  document.getElementById("pendingResults").textContent = examResults.length

  if (examResults.length > 0) {
    const avgScore = examResults.reduce((sum, result) => sum + result.score, 0) / examResults.length
    document.getElementById("avgScore").textContent = Math.round(avgScore) + "%"
  }

  updateRecentActivity()
}

function handleCredentialGeneration(e) {
  e.preventDefault()

  const studentCount = Number.parseInt(document.getElementById("studentCount").value)
  const classBatch = document.getElementById("classBatch").value
  const usernamePrefix = document.getElementById("usernamePrefix").value
  const passwordLength = Number.parseInt(document.getElementById("passwordLength").value)

  if (studentCount < 1 || studentCount > 100) {
    showToast("Please enter a valid number of students (1-100)", "error")
    return
  }

  // Generate credentials
  const newCredentials = generateCredentials(studentCount, classBatch, usernamePrefix, passwordLength)

  // Add to existing credentials
  generatedCredentials = [...generatedCredentials, ...newCredentials]

  // Save to localStorage
  saveToStorage("generatedCredentials", generatedCredentials)

  // Display credentials
  displayCredentials(generatedCredentials)

  // Update stats
  document.getElementById("totalStudents").textContent = generatedCredentials.length

  // Add to recent activity
  addToRecentActivity(`Generated ${studentCount} credentials for ${classBatch}`)

  showToast(`Successfully generated ${studentCount} credentials!`, "success")
}

function generateCredentials(count, classBatch, prefix, passwordLength) {
  const credentials = []
  const existingUsernames = new Set(generatedCredentials.map((c) => c.username))

  for (let i = 1; i <= count; i++) {
    let username, studentId
    let attempts = 0

    // Generate unique username
    do {
      const randomNum = Math.floor(Math.random() * 9000) + 1000
      username = `${prefix}${randomNum}`
      studentId = `${classBatch.replace("-", "")}-${String(i).padStart(3, "0")}`
      attempts++
    } while (existingUsernames.has(username) && attempts < 100)

    const password = generatePassword(passwordLength)

    const credential = {
      id: Date.now() + i,
      studentId: studentId,
      username: username,
      password: password,
      class: classBatch,
      status: "Active",
      createdAt: new Date().toISOString(),
      lastLogin: null,
    }

    credentials.push(credential)
    existingUsernames.add(username)
  }

  return credentials
}

function generatePassword(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  let password = ""

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return password
}

function displayCredentials(credentials) {
  const credentialsSection = document.getElementById("credentialsSection")
  const credentialsTable = document.getElementById("credentialsTable")

  credentialsTable.innerHTML = ""

  credentials.forEach((credential) => {
    const row = document.createElement("tr")
    row.className = "hover:bg-gray-50"

    row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${credential.studentId}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${credential.username}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                <span class="password-field" data-password="${credential.password}">••••••••</span>
                <button onclick="togglePassword(this)" class="ml-2 text-sky-blue hover:text-soft-navy-light text-xs">
                    Show
                </button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${credential.class}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  credential.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }">
                    ${credential.status}
                </span>
            </td>
        `

    credentialsTable.appendChild(row)
  })

  credentialsSection.classList.remove("hidden")
}

function togglePassword(button) {
  const passwordField = button.previousElementSibling
  const actualPassword = passwordField.dataset.password

  if (passwordField.textContent === "••••••••") {
    passwordField.textContent = actualPassword
    button.textContent = "Hide"
  } else {
    passwordField.textContent = "••••••••"
    button.textContent = "Show"
  }
}

function loadExistingCredentials() {
  const existingCredentials = getFromStorage("generatedCredentials") || []
  if (existingCredentials.length > 0) {
    generatedCredentials = existingCredentials
    displayCredentials(generatedCredentials)
  }
}

function clearAllCredentials() {
  if (confirm("Are you sure you want to clear all generated credentials? This action cannot be undone.")) {
    generatedCredentials = []
    removeFromStorage("generatedCredentials")
    document.getElementById("credentialsSection").classList.add("hidden")
    document.getElementById("totalStudents").textContent = "0"
    addToRecentActivity("Cleared all credentials")
    showToast("All credentials cleared successfully", "success")
  }
}

function downloadCredentials() {
  if (generatedCredentials.length === 0) {
    showToast("No credentials to download", "warning")
    return
  }

  const csvContent = generateCSV(generatedCredentials)
  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `emis_credentials_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  addToRecentActivity("Downloaded credentials CSV")
  showToast("Credentials downloaded successfully", "success")
}

function generateCSV(credentials) {
  const headers = ["Student ID", "Username", "Password", "Class", "Status", "Created At"]
  const rows = credentials.map((c) => [
    c.studentId,
    c.username,
    c.password,
    c.class,
    c.status,
    new Date(c.createdAt).toLocaleDateString(),
  ])

  const csvContent = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

  return csvContent
}

function printCredentials() {
  if (generatedCredentials.length === 0) {
    showToast("No credentials to print", "warning")
    return
  }

  const printWindow = window.open("", "_blank")
  const printContent = generatePrintContent(generatedCredentials)

  printWindow.document.write(printContent)
  printWindow.document.close()
  printWindow.print()

  addToRecentActivity("Printed credentials")
  showToast("Print dialog opened", "info")
}

function generatePrintContent(credentials) {
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>EMIS Student Credentials</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .credentials { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .credential-card { border: 2px solid #38bdf8; padding: 15px; border-radius: 8px; }
                .credential-card h3 { margin: 0 0 10px 0; color: #1e3a8a; }
                .credential-info { margin: 5px 0; }
                @media print { .credentials { grid-template-columns: repeat(3, 1fr); } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>EMIS - Epitome Model Islamic Schools</h1>
                <h2>Student Login Credentials</h2>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="credentials">
                ${credentials
                  .map(
                    (c) => `
                    <div class="credential-card">
                        <h3>${c.studentId}</h3>
                        <div class="credential-info"><strong>Username:</strong> ${c.username}</div>
                        <div class="credential-info"><strong>Password:</strong> ${c.password}</div>
                        <div class="credential-info"><strong>Class:</strong> ${c.class}</div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </body>
        </html>
    `
}

function updateRecentActivity() {
  const activities = getFromStorage("recentActivities") || [
    { message: "System initialized", time: "Just now", type: "info" },
  ]

  const activityContainer = document.getElementById("recentActivity")
  activityContainer.innerHTML = ""

  activities.slice(0, 5).forEach((activity) => {
    const activityElement = document.createElement("div")
    activityElement.className = "flex items-start space-x-3 text-sm"

    const colorClass =
      activity.type === "success"
        ? "bg-green-500"
        : activity.type === "warning"
          ? "bg-yellow-500"
          : activity.type === "error"
            ? "bg-red-500"
            : "bg-blue-500"

    activityElement.innerHTML = `
            <div class="w-2 h-2 ${colorClass} rounded-full mt-2"></div>
            <div>
                <p class="text-gray-900">${activity.message}</p>
                <p class="text-gray-500">${activity.time}</p>
            </div>
        `

    activityContainer.appendChild(activityElement)
  })
}

function addToRecentActivity(message, type = "info") {
  const activities = getFromStorage("recentActivities") || []
  const newActivity = {
    message: message,
    time: new Date().toLocaleTimeString(),
    type: type,
  }

  activities.unshift(newActivity)
  activities.splice(10) // Keep only last 10 activities

  saveToStorage("recentActivities", activities)
  updateRecentActivity()
}

// Quick action functions
function startExam() {
  window.location.href = "/exam"
}

function viewResults() {
  const results = getFromStorage("examResults") || []
  if (results.length === 0) {
    showToast("No exam results available yet", "info")
    return
  }

  // For demo purposes, show results in a modal or redirect
  showToast(`Found ${results.length} exam results`, "info")
  addToRecentActivity(`Viewed exam results (${results.length} found)`)
}

function exportData() {
  const data = {
    credentials: getFromStorage("generatedCredentials") || [],
    results: getFromStorage("examResults") || [],
    activities: getFromStorage("recentActivities") || [],
  }

  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: "application/json" })
  const url = window.URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = `emis_data_export_${new Date().toISOString().split("T")[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  addToRecentActivity("Exported system data")
  showToast("Data exported successfully", "success")
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    removeFromStorage("loginData")
    removeFromSession("loginData")
    showToast("Logged out successfully", "success")
    setTimeout(() => {
      window.location.href = "/"
    }, 1000)
  }
}
