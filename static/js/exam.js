// Exam JavaScript functionality

let examData = null
let currentQuestionIndex = 0
let userAnswers = {}
let flaggedQuestions = new Set()
let examTimer = null
let timeRemaining = 1800 // 30 minutes in seconds
let examStartTime = null
let tabSwitchCount = 0

// Utility functions
function ready(callback) {
  if (document.readyState !== "loading") {
    callback()
  } else {
    document.addEventListener("DOMContentLoaded", callback)
  }
}

function saveToSession(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving to sessionStorage:", error)
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

function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div")
  const bgColor =
    type === "success"
      ? "bg-green-500"
      : type === "error"
        ? "bg-red-500"
        : type === "warning"
          ? "bg-yellow-500"
          : "bg-blue-500"

  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${bgColor} slide-up`
  toast.textContent = message

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateX(100%)"
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, duration)
}

// Initialize exam
ready(() => {
  setupInstructions()
  setupAntiCheat()
  setupKeyboardShortcuts()
  loadExamProgress()
})

function setupInstructions() {
  const agreeTerms = document.getElementById("agreeTerms")
  const startExamBtn = document.getElementById("startExamBtn")

  agreeTerms.addEventListener("change", function () {
    startExamBtn.disabled = !this.checked
  })
}

function setupAntiCheat() {
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

  // Tab switch detection
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && examStartTime) {
      tabSwitchCount++
      if (tabSwitchCount === 1) {
        showToast("Warning: Tab switching detected. Next time will end the exam!", "warning", 5000)
      } else if (tabSwitchCount >= 2) {
        showToast("Exam ended due to multiple tab switches", "error")
        endExam(true)
      }
    }
  })
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (!examStartTime) return

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault()
        previousQuestion()
        break
      case "ArrowRight":
        e.preventDefault()
        nextQuestion()
        break
      case "1":
      case "2":
      case "3":
      case "4":
        e.preventDefault()
        selectOption(Number.parseInt(e.key) - 1)
        break
      case "f":
      case "F":
        e.preventDefault()
        toggleFlag()
        break
    }
  })
}

async function startExam() {
  const loadingOverlay = document.getElementById("loadingOverlay")
  loadingOverlay.classList.remove("hidden")

  try {
    // Load exam data
    await loadExamData()

    // Hide instructions and show exam interface
    document.getElementById("instructionsModal").classList.add("hidden")
    document.getElementById("examInterface").classList.remove("hidden")

    // Start timer
    examStartTime = Date.now()
    startTimer()

    // Initialize exam interface
    initializeExamInterface()

    // Request fullscreen
    requestFullscreen()

    showToast("Exam started successfully!", "success")
  } catch (error) {
    console.error("Error starting exam:", error)
    showToast("Failed to load exam. Please try again.", "error")
  } finally {
    loadingOverlay.classList.add("hidden")
  }
}

async function loadExamData() {
  try {
    const response = await fetch("/static/data/exam.json")
    if (!response.ok) {
      throw new Error("Failed to load exam data")
    }
    examData = await response.json()

    // Randomize question order if specified
    if (examData.randomizeQuestions) {
      examData.questions = shuffleArray(examData.questions)
    }

    // Randomize answer options for each question
    examData.questions.forEach((question) => {
      if (question.randomizeOptions) {
        const correctAnswer = question.options[question.correctAnswer]
        question.options = shuffleArray(question.options)
        question.correctAnswer = question.options.indexOf(correctAnswer)
      }
    })
  } catch (error) {
    // Fallback to sample data if JSON fails to load
    examData = getSampleExamData()
    showToast("Using offline exam data", "warning")
  }
}

function getSampleExamData() {
  return {
    title: "Sample Mathematics Exam",
    duration: 1800,
    totalQuestions: 5,
    randomizeQuestions: false,
    questions: [
      {
        id: 1,
        question: "What is the value of 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctAnswer: 1,
        randomizeOptions: false,
      },
      {
        id: 2,
        question: "Which of the following is a prime number?",
        options: ["4", "6", "7", "8"],
        correctAnswer: 2,
        randomizeOptions: false,
      },
      {
        id: 3,
        question: "What is 10 × 5?",
        options: ["45", "50", "55", "60"],
        correctAnswer: 1,
        randomizeOptions: false,
      },
      {
        id: 4,
        question: "What is the square root of 16?",
        options: ["2", "3", "4", "5"],
        correctAnswer: 2,
        randomizeOptions: false,
      },
      {
        id: 5,
        question: "What is 100 ÷ 4?",
        options: ["20", "25", "30", "35"],
        correctAnswer: 1,
        randomizeOptions: false,
      },
    ],
  }
}

function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function initializeExamInterface() {
  document.getElementById("totalQuestions").textContent = examData.questions.length
  generateQuestionNavigation()
  loadQuestion(0)
  updateProgress()
}

function generateQuestionNavigation() {
  const questionGrid = document.getElementById("questionGrid")
  questionGrid.innerHTML = ""

  examData.questions.forEach((_, index) => {
    const button = document.createElement("button")
    button.className = "question-nav-btn"
    button.textContent = index + 1
    button.onclick = () => loadQuestion(index)
    questionGrid.appendChild(button)
  })
}

function loadQuestion(index) {
  if (index < 0 || index >= examData.questions.length) return

  currentQuestionIndex = index
  const question = examData.questions[index]

  // Update question content
  document.getElementById("currentQuestionNumber").textContent = index + 1

  const questionContent = document.getElementById("questionContent")
  questionContent.innerHTML = `
        <div class="fade-in-up">
            <div class="mb-8">
                <h3 class="text-xl font-medium text-gray-900 mb-6 leading-relaxed">
                    ${question.question}
                </h3>
            </div>
            
            <div class="space-y-3">
                ${question.options
                  .map(
                    (option, optionIndex) => `
                    <button 
                        class="option-btn ${userAnswers[question.id] === optionIndex ? "selected" : ""}"
                        onclick="selectOption(${optionIndex})"
                    >
                        <span class="option-letter">${String.fromCharCode(65 + optionIndex)}</span>
                        ${option}
                    </button>
                `,
                  )
                  .join("")}
            </div>
        </div>
    `

  // Update navigation buttons
  updateNavigationButtons()
  updateQuestionNavigation()
  updateFlagButton()

  // Save progress
  saveExamProgress()
}

function selectOption(optionIndex) {
  const question = examData.questions[currentQuestionIndex]
  userAnswers[question.id] = optionIndex

  // Update UI
  const optionButtons = document.querySelectorAll(".option-btn")
  optionButtons.forEach((btn, index) => {
    btn.classList.toggle("selected", index === optionIndex)
  })

  updateProgress()
  updateQuestionNavigation()
  saveExamProgress()

  // Auto-advance to next question after a short delay
  setTimeout(() => {
    if (currentQuestionIndex < examData.questions.length - 1) {
      nextQuestion()
    }
  }, 500)
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    loadQuestion(currentQuestionIndex - 1)
  }
}

function nextQuestion() {
  if (currentQuestionIndex < examData.questions.length - 1) {
    loadQuestion(currentQuestionIndex + 1)
  }
}

function toggleFlag() {
  const questionId = examData.questions[currentQuestionIndex].id

  if (flaggedQuestions.has(questionId)) {
    flaggedQuestions.delete(questionId)
  } else {
    flaggedQuestions.add(questionId)
  }

  updateFlagButton()
  updateProgress()
  updateQuestionNavigation()
  saveExamProgress()
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById("prevBtn")
  const nextBtn = document.getElementById("nextBtn")

  prevBtn.disabled = currentQuestionIndex === 0
  nextBtn.textContent = currentQuestionIndex === examData.questions.length - 1 ? "Finish" : "Next →"
}

function updateQuestionNavigation() {
  const buttons = document.querySelectorAll(".question-nav-btn")

  buttons.forEach((button, index) => {
    const questionId = examData.questions[index].id
    button.className = "question-nav-btn"

    if (index === currentQuestionIndex) {
      button.classList.add("current")
    } else if (userAnswers.hasOwnProperty(questionId)) {
      button.classList.add("answered")
    }

    if (flaggedQuestions.has(questionId)) {
      button.classList.add("flagged")
    }
  })
}

function updateFlagButton() {
  const questionId = examData.questions[currentQuestionIndex].id
  const flagBtn = document.getElementById("flagBtn")
  const flagIcon = document.getElementById("flagIcon")
  const flagText = document.getElementById("flagText")

  if (flaggedQuestions.has(questionId)) {
    flagBtn.classList.add("bg-yellow-100", "border-yellow-300")
    flagIcon.classList.add("text-yellow-600")
    flagText.textContent = "Unflag"
  } else {
    flagBtn.classList.remove("bg-yellow-100", "border-yellow-300")
    flagIcon.classList.remove("text-yellow-600")
    flagText.textContent = "Flag"
  }
}

function updateProgress() {
  const totalQuestions = examData.questions.length
  const answeredCount = Object.keys(userAnswers).length
  const flaggedCount = flaggedQuestions.size
  const remainingCount = totalQuestions - answeredCount
  const progressPercentage = (answeredCount / totalQuestions) * 100

  document.getElementById("answeredCount").textContent = answeredCount
  document.getElementById("flaggedCount").textContent = flaggedCount
  document.getElementById("remainingCount").textContent = remainingCount
  document.getElementById("progressBar").style.width = progressPercentage + "%"
  document.getElementById("progressText").textContent = Math.round(progressPercentage) + "% Complete"
}

function startTimer() {
  const timerDisplay = document.getElementById("timerDisplay")
  const examTimerElement = document.getElementById("examTimer")

  examTimer = setInterval(() => {
    timeRemaining--

    const minutes = Math.floor(timeRemaining / 60)
    const seconds = timeRemaining % 60
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

    // Warning states
    if (timeRemaining <= 300) {
      // 5 minutes
      examTimerElement.classList.add("critical")
    } else if (timeRemaining <= 600) {
      // 10 minutes
      examTimerElement.classList.add("warning")
    }

    if (timeRemaining <= 0) {
      clearInterval(examTimer)
      showToast("Time is up! Submitting exam automatically.", "warning")
      endExam(true)
    }

    saveExamProgress()
  }, 1000)
}

function showSummary() {
  const summaryModal = document.getElementById("summaryModal")
  const summaryContent = document.getElementById("summaryContent")

  const totalQuestions = examData.questions.length
  const answeredCount = Object.keys(userAnswers).length
  const flaggedCount = flaggedQuestions.size
  const unansweredQuestions = []

  examData.questions.forEach((question, index) => {
    if (!userAnswers.hasOwnProperty(question.id)) {
      unansweredQuestions.push(index + 1)
    }
  })

  summaryContent.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-4 bg-green-50 rounded-lg">
                    <div class="text-2xl font-bold text-green-600">${answeredCount}</div>
                    <div class="text-sm text-green-700">Answered</div>
                </div>
                <div class="text-center p-4 bg-yellow-50 rounded-lg">
                    <div class="text-2xl font-bold text-yellow-600">${flaggedCount}</div>
                    <div class="text-sm text-yellow-700">Flagged</div>
                </div>
                <div class="text-center p-4 bg-red-50 rounded-lg">
                    <div class="text-2xl font-bold text-red-600">${totalQuestions - answeredCount}</div>
                    <div class="text-sm text-red-700">Unanswered</div>
                </div>
            </div>
            
            ${
              unansweredQuestions.length > 0
                ? `
                <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 class="font-medium text-red-900 mb-2">Unanswered Questions:</h4>
                    <p class="text-sm text-red-700">
                        Questions ${unansweredQuestions.join(", ")} are still unanswered.
                    </p>
                </div>
            `
                : ""
            }
            
            ${
              flaggedCount > 0
                ? `
                <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 class="font-medium text-yellow-900 mb-2">Flagged Questions:</h4>
                    <p class="text-sm text-yellow-700">
                        You have ${flaggedCount} question(s) flagged for review.
                    </p>
                </div>
            `
                : ""
            }
            
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 class="font-medium text-blue-900 mb-2">Time Remaining:</h4>
                <p class="text-sm text-blue-700">
                    ${Math.floor(timeRemaining / 60)} minutes and ${timeRemaining % 60} seconds
                </p>
            </div>
        </div>
    `

  summaryModal.classList.remove("hidden")
}

function closeSummary() {
  document.getElementById("summaryModal").classList.add("hidden")
}

function endExam(autoSubmit = false) {
  const unansweredCount = examData.questions.length - Object.keys(userAnswers).length

  if (!autoSubmit && unansweredCount > 0) {
    if (!confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to end the exam?`)) {
      return
    }
  }

  submitExam()
}

function submitExam() {
  if (examTimer) {
    clearInterval(examTimer)
  }

  // Calculate results
  const results = calculateResults()

  // Save results
  const examResults = getFromStorage("examResults") || []
  examResults.push(results)
  saveToStorage("examResults", examResults)

  // Clear exam progress
  sessionStorage.removeItem("examProgress")

  // Redirect to results
  window.location.href = "/result"
}

function calculateResults() {
  let correctAnswers = 0
  const totalQuestions = examData.questions.length
  const answeredQuestions = Object.keys(userAnswers).length

  examData.questions.forEach((question) => {
    if (userAnswers[question.id] === question.correctAnswer) {
      correctAnswers++
    }
  })

  const score = Math.round((correctAnswers / totalQuestions) * 100)
  const timeTaken = Math.round((Date.now() - examStartTime) / 1000)

  return {
    examTitle: examData.title,
    totalQuestions: totalQuestions,
    answeredQuestions: answeredQuestions,
    correctAnswers: correctAnswers,
    score: score,
    timeTaken: timeTaken,
    flaggedCount: flaggedQuestions.size,
    tabSwitchCount: tabSwitchCount,
    completedAt: new Date().toISOString(),
  }
}

function saveExamProgress() {
  const progress = {
    currentQuestionIndex: currentQuestionIndex,
    userAnswers: userAnswers,
    flaggedQuestions: Array.from(flaggedQuestions),
    timeRemaining: timeRemaining,
    examStartTime: examStartTime,
    tabSwitchCount: tabSwitchCount,
  }

  saveToSession("examProgress", progress)
}

function loadExamProgress() {
  const progress = getFromSession("examProgress")
  if (progress && progress.examStartTime) {
    // Resume exam if there's saved progress
    const timeSinceStart = Math.floor((Date.now() - progress.examStartTime) / 1000)
    if (timeSinceStart < 1800) {
      // Within 30 minutes
      userAnswers = progress.userAnswers || {}
      flaggedQuestions = new Set(progress.flaggedQuestions || [])
      timeRemaining = Math.max(0, progress.timeRemaining - timeSinceStart)
      tabSwitchCount = progress.tabSwitchCount || 0

      showToast("Resuming your previous exam session", "info")
    }
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    requestFullscreen()
  } else {
    exitFullscreen()
  }
}

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

// Storage helper functions
function getFromStorage(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error("Error reading from localStorage:", error)
    return null
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving to localStorage:", error)
  }
}
