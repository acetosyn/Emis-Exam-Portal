// ===== Result Page JS =====
document.addEventListener("DOMContentLoaded", () => {
  loadResultData();
});

function loadResultData() {
  const result = window.resultData || null; // injected via Jinja
  if (!result || !result.score) {
    const card = document.querySelector(".result-card");
    if (card) {
      card.innerHTML = `
        <div class="text-center p-6">
          <p class="text-red-600 font-semibold">⚠️ No exam results found for this user.</p>
          <button onclick="endExam()" class="mt-4 btn-primary">End</button>
        </div>
      `;
    }
    return;
  }

  // Score & Circle (percentage)
  animateScore(result.score);

  // Fraction score (correct / total)
  setText("correctAnswers", result.correct ?? 0);
  setText("totalQuestions", result.total ?? 0);

  // PASS/FAIL
  const passFail = document.getElementById("passFail");
  if (passFail) {
    if ((result.correct ?? 0) >= 20) {
      passFail.textContent = "PASS ✅";
      passFail.style.color = "green";
    } else {
      passFail.textContent = "FAIL ❌";
      passFail.style.color = "red";
    }
  }

  // Other Stats
  setText("timeTaken", formatTime(result.time_taken ?? 0));
  setText("answeredQuestions", result.answered ?? 0);
  setText("skippedQuestions", (result.total ?? 0) - (result.answered ?? 0));
  setText("flaggedQuestions", result.flagged ?? 0);
  setText("tabSwitches", result.tabSwitches ?? 0);

  // Accuracy & Average
  const accuracy = (result.answered && result.answered > 0)
    ? Math.round((result.correct / result.answered) * 100)
    : 0;
  setText("accuracyRate", accuracy + "%");

  const avg = (result.answered && result.answered > 0)
    ? Math.round(result.time_taken / result.answered)
    : 0;
  setText("avgTimePerQuestion", avg + "s");

  // Completion date
  const completionDate = result.submitted_at
    ? new Date(result.submitted_at).toLocaleString()
    : "N/A";
  setText("completionDate", completionDate);

  // Performance message
  showPerformance(result.score);

  // Confetti for passes
  if (result.score >= 70) createConfetti();
}

// Goodbye Modal
function endExam() {
  const modal = document.getElementById("goodbyeModal");
  if (modal) modal.style.display = "flex";
}
function closeGoodbye() {
  const modal = document.getElementById("goodbyeModal");
  if (modal) modal.style.display = "none";
}

function animateScore(score) {
  const circle = document.getElementById("progressCircle");
  const display = document.getElementById("scoreDisplay");
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  if (circle) {
    circle.style.strokeDashoffset = offset;
    if (score >= 80) circle.style.stroke = "#16a34a";
    else if (score >= 70) circle.style.stroke = "#f59e0b";
    else circle.style.stroke = "#dc2626";
  }

  if (display) animateCounter(display, score, "%");
}

function animateCounter(el, target, suffix = "") {
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 50));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current + suffix;
  }, 30);
}

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

function showPerformance(score) {
  const box = document.getElementById("performanceMessage");
  if (!box) return;

let msg = "", color = "";
if (score >= 90) {
  msg = "🌟 Excellent performance. You have demonstrated outstanding subject mastery.";
  color = "background:#dcfce7;color:#166534";
} else if (score >= 80) {
  msg = "👏 Strong performance. You have a solid understanding of the subject.";
  color = "background:#eff6ff;color:#1e3a8a";
} else if (score >= 70) {
  msg = "✅ Satisfactory result. You have met the minimum requirement.";
  color = "background:#fef9c3;color:#92400e";
} else {
  msg = "📖 Unfortunately, you failed and did not meet the required standard. Further preparation is recommended before qualification.";
  color = "background:#fee2e2;color:#991b1b";
}


  box.setAttribute("style", color + ";padding:1rem;border-radius:12px");
  box.textContent = msg;
}

function createConfetti() {
  const container = document.getElementById("confetti-container");
  if (!container) return;
  const colors = ["#38bdf8", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6"];
  for (let i = 0; i < 50; i++) {
    const conf = document.createElement("div");
    conf.style.position = "absolute";
    conf.style.width = "10px"; conf.style.height = "10px";
    conf.style.background = colors[Math.floor(Math.random() * colors.length)];
    conf.style.left = Math.random() * 100 + "%";
    conf.style.top = "-10px";
    conf.style.borderRadius = "50%";
    conf.style.animation = `confetti-fall ${2 + Math.random() * 3}s linear forwards`;
    container.appendChild(conf);
    setTimeout(() => conf.remove(), 5000);
  }
}

// Actions
function viewResult() { window.location.reload(); }
