// ===== Result Page JS =====
document.addEventListener("DOMContentLoaded", () => {
  bindResultActions();
  loadResultData();
});

function bindResultActions() {
  document.getElementById("endExamBtn")?.addEventListener("click", endExam);
  document.getElementById("viewResultBtn")?.addEventListener("click", viewResult);
  document.getElementById("closeGoodbyeBtn")?.addEventListener("click", closeGoodbye);
}

function loadResultData() {
  const result = window.resultData || null;

  if (!result || result.score === undefined || result.score === null) {
    renderEmptyState();
    return;
  }

  const score = Number(result.score ?? 0);
  const correct = Number(result.correct ?? 0);
  const total = Number(result.total ?? 0);
  const answered = Number(result.answered ?? 0);
  const flagged = Number(result.flagged ?? 0);
  const tabSwitches = Number(result.tabSwitches ?? 0);
  const timeTaken = Number(result.time_taken ?? 0);

  animateScore(score);

  setText("correctAnswers", correct);
  setText("totalQuestions", total);

  updatePassFail(correct);

  setText("timeTaken", formatTime(timeTaken));

  setText("answeredQuestions", answered);
  setText("answeredQuestionsMirror", answered);

  setText("skippedQuestions", Math.max(0, total - answered));
  setText("flaggedQuestions", flagged);
  setText("tabSwitches", tabSwitches);

  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  setText("accuracyRate", `${accuracy}%`);
  setText("accuracyRateMirror", `${accuracy}%`);

  const avgTime = answered > 0 ? Math.round(timeTaken / answered) : 0;
  setText("avgTimePerQuestion", `${avgTime}s`);

  const completionDate = result.submitted_at
    ? new Date(result.submitted_at).toLocaleString()
    : "N/A";
  setText("completionDate", completionDate);

  updateHeaderMessage(score, correct);
  showPerformance(correct);

  if (correct >= 31) {
    createConfetti();
  }
}

function renderEmptyState() {
  const card = document.querySelector(".result-card");
  if (!card) return;

  card.innerHTML = `
    <div class="result-empty-state">
      <div class="result-empty-icon">⚠️</div>
      <p class="result-empty-text">No exam results found for this user.</p>
      <button type="button" id="emptyEndExamBtn" class="btn-primary">End</button>
    </div>
  `;

  document.getElementById("emptyEndExamBtn")?.addEventListener("click", endExam);
}

function updateHeaderMessage(score, correct) {
  const headerMsg = document.getElementById("resultHeaderMessage");
  if (!headerMsg) return;

  if (correct >= 31) {
    headerMsg.textContent = "🌟 Outstanding performance. You completed the exam excellently. Review your result below.";
  } else if (correct >= 26) {
    headerMsg.textContent = "✅ You completed the exam successfully. Review your performance below.";
  } else if (correct >= 20) {
    headerMsg.textContent = "📊 You have completed your exam. Your result meets the minimum requirement.";
  } else {
    headerMsg.textContent = "📊 You have completed your exam. Review your performance below.";
  }
}

// ===== Goodbye Modal =====
function endExam() {
  const modal = document.getElementById("goodbyeModal");
  if (!modal) return;

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function closeGoodbye() {
  const modal = document.getElementById("goodbyeModal");
  if (!modal) return;

  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

// ===== Circle Animation =====
function animateScore(score) {
  const circle = document.getElementById("progressCircle");
  const display = document.getElementById("scoreDisplay");
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  if (circle) {
    circle.style.strokeDasharray = `${circumference}`;
    circle.style.strokeDashoffset = `${offset}`;

    if (score >= 80) {
      circle.style.stroke = "#16a34a";
    } else if (score >= 70) {
      circle.style.stroke = "#f59e0b";
    } else {
      circle.style.stroke = "#dc2626";
    }
  }

  if (display) {
    animateCounter(display, score, "%");
  }
}

function animateCounter(el, target, suffix = "") {
  if (!el) return;

  let current = 0;
  const safeTarget = Number(target) || 0;
  const step = Math.max(1, Math.ceil(safeTarget / 50));

  const interval = setInterval(() => {
    current += step;

    if (current >= safeTarget) {
      current = safeTarget;
      clearInterval(interval);
    }

    el.textContent = `${current}${suffix}`;
  }, 30);
}

// ===== Helpers =====
function formatTime(seconds) {
  const sec = Number(seconds) || 0;
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updatePassFail(correct) {
  const passFail = document.getElementById("passFail");
  if (!passFail) return;

  const passed = correct >= 20;
  passFail.textContent = passed ? "PASS ✅" : "FAIL ❌";
  passFail.classList.remove("is-pass", "is-fail");
  passFail.classList.add(passed ? "is-pass" : "is-fail");
}

// ===== Performance Box =====
function showPerformance(rawScore) {
  const box = document.getElementById("performanceMessage");
  if (!box) return;

  let msg = "";
  let klass = "";

  if (rawScore <= 19) {
    msg = "❌ You failed! Unfortunately, your score did not meet the minimum requirement for consideration. Thank you for your interest.";
    klass = "performance-fail";
  } else if (rawScore >= 20 && rawScore <= 25) {
    msg = "✅ You achieved the minimum requirement.\nYour result will be reviewed by the administration.";
    klass = "performance-minimum";
  } else if (rawScore >= 26 && rawScore <= 30) {
    msg = "✅ You successfully passed with a solid score.\nYour performance meets the requirement. Await communication from the administration on the next stage.";
    klass = "performance-good";
  } else if (rawScore >= 31 && rawScore <= 40) {
    msg = "🌟 Excellent result!\nYour performance has placed you in the top tier. Await further instructions for the next stage of the recruitment process.";
    klass = "performance-excellent";
  } else {
    msg = "Your result has been recorded successfully.";
    klass = "performance-good";
  }

  box.className = `performance-box ${klass}`;
  box.textContent = msg;
}

// ===== Confetti Animation =====
function createConfetti() {
  const container = document.getElementById("confetti-container");
  if (!container) return;

  const classes = [
    "confetti-blue",
    "confetti-green",
    "confetti-amber",
    "confetti-red",
    "confetti-purple"
  ];

  for (let i = 0; i < 50; i++) {
    const conf = document.createElement("div");
    const colorClass = classes[Math.floor(Math.random() * classes.length)];

    conf.className = `confetti-piece ${colorClass}`;
    conf.style.left = `${Math.random() * 100}%`;
    conf.style.animationDuration = `${2 + Math.random() * 3}s`;
    conf.style.animationDelay = `${Math.random() * 0.8}s`;

    container.appendChild(conf);
    setTimeout(() => conf.remove(), 5500);
  }
}

// ===== Actions =====
function viewResult() {
  window.location.reload();
}