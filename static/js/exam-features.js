/* =========================================================================
   EMIS CBT — Module 2: exam_features.js
   Extends exam_core.js with:
   1) Answer flash ✅❌
   2) Skip logic & unanswered tracking
   3) Prev/Next wrap-around (first↔last)
   4) Dynamic “Submit” on last question
   5) Submit confirmation modal
   6) Score modal (pre-redirect)
   7) Reload/close guard while in exam
   8) Better keyboard: Enter = Next
   9) Sticky timer/fullscreen reveal after start
   10) Toast helpers for UX microfeedback
   ------------------------------------------------------------------------- */

(function () {
  // Guard if core isn’t loaded
  if (!window || typeof window !== "object") return;

  // Soft selectors
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Simple toasts (non-tailwind, no dependencies)
  function toast(msg, type = "info", ms = 2200) {
    const wrap = document.createElement("div");
    const palette = {
      success: "#16a34a",
      error:   "#dc2626",
      warning: "#f59e0b",
      info:    "#2563eb",
    };
    wrap.textContent = msg;
    wrap.style.cssText = `
      position:fixed;top:18px;right:18px;z-index:9999;
      padding:10px 14px;border-radius:10px;color:#fff;
      background:${palette[type] || palette.info};
      font-weight:600;box-shadow:0 10px 24px rgba(0,0,0,.25);
      transform:translateY(-10px);opacity:.0;transition:all .25s;
    `;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => {
      wrap.style.transform = "translateY(0)";
      wrap.style.opacity = "1";
    });
    setTimeout(() => {
      wrap.style.transform = "translateY(-8px)";
      wrap.style.opacity = "0";
      setTimeout(() => wrap.remove(), 250);
    }, ms);
  }

  // Inject lightweight styles used by this module
  const style = document.createElement("style");
  style.textContent = `
    .eflash{position:absolute;top:-6px;right:-6px;transform:translate(30%,-30%);
      padding:10px 12px;border-radius:999px;font-weight:800;color:#fff;
      box-shadow:0 10px 24px rgba(0,0,0,.25);opacity:0;scale:.9;transition:all .25s}
    .eflash.show{opacity:1;scale:1}
    .eflash.ok{background:#16a34a}
    .eflash.bad{background:#dc2626}

    .confirm-backdrop,.score-backdrop{
      position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;z-index:9998;opacity:0;transition:opacity .25s}
    .confirm-backdrop.show,.score-backdrop.show{opacity:1}
    .confirm, .score{
      background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;
      box-shadow:0 14px 36px rgba(30,58,138,.35);max-width:560px;width:94%;
      padding:20px 20px 16px;animation:efadeup .25s ease;
    }
    .confirm h3, .score h3{
      margin:0 0 8px 0;font-size:1.25rem;font-weight:800;
      background:linear-gradient(90deg,#1e3a8a,#2563eb);-webkit-background-clip:text;
      background-clip:text;-webkit-text-fill-color:transparent;
    }
    .confirm p, .score p{color:#475569;font-size:.98rem;line-height:1.5;margin:6px 0}
    .row{display:flex;gap:10px;justify-content:flex-end;margin-top:14px}
    .btn{border:none;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer}
    .btn.cancel{background:#f1f5f9;border:1px solid #cbd5e1}
    .btn.cancel:hover{background:#e2e8f0}
    .btn.danger{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff}
    .btn.danger:hover{filter:brightness(.98)}
    .btn.primary{background:linear-gradient(135deg,#1e40af,#2563eb,#3b82f6);color:#fff}
    .btn.primary:hover{filter:brightness(1.05)}
    @keyframes efadeup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

    /* Nav buttons pulse when actionable */
    #nextBtn.pulse, #prevBtn.pulse{animation:pulseBtn 1s ease-in-out 2}
    @keyframes pulseBtn{0%{transform:translateY(0)}50%{transform:translateY(-2px)}100%{transform:translateY(0)}}
  `;
  document.head.appendChild(style);

  // ------------------------------
  // 1) Flash ✔ / ✖ on selection
  // ------------------------------
  const hookFlash = () => {
    const originalSelect = window.selectOption;
    if (typeof originalSelect !== "function") return;

    window.selectOption = function(optionIndex) {
      try {
        const q = window.examData.questions[window.currentQuestionIndex];
        const isCorrect = optionIndex === q.correctAnswer;

        // Create flash pill
        const host = $("#questionContent");
        if (host) {
          let pill = host.querySelector(".eflash");
          if (!pill) {
            pill = document.createElement("div");
            pill.className = "eflash";
            host.style.position = "relative";
            host.appendChild(pill);
          }
          pill.className = "eflash " + (isCorrect ? "ok" : "bad");
          pill.textContent = isCorrect ? "✔" : "✖";
          requestAnimationFrame(() => pill.classList.add("show"));
          setTimeout(() => pill.classList.remove("show"), 700);
        }
      } catch (e) {
        // fail-soft
      }
      // call original
      return originalSelect.apply(this, arguments);
    };
  };

  // ------------------------------------------------
  // 2) Prev/Next wrap-around (first↔last) + Enter=Next
  // ------------------------------------------------
  const hookNav = () => {
    const oPrev = window.previousQuestion;
    const oNext = window.nextQuestion;

    if (typeof oPrev === "function") {
      window.previousQuestion = function () {
        if (window.currentQuestionIndex === 0) {
          // wrap to last
          window.loadQuestion(window.examData.questions.length - 1);
          $("#prevBtn")?.classList.add("pulse");
          setTimeout(() => $("#prevBtn")?.classList.remove("pulse"), 1000);
        } else {
          oPrev.apply(this, arguments);
        }
      };
    }

    if (typeof oNext === "function") {
      window.nextQuestion = function () {
        if (window.currentQuestionIndex === window.examData.questions.length - 1) {
          // wrap to first
          window.loadQuestion(0);
          $("#nextBtn")?.classList.add("pulse");
          setTimeout(() => $("#nextBtn")?.classList.remove("pulse"), 1000);
        } else {
          oNext.apply(this, arguments);
        }
      };
    }

    // Enter to go next (when in exam)
    document.addEventListener("keydown", (e) => {
      if (!window.examStartTime) return;
      if (e.key === "Enter") {
        e.preventDefault();
        $("#nextBtn")?.click();
      }
    });
  };

  // ------------------------------------------------------
  // 3) Dynamic “Submit” on last question + CTA ribbon show
  // ------------------------------------------------------
  function syncSubmitCTA() {
    const nextBtn = $("#nextBtn");
    if (!nextBtn || !window.examData) return;
    const isLast = window.currentQuestionIndex === window.examData.questions.length - 1;

    if (isLast) {
      nextBtn.textContent = "Submit";
      nextBtn.onclick = openSubmitConfirm;
      nextBtn.classList.add("pulse");
    } else {
      // restore to core behavior
      nextBtn.textContent = "Next →";
      nextBtn.onclick = window.nextQuestion;
      nextBtn.classList.remove("pulse");
    }
  }

  // Patch loadQuestion & updateNavigationButtons to ensure CTA sync
  const patchCTA = () => {
    const oLoad = window.loadQuestion;
    if (typeof oLoad === "function") {
      window.loadQuestion = function () {
        const r = oLoad.apply(this, arguments);
        syncSubmitCTA();
        return r;
      };
    }
    const oUpdateNav = window.updateNavigationButtons;
    if (typeof oUpdateNav === "function") {
      window.updateNavigationButtons = function () {
        const r = oUpdateNav.apply(this, arguments);
        syncSubmitCTA();
        return r;
      };
    }
  };

  // ---------------------------------------
  // 4) Submit confirmation custom modal UI
  // ---------------------------------------
  function openSubmitConfirm() {
    const total = window.examData?.questions?.length || 0;
    const answered = Object.keys(window.userAnswers || {}).length;
    const unanswered = total - answered;

    const backdrop = document.createElement("div");
    backdrop.className = "confirm-backdrop";
    backdrop.innerHTML = `
      <div class="confirm">
        <h3>Submit Exam?</h3>
        <p>You’ve answered <b>${answered}</b> of <b>${total}</b> questions.</p>
        ${
          unanswered > 0
            ? `<p style="color:#b45309;background:#fef3c7;border:1px solid #fde68a;padding:10px;border-radius:10px">
                 <b>${unanswered}</b> question(s) are unanswered. They will be marked <b>incorrect</b> if you submit now.
               </p>`
            : `<p style="color:#166534;background:#dcfce7;border:1px solid #bbf7d0;padding:10px;border-radius:10px">
                 Great! You answered every question.
               </p>`
        }
        <p>Once submitted, your exam will end and you can’t return to the questions.</p>
        <div class="row">
          <button class="btn cancel" id="ef-cancel">Review Again</button>
          <button class="btn danger" id="ef-confirm">Yes, Submit Now</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add("show"));

    $("#ef-cancel", backdrop).onclick = () => {
      backdrop.classList.remove("show");
      setTimeout(() => backdrop.remove(), 200);
    };
    $("#ef-confirm", backdrop).onclick = async () => {
      backdrop.classList.remove("show");
      setTimeout(() => backdrop.remove(), 150);
      await doSubmitWithScoreModal();
    };
  }

  // ---------------------------------------------------------
  // 5) Score modal (pre-redirect) — shows result then proceed
  // ---------------------------------------------------------
  async function doSubmitWithScoreModal() {
    // Stop timer (if running)
    if (window.examTimer) clearInterval(window.examTimer);

    // Let core compute final results if available, else compute here
    const compute = typeof window.calculateResults === "function"
      ? window.calculateResults
      : () => {
          const total = window.examData.questions.length;
          let correct = 0;
          window.examData.questions.forEach(q => {
            if (window.userAnswers[q.id] === q.correctAnswer) correct++;
          });
          const score = Math.round((correct / total) * 100);
          const timeTaken = Math.round((Date.now() - window.examStartTime) / 1000);
          return {
            totalQuestions: total,
            answeredQuestions: Object.keys(window.userAnswers).length,
            correctAnswers: correct,
            score,
            timeTaken
          };
        };

    const res = compute();

    // Show modal
    const backdrop = document.createElement("div");
    backdrop.className = "score-backdrop";
    backdrop.innerHTML = `
      <div class="score">
        <h3>Submission Successful 🎉</h3>
        <p><b>Your Score:</b> ${res.score}%</p>
        <p>
          Correct: <b>${res.correctAnswers}</b> / ${res.totalQuestions}
          ${res.answeredQuestions < res.totalQuestions ? 
            `&nbsp;|&nbsp; Unanswered: <b>${res.totalQuestions - res.answeredQuestions}</b>` : ``}
        </p>
        <p style="font-size:.9rem;color:#64748b">
          Time taken: ${Math.floor(res.timeTaken/60)}m ${res.timeTaken%60}s
        </p>
        <div class="row">
          <button class="btn primary" id="ef-view">View Detailed Results</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add("show"));

    // Dispatch event so Module 3 can push to admin in real-time
    const payload = {
      scorePercent: res.score,
      correct: res.correctAnswers,
      total: res.totalQuestions,
      answered: res.answeredQuestions,
      timeTaken: res.timeTaken
    };
    document.dispatchEvent(new CustomEvent("exam:submitted", { detail: payload }));

    $("#ef-view", backdrop).onclick = () => {
      // Clear progress and go to results (core behavior)
      try { sessionStorage.removeItem("examProgress"); } catch {}
      window.location.href = "/result";
    };
  }

  // ---------------------------------
  // 6) Reload/close protection while exam running
  // ---------------------------------
  function setupUnloadGuard() {
    window.addEventListener("beforeunload", (e) => {
      if (window.examStartTime && !window.__examFinished) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    });
  }

  // ------------------------------------------------
  // 7) Show hidden timer & fullscreen controls after start
  // ------------------------------------------------
  function revealTopControls() {
    const timer = $("#examTimer");
    const fsBtn = $("#fullscreenBtn");
    if (timer) timer.classList.remove("hidden");
    if (fsBtn) fsBtn.classList.remove("hidden");
  }

  // ------------------------------------------------
  // 8) Make unanswered clearly skippable (just info)
  // ------------------------------------------------
  function hintSkippable() {
    toast("Tip: You can skip any question. Unanswered ones will be flagged at submission.", "info", 3200);
  }

  // Patch startExam to reveal controls + guards + hint
  const patchStart = () => {
    const oStart = window.startExam;
    if (typeof oStart === "function") {
      window.startExam = async function () {
        const r = await oStart.apply(this, arguments);
        revealTopControls();
        setupUnloadGuard();
        hintSkippable();
        return r;
      };
    }
  };

  // ---------------------------------
  // 9) Keep “Submit” CTA in sync after select
  // ---------------------------------
  const patchSelectForCTA = () => {
    const oSelect = window.selectOption;
    if (typeof oSelect === "function") {
      window.selectOption = function () {
        const r = oSelect.apply(this, arguments);
        // If we just answered the last question, show Submit immediately
        syncSubmitCTA();
        return r;
      };
    }
  };

  // ---------------------------------
  // 10) Add tiny visual cue to answered nav buttons
  // ---------------------------------
  function decorateNavAnswered() {
    const navBtns = $$(".question-nav-btn");
    navBtns.forEach((btn, idx) => {
      const qid = window.examData?.questions?.[idx]?.id;
      if (qid != null && window.userAnswers && window.userAnswers.hasOwnProperty(qid)) {
        btn.style.position = "relative";
        if (!btn.querySelector(".dot")) {
          const dot = document.createElement("span");
          dot.className = "dot";
          dot.style.cssText = `
            position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;
            background:#16a34a;box-shadow:0 0 0 2px #e2e8f0;
          `;
          btn.appendChild(dot);
        }
      }
    });
  }

  const patchUpdateNav = () => {
    const oUpdateNav = window.updateQuestionNavigation;
    if (typeof oUpdateNav === "function") {
      window.updateQuestionNavigation = function () {
        const r = oUpdateNav.apply(this, arguments);
        decorateNavAnswered();
        return r;
      };
    }
  };

  // Initialize hooks once DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    hookFlash();
    hookNav();
    patchCTA();
    patchStart();
    patchSelectForCTA();
    patchUpdateNav();

    // If exam already loaded (resume), sync CTA & decorations
    const bootSync = () => {
      if (window.examData && Array.isArray(window.examData.questions) && typeof window.currentQuestionIndex === "number") {
        syncSubmitCTA();
        decorateNavAnswered();
      } else {
        // try again shortly until core finishes loading
        setTimeout(bootSync, 200);
      }
    };
    bootSync();
  });

})();
