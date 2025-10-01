// ======================================
// exam-core.js  (Base Exam Engine — GLOBAL with DEBUGGING + nav impl)
// ======================================

console.log("[exam-core] ✅ script loaded"); // sanity check

// --------------------
// Global state
// --------------------
window.examData = null;
window.currentQuestionIndex = 0;
window.userAnswers = {}; // { [qid]: { index, correct } }
window.flaggedQuestions = new Set();
window.examTimer = null;
window.timeRemaining = 0;
window.examStarted = false;
window.examStartTime = null;

// --------------------
// Utils
// --------------------
function $(sel, root = document) {
  return root.querySelector(sel);
}
function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// --------------------
// Anti-cheat
// --------------------
window.setupAntiCheat = function () {
  console.log("[exam-core] Anti-cheat initialized");
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
  console.log(`[exam-core] ⏳ Preloading exam data for:`, subject);
  try {
    const res = await fetch(`/static/data/${subject}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${subject}.json (status ${res.status})`);
    window.examData = await res.json();

    const mins = Number(window.examData.time_allowed_minutes || 20);
    window.timeRemaining = mins * 60;
    $("#timerDisplay") && ($("#timerDisplay").textContent = formatTime(window.timeRemaining));
    $("#totalQuestions") && ($("#totalQuestions").textContent = window.examData.questions.length);

    if (!Array.isArray(window.examData.questions)) {
      throw new Error("Invalid exam data: questions missing or not an array");
    }

    window.updateQuestionNavigation();
    window.loadQuestion(0); // preview
    window.updateProgress();

    console.log("[exam-core] ✅ Data loaded for", subject, window.examData);
  } catch (err) {
    console.error("[exam-core] ❌ Error loading exam data:", err);
    alert("Unable to load exam data. Please contact your administrator.");
  }
};

// --------------------
// Timer
// --------------------
window.startTimer = function () {
  console.log("[exam-core] ⏳ Timer started");
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
  try {
    console.log(`[exam-core] loadQuestion(${index}) called`);
    if (!window.examData || !Array.isArray(window.examData.questions)) return;
    if (index < 0 || index >= window.examData.questions.length) return;

    window.currentQuestionIndex = index;
    const q = window.examData.questions[index];

    $("#currentQuestionNumber") && ($("#currentQuestionNumber").textContent = index + 1);

    const prevAns = window.userAnswers[q.id]?.index;

    const optionsHTML = (q.options || []).map((opt, i) => {
      const selected = prevAns === i ? "selected" : "";
      return `
        <button
          class="option-btn ${selected}"
          data-option-index="${i}"
          onclick="selectOption(${i})"
        >
          <span class="option-letter">${String.fromCharCode(65 + i)}</span>
          ${opt}
        </button>
      `;
    }).join("");

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

    window.updateQuestionNavigation();
    if (typeof window.updateNavigation === "function") window.updateNavigation();

  } catch (err) {
    console.error("[exam-core] ❌ loadQuestion error:", err);
  }
};

// --------------------
// Answer Selection (FIXED)
// --------------------
window.selectOption = function (optionIndex) {
  try {
    console.log(`[exam-core] selectOption(${optionIndex})`);
    if (!window.examData) return;
    const q = window.examData.questions[window.currentQuestionIndex];
    if (!q) return;

    const chosenText = (q.options?.[optionIndex] || "").trim().toLowerCase();
    const correctText = (q.answer || "").trim().toLowerCase();
    const isCorrect = chosenText === correctText;

    // save both index + correctness
    window.userAnswers[q.id] = { index: optionIndex, correct: isCorrect };

    $$(".option-btn").forEach((btn) => {
      const idx = Number(btn.getAttribute("data-option-index"));
      btn.classList.toggle("selected", idx === optionIndex);
    });

    // show feedback pill if available
    if (typeof window.showAnswerFlash === "function") {
      window.showAnswerFlash(isCorrect);
    }

    window.updateProgress();
    if (typeof window.updateNavigation === "function") window.updateNavigation();
    if (typeof window.updateQuestionNavigation === "function") window.updateQuestionNavigation();

    // ✅ auto-next if correct
    if (isCorrect) {
      setTimeout(() => window.nextQuestion(), 600);
    }

  } catch (err) {
    console.error("[exam-core] ❌ selectOption error:", err);
  }
};

// --------------------
// Prev / Next
// --------------------
window.previousQuestion = function () {
  if (!window.examData) return;
  if (window.currentQuestionIndex > 0) {
    window.loadQuestion(window.currentQuestionIndex - 1);
  }
};

window.nextQuestion = function () {
  if (!window.examData) return;
  if (window.currentQuestionIndex < window.examData.questions.length - 1) {
    window.loadQuestion(window.currentQuestionIndex + 1);
  } else {
    if (typeof window.submitExam === "function") {
      window.submitExam(false);
    } else {
      console.log("[exam-core] Reached last question; submitExam not found.");
    }
  }
};

// --------------------
// Progress
// --------------------
window.updateProgress = function () {
  if (!window.examData) return;
  const total = window.examData.questions.length;
  const answered = Object.keys(window.userAnswers || {}).length;
  const remaining = total - answered;
  const pct = total === 0 ? 0 : (answered / total) * 100;

  $("#answeredCount") && ($("#answeredCount").textContent = answered);
  $("#remainingCount") && ($("#remainingCount").textContent = remaining);
  $("#progressBar") && ($("#progressBar").style.width = `${pct}%`);
  $("#progressText") && ($("#progressText").textContent = `${Math.round(pct)}% Complete`);
};

// --------------------
// Navigation UI helpers
// --------------------
window.updateNavigation = function () {
  try {
    if (!window.examData) return;
    const prev = $("#prevBtn");
    const next = $("#nextBtn");

    if (prev) prev.disabled = window.currentQuestionIndex === 0;
    if (next) {
      const last = window.currentQuestionIndex === window.examData.questions.length - 1;
      next.textContent = last ? "Submit" : "Next →";
      next.disabled = false;
    }
  } catch (err) {
    console.warn("[exam-core] updateNavigation error:", err);
  }
};
if (typeof window.updateNavigationButtons !== "function") {
  window.updateNavigationButtons = window.updateNavigation;
}

window.updateQuestionNavigation = function () {
  try {
    const grid = $("#questionGrid");
    if (!grid || !window.examData) return;

    const total = window.examData.questions.length;
    let html = "";
    for (let i = 0; i < total; i++) {
      const q = window.examData.questions[i];
      const qid = q?.id ?? i;
      const active = i === window.currentQuestionIndex ? "active" : "";
      const answered = window.userAnswers[qid] ? "answered" : "";
      html += `<button class="question-nav-btn ${active} ${answered}" data-q-index="${i}" aria-label="Question ${i + 1}">${i + 1}</button>`;
    }
    grid.innerHTML = html;

    $$(".question-nav-btn", grid).forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute("data-q-index"));
        window.loadQuestion(idx);
      };
    });

    $$(".question-nav-btn", grid).forEach((btn, idx) => {
      const qid = window.examData.questions?.[idx]?.id;
      if (qid && window.userAnswers[qid]) btn.classList.add("answered");
      else btn.classList.remove("answered");
      btn.classList.toggle("active", idx === window.currentQuestionIndex);
    });

  } catch (err) {
    console.warn("[exam-core] updateQuestionNavigation error:", err);
  }
};

// --------------------
// Fullscreen
// --------------------
window.toggleFullscreen = function () {
  try {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
    }
  } catch (err) {
    console.warn("[exam-core] toggleFullscreen error:", err);
  }
};

// -----------------------------
// Start Exam
// -----------------------------
window.startExam = async function () {
  console.log("[exam-core] 🚀 startExam() triggered");

  if (window.examStarted) return;

  window.examStarted = true;
  window.examStartTime = Date.now();

  $("#instructionsModal")?.classList.add("hidden");
  $("#examInterface")?.classList.remove("hidden");
  $("#examTimer")?.classList.remove("hidden");
  $("#fullscreenBtn")?.classList.remove("hidden");

  try {
    const subject = (document.querySelector('meta[name="exam-subject"]')?.content || "biology").toLowerCase();
    console.log(`[exam-core] Fetching exam JSON for subject: ${subject}`);

    const res = await fetch(`/static/data/${subject}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${subject}.json (status ${res.status})`);
    const data = await res.json();

    window.examData = data;
    window.currentQuestionIndex = 0;
    window.userAnswers = {};
    window.flaggedQuestions = new Set();

    $("#totalQuestions") && ($("#totalQuestions").textContent = data.questions.length);

    window.updateQuestionNavigation();
    window.loadQuestion(0);

    window.timeRemaining = (data.time_allowed_minutes || 20) * 60;
    window.startTimer();

    console.log("[exam-core] ✅ Exam started successfully for subject:", data.subject || subject);
  } catch (err) {
    console.error("[exam-core] ❌ Failed to start exam:", err);
    alert("Unable to load exam. Please contact admin.");
  }
};

// -----------------------------
// DOM Ready
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("[exam-core] DOM ready fired");

  const startBtn = document.getElementById("startExamBtn");
  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.startExam();
    });
  }

  const fsBtn = document.getElementById("fullscreenBtn");
  if (fsBtn) {
    fsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.toggleFullscreen();
    });
  }

  const subjectMeta = document.querySelector('meta[name="exam-subject"]');
  const subject = (subjectMeta?.getAttribute("content") || "biology").toLowerCase();
  window.loadExamData(subject);

  window.setupAntiCheat();
});
