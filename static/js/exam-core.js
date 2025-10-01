// ======================================
// exam-core.js  (Base Exam Engine — GLOBAL)
// ======================================

// Global state (names aligned with features module)
window.examData = null;
window.currentQuestionIndex = 0;
window.userAnswers = {};         // { questionId: optionIndex }
window.flaggedQuestions = new Set();
window.examTimer = null;
window.timeRemaining = 0;
window.examStarted = false;
window.examStartTime = null;

// -------- Utils --------
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Make sure functions are visible to inline onclick:
window.closeInstructions = function closeInstructions() {
  // back to dashboard
  window.location.href = "/user_portal";
};

// Enable/disable Start button based on checkbox
window.setupInstructions = function setupInstructions() {
  const agree = $("#agreeTerms");
  const startBtn = $("#startExamBtn");
  if (!agree || !startBtn) return;

  // Initialize state
  startBtn.disabled = !agree.checked;
  startBtn.classList.toggle("opacity-50", !agree.checked);
  startBtn.classList.toggle("cursor-not-allowed", !agree.checked);

  agree.addEventListener("change", () => {
    const on = agree.checked;
    startBtn.disabled = !on;
    startBtn.classList.toggle("opacity-50", !on);
    startBtn.classList.toggle("cursor-not-allowed", !on);
    startBtn.classList.toggle("animate-pulse", on);
  });
};

// Optional simple anti-cheat hooks (kept light here)
window.setupAntiCheat = function setupAntiCheat() {
  // Disable right click
  document.addEventListener("contextmenu", (e) => {
    if (window.examStarted) {
      e.preventDefault();
    }
  });
  // Basic copy/paste block
  document.addEventListener("keydown", (e) => {
    if (!window.examStarted) return;
    if (e.ctrlKey && ["c", "v", "x", "a", "u"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "I")) {
      e.preventDefault();
    }
  });
};

// Load exam JSON dynamically by subject (e.g. "biology")
window.loadExamData = async function loadExamData(subject) {
  try {
    const res = await fetch(`/static/data/${subject}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${subject}.json`);
    window.examData = await res.json();

    // Set timer from JSON (fallback 20min if not provided)
    const mins = Number(window.examData.time_allowed_minutes || 20);
    window.timeRemaining = mins * 60;
    $("#timerDisplay") && ($("#timerDisplay").textContent = formatTime(window.timeRemaining));

    // Totals for header
    $("#totalQuestions") && ($("#totalQuestions").textContent = window.examData.questions.length);

    // Render first question
    window.loadQuestion(0);
    window.updateProgress();
  } catch (err) {
    console.error("Error loading exam data:", err);
    alert("Unable to load exam data. Please contact your administrator.");
  }
};

// Start Exam (called by inline onclick)
window.startExam = function startExam() {
  // Require checkbox acknowledgement
  const agree = $("#agreeTerms");
  if (agree && !agree.checked) return;

  window.examStarted = true;
  window.examStartTime = Date.now();

  // Hide modal, show interface
  $("#instructionsModal")?.classList.add("hidden");
  $("#examInterface")?.classList.remove("hidden");
  $("#examTimer")?.classList.remove("hidden");
  $("#fullscreenBtn")?.classList.remove("hidden");

  // Kick off timer
  window.startTimer();

  // If exam data still not loaded (edge), try to auto-detect subject and load
  if (!window.examData) {
    // attempt to load subject from server-side session injected in the DOM if you added it,
    // else fall back to "exam" JSON.
    const subjectMeta = document.querySelector('meta[name="exam-subject"]');
    const subject = subjectMeta?.getAttribute("content") || "exam";
    window.loadExamData(subject);
  }
};

// Timer tick
window.startTimer = function startTimer() {
  if (window.examTimer) clearInterval(window.examTimer);
  window.examTimer = setInterval(() => {
    window.timeRemaining--;
    const disp = $("#timerDisplay");
    if (disp) disp.textContent = formatTime(window.timeRemaining);

    if (window.timeRemaining <= 0) {
      clearInterval(window.examTimer);
      // Let features or realtime module handle submit flow; fallback here:
      if (typeof window.submitExam === "function") {
        window.submitExam(true);
      } else {
        alert("Time is up. Your exam will be submitted.");
        window.location.href = "/result";
      }
    }
  }, 1000);
};

// Render a question
window.loadQuestion = function loadQuestion(index) {
  if (!window.examData || !Array.isArray(window.examData.questions)) return;
  if (index < 0 || index >= window.examData.questions.length) return;

  window.currentQuestionIndex = index;
  const q = window.examData.questions[index];

  $("#currentQuestionNumber") && ($("#currentQuestionNumber").textContent = index + 1);

  const optionsHTML = q.options.map((opt, i) => `
    <button
      class="option-btn ${window.userAnswers[q.id] === i ? "selected" : ""}"
      onclick="selectOption(${i})"
    >
      <span class="option-letter">${String.fromCharCode(65 + i)}</span>
      ${opt}
    </button>
  `).join("");

  const container = $("#questionContent");
  if (container) {
    container.innerHTML = `
      <div class="fade-in-up">
        <div class="mb-6">
          <h3 class="text-xl font-medium text-gray-900 leading-relaxed">${q.question}</h3>
        </div>
        <div class="space-y-3">${optionsHTML}</div>
      </div>
    `;
  }

  window.updateNavigation();
};

// Select an answer
window.selectOption = function selectOption(optionIndex) {
  if (!window.examData) return;
  const q = window.examData.questions[window.currentQuestionIndex];
  window.userAnswers[q.id] = optionIndex;

  // Mark selection styling
  $$(".option-btn").forEach((btn, idx) => {
    btn.classList.toggle("selected", idx === optionIndex);
  });

  window.updateProgress();
  window.updateNavigation();
};

// Prev / Next
window.previousQuestion = function previousQuestion() {
  if (window.currentQuestionIndex > 0) {
    window.loadQuestion(window.currentQuestionIndex - 1);
  }
};

window.nextQuestion = function nextQuestion() {
  if (!window.examData) return;
  if (window.currentQuestionIndex < window.examData.questions.length - 1) {
    window.loadQuestion(window.currentQuestionIndex + 1);
  } else {
    // Last question → if features module overrides, it will take over.
    if (typeof window.submitExam === "function") {
      window.submitExam(false);
    }
  }
};

// Update progress numbers + bar
window.updateProgress = function updateProgress() {
  if (!window.examData) return;
  const total = window.examData.questions.length;
  const answered = Object.keys(window.userAnswers).length;
  const remaining = total - answered;
  const pct = (answered / total) * 100;

  $("#answeredCount") && ($("#answeredCount").textContent = answered);
  $("#remainingCount") && ($("#remainingCount").textContent = remaining);
  $("#progressBar") && ($("#progressBar").style.width = `${pct}%`);
  $("#progressText") && ($("#progressText").textContent = `${Math.round(pct)}% Complete`);
};

// Update nav buttons state/text
window.updateNavigation = function updateNavigation() {
  if (!window.examData) return;
  const prev = $("#prevBtn");
  const next = $("#nextBtn");

  if (prev) prev.disabled = window.currentQuestionIndex === 0;
  if (next) {
    const last = window.currentQuestionIndex === window.examData.questions.length - 1;
    next.textContent = last ? "Submit" : "Next →";
  }
};

// Fullscreen toggle (used by header button)
window.toggleFullscreen = function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
  }
};

// Bootstrapping after DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.setupInstructions();
  window.setupAntiCheat();

  // Optional: auto-load by subject if you embed a meta tag in base.html:
  // <meta name="exam-subject" content="{{ session.subject|default('exam') }}">
  const subjectMeta = document.querySelector('meta[name="exam-subject"]');
  const subject = subjectMeta?.getAttribute("content");
  if (subject) {
    // preload data so counts are ready even before you hit Start
    window.loadExamData(subject);
  }
});
