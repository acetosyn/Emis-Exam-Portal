// ======================================
// exam-core.js  (Base Exam Engine — GLOBAL)
// ======================================

console.log("[exam-core] loaded"); // sanity check

// --------------------
// Global state
// --------------------
window.examData = null;
window.currentQuestionIndex = 0;
window.userAnswers = {};
window.flaggedQuestions = new Set();
window.examTimer = null;
window.timeRemaining = 0;
window.examStarted = false;
window.examStartTime = null;

// --------------------
// Utils
// --------------------
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// --------------------
// Anti-cheat
// --------------------
window.setupAntiCheat = function () {
  document.addEventListener("contextmenu", (e) => {
    if (window.examStarted) e.preventDefault();
  });
  document.addEventListener("keydown", (e) => {
    if (!window.examStarted) return;
    if (e.ctrlKey && ["c", "v", "x", "a", "u"].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "I")) e.preventDefault();
  });
};

// --------------------
// Load Exam Data
// --------------------
window.loadExamData = async function (subject) {
  try {
    const res = await fetch(`/static/data/${subject}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${subject}.json`);
    window.examData = await res.json();

    const mins = Number(window.examData.time_allowed_minutes || 20);
    window.timeRemaining = mins * 60;
    $("#timerDisplay") && ($("#timerDisplay").textContent = formatTime(window.timeRemaining));
    $("#totalQuestions") && ($("#totalQuestions").textContent = window.examData.questions.length);

    window.loadQuestion(0);
    window.updateProgress();

    console.log(`[exam-core] Data loaded for ${subject}`, window.examData);
  } catch (err) {
    console.error("Error loading exam data:", err);
    alert("Unable to load exam data. Please contact your administrator.");
  }
};

// --------------------
// Timer
// --------------------
window.startTimer = function () {
  if (window.examTimer) clearInterval(window.examTimer);
  window.examTimer = setInterval(() => {
    window.timeRemaining--;
    const disp = $("#timerDisplay");
    if (disp) disp.textContent = formatTime(window.timeRemaining);

    if (window.timeRemaining <= 0) {
      clearInterval(window.examTimer);
      if (typeof window.submitExam === "function") {
        window.submitExam(true);
      } else {
        alert("Time is up. Your exam will be submitted.");
        window.location.href = "/result";
      }
    }
  }, 1000);
};

// --------------------
// Question Rendering
// --------------------
window.loadQuestion = function (index) {
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

// --------------------
// Answer Selection
// --------------------
window.selectOption = function (optionIndex) {
  if (!window.examData) return;
  const q = window.examData.questions[window.currentQuestionIndex];
  window.userAnswers[q.id] = optionIndex;

  $$(".option-btn").forEach((btn, idx) => {
    btn.classList.toggle("selected", idx === optionIndex);
  });

  window.updateProgress();
  window.updateNavigation();
};

// --------------------
// Prev / Next
// --------------------
window.previousQuestion = function () {
  if (window.currentQuestionIndex > 0) window.loadQuestion(window.currentQuestionIndex - 1);
};

window.nextQuestion = function () {
  if (!window.examData) return;
  if (window.currentQuestionIndex < window.examData.questions.length - 1) {
    window.loadQuestion(window.currentQuestionIndex + 1);
  } else {
    if (typeof window.submitExam === "function") window.submitExam(false);
  }
};

// --------------------
// Progress
// --------------------
window.updateProgress = function () {
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

// --------------------
// Nav buttons state
// --------------------
window.updateNavigation = function () {
  if (!window.examData) return;
  const prev = $("#prevBtn");
  const next = $("#nextBtn");
  if (prev) prev.disabled = window.currentQuestionIndex === 0;
  if (next) {
    const last = window.currentQuestionIndex === window.examData.questions.length - 1;
    next.textContent = last ? "Submit" : "Next →";
  }
};

// --------------------
// Fullscreen
// --------------------
window.toggleFullscreen = function () {
  if (!document.fullscreenElement) {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
  }
};

// -----------------------------
// Start Exam (toggle modal → exam interface)
// -----------------------------
window.startExam = async function () {
  if (window.examStarted) return;
  window.examStarted = true;
  window.examStartTime = Date.now();

  // Hide instructions modal
  $("#instructionsModal")?.classList.add("hidden");

  // Show exam interface
  $("#examInterface")?.classList.remove("hidden");
  $("#examTimer")?.classList.remove("hidden");
  $("#fullscreenBtn")?.classList.remove("hidden");

  try {
    const subject = (document.querySelector('meta[name="exam-subject"]')?.content || "biology").toLowerCase();
    const res = await fetch(`/static/data/${subject}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${subject}.json`);
    const data = await res.json();

    window.examData = data;
    window.currentQuestionIndex = 0;
    window.userAnswers = {};

    $("#totalQuestions").textContent = data.questions.length;

    window.loadQuestion(0);

    window.timeRemaining = (data.time_allowed_minutes || 20) * 60;
    window.startTimer();

    console.log("✅ Exam started:", data.subject);
  } catch (err) {
    console.error("❌ Failed to start exam:", err);
    alert("Unable to load exam. Please contact admin.");
  }
};

// -----------------------------
// DOM Ready Bindings
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startExamBtn");
  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.startExam();
    });
  }

  // Fullscreen button
  const fsBtn = document.getElementById("fullscreenBtn");
  if (fsBtn) {
    fsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.toggleFullscreen();
    });
  }

  // Preload exam JSON (for totals/progress preview)
  const subjectMeta = document.querySelector('meta[name="exam-subject"]');
  const subject = (subjectMeta?.getAttribute("content") || "biology").toLowerCase();
  window.loadExamData(subject);

  // Init anti-cheat
  window.setupAntiCheat();
});
