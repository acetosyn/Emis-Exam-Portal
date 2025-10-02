// timer.js — Countdown timer only (no hourglass)

let totalExamSeconds = 20 * 60;  // default 20 minutes
let remainingSeconds = totalExamSeconds;
let timerInterval = null;

function startTimer(durationSeconds) {
  if (isNaN(durationSeconds) || durationSeconds <= 0) {
    console.error("Invalid timer duration:", durationSeconds);
    return;
  }

  totalExamSeconds = durationSeconds;
  remainingSeconds = durationSeconds;

  const timerDisplay = document.getElementById('timerDisplay');
  updateTimerDisplay(timerDisplay, remainingSeconds);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay(timerDisplay, remainingSeconds);

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      endExam(); // existing function
    }
  }, 1000);
}

function updateTimerDisplay(displayEl, seconds) {
  if (!displayEl) return;
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  displayEl.textContent = `${mins}:${secs}`;
}

window.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startExamBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startTimer(20 * 60);
    });
  }
});
