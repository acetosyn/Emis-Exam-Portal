// ======================================
// exam-core.js (Optimized Exam Engine)
// ======================================

console.log("[exam-core] ✅ script loaded");

// --------------------
// Global state
// --------------------
window.examData = null;
window.currentQuestionIndex = 0;
window.userAnswers = {};              // { [qid]: { index, correct } }
window.lockedQuestions = new Set();   // qids that cannot be re-answered
window.flaggedQuestions = new Set();
window.examTimer = null;
window.timeRemaining = 0;
window.examStarted = false;
window.examStartTime = null;
window.__examFinished = false;        // true when submitted/disqualified

// persistence keys
const SS_KEY = "emis_exam_progress";
const LS_RELOADS = "emis_exam_reload_count";

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
function safeJSONParse(str, fb=null){ try{return JSON.parse(str);}catch{ return fb; } }

// resolve correctness (index or text)
function getCorrectIndex(q){
  if (typeof q.correctAnswer === "number") return q.correctAnswer;
  if (typeof q.answer === "string" && Array.isArray(q.options)){
    const ans = q.answer.trim().toLowerCase();
    return q.options.findIndex(o => String(o).trim().toLowerCase() === ans);
  }
  return -1;
}

// --------------------
// Anti-cheat & reload guard
// --------------------
function setupAntiCheat(){
  document.addEventListener("contextmenu", e => { if (window.examStarted) e.preventDefault(); });
  document.addEventListener("keydown", e => {
    if (!window.examStarted) return;
    if (e.ctrlKey && ["c","v","x","a","u"].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key.toUpperCase()==="I")) e.preventDefault();
  });
}
window.setupAntiCheat = setupAntiCheat;

function detectReload(){
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  return nav ? nav.type === "reload" : (performance.navigation && performance.navigation.type===1);
}
function handleReloadPolicy(){
  if (!detectReload() || window.__examFinished) return;
  let count = Number(localStorage.getItem(LS_RELOADS)||"0")+1;
  localStorage.setItem(LS_RELOADS,String(count));
  if (count===1) {
    alert("⚠️ Page reloaded. One more reload will disqualify this exam.");
  } else if (count>=2){
    console.warn("[exam-core] ❌ Second reload detected — auto-submitting.");
    submitExam(true); // disqualify
  }
}

// --------------------
// Load exam data (preview before start)
// --------------------
window.loadExamData = async function(subject){
  try {
    const res = await fetch(`/static/data/${subject}.json`,{cache:"no-store"});
    if (!res.ok) throw new Error(`Failed ${res.status}`);
    
    // 👇 shuffle applied here
    window.examData = shuffleQuestions(await res.json());

    window.timeRemaining = (Number(window.examData.time_allowed_minutes)||20)*60;
    $("#timerDisplay") && ($("#timerDisplay").textContent = formatTime(window.timeRemaining));
    $("#totalQuestions") && ($("#totalQuestions").textContent = window.examData.questions.length);

    updateQuestionNavigation();
    loadQuestion(0);
    updateProgress();
  }catch(err){
    console.error("[exam-core] loadExamData error:",err);
    alert("Unable to load exam data. Contact admin.");
  }
};

// --------------------
// Timer
// --------------------
window.startTimer = function(){
  if (window.examTimer) clearInterval(window.examTimer);
  window.examTimer = setInterval(()=>{
    window.timeRemaining--;
    $("#timerDisplay") && ($("#timerDisplay").textContent = formatTime(window.timeRemaining));
    if (window.timeRemaining<=0){
      clearInterval(window.examTimer);
      submitExam(true); // timeout
    }
  },1000);
};

// --------------------
// Persistence
// --------------------
function saveProgress(){
  try{
    const payload = {
      currentQuestionIndex: window.currentQuestionIndex,
      userAnswers: window.userAnswers,
      locked: Array.from(window.lockedQuestions),
      timeRemaining: window.timeRemaining,
      examStarted: window.examStarted,
      examStartTime: window.examStartTime
    };
    sessionStorage.setItem(SS_KEY,JSON.stringify(payload));
  }catch{}
}
function loadProgress(){
  const saved = safeJSONParse(sessionStorage.getItem(SS_KEY));
  if (!saved) return false;
  try{
    window.currentQuestionIndex = saved.currentQuestionIndex||0;
    window.userAnswers = saved.userAnswers||{};
    window.lockedQuestions = new Set(saved.locked||[]);
    window.timeRemaining = saved.timeRemaining||window.timeRemaining;
    window.examStarted = !!saved.examStarted;
    window.examStartTime = saved.examStartTime||null;
    return true;
  }catch{ return false; }
}

// --------------------
// Question rendering
// --------------------
window.loadQuestion = function(index){
  if (!window.examData) return;
  if (index<0 || index>=window.examData.questions.length) return;

  window.currentQuestionIndex = index;
  const q = window.examData.questions[index];
  const qid = q.id ?? index;
  $("#currentQuestionNumber") && ($("#currentQuestionNumber").textContent = index+1);

  const prevAns = window.userAnswers[qid]?.index;
  const locked = window.lockedQuestions.has(qid);

  const optionsHTML = (q.options||[]).map((opt,i)=>{
    const selected = prevAns===i ? "selected":"";
    const disabled = locked ? "disabled":"";
    return `<button class="option-btn ${selected}" data-option-index="${i}" ${disabled}>
      <span class="option-letter">${String.fromCharCode(65+i)}</span>${opt}
    </button>`;
  }).join("");

  $("#questionContent").innerHTML = `
    <div class="fade-in-up">
      <h3 class="text-xl font-medium mb-4">${q.question}</h3>
      <div class="space-y-3">${optionsHTML}</div>
    </div>`;

  $$(".option-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectOption(Number(btn.dataset.optionIndex));
    });
  });

  updateNavigationButtons();
  updateQuestionNavigation();
};

// --------------------
// Selection
// --------------------
window.selectOption = function(optionIndex){
  if (!window.examData) return;
  const q = window.examData.questions[window.currentQuestionIndex];
  const qid = q.id ?? window.currentQuestionIndex;
  if (window.lockedQuestions.has(qid)) return;

  const correctIdx = getCorrectIndex(q);
  const isCorrect = (optionIndex===correctIdx);

  window.userAnswers[qid] = { index: optionIndex, correct: isCorrect };
  window.lockedQuestions.add(qid);

  $$(".option-btn").forEach(btn=>{
    btn.disabled=true;
    btn.classList.toggle("selected", Number(btn.dataset.optionIndex)===optionIndex);
  });

  if (typeof window.showAnswerFlash==="function"){
    window.showAnswerFlash(isCorrect);
  }

  updateProgress();
  updateQuestionNavigation();
  saveProgress();

  setTimeout(()=>{
    if (window.currentQuestionIndex < window.examData.questions.length-1){
      nextQuestion();
    } else {
      $("#nextBtn")?.click();
    }
  },700);
};

// --------------------
// Prev/Next
// --------------------
window.previousQuestion = function(){
  if (window.currentQuestionIndex>0) loadQuestion(window.currentQuestionIndex-1);
};
window.nextQuestion = function(){
  if (window.currentQuestionIndex<window.examData.questions.length-1){
    loadQuestion(window.currentQuestionIndex+1);
  } else {
    submitExam(false);
  }
};

// --------------------
// Progress
// --------------------
window.updateProgress = function(){
  if (!window.examData) return;
  const total = window.examData.questions.length;
  const answered = Object.keys(window.userAnswers).length;
  const remaining = total-answered;
  const pct = total? (answered/total)*100 : 0;
  $("#answeredCount") && ($("#answeredCount").textContent = answered);
  $("#remainingCount") && ($("#remainingCount").textContent = remaining);
  $("#progressBar") && ($("#progressBar").style.width=`${pct}%`);
  $("#progressText") && ($("#progressText").textContent = `${Math.round(pct)}% Complete`);
};

// --------------------
// Navigation UI
// --------------------
window.updateNavigationButtons = function(){
  const prev=$("#prevBtn"), next=$("#nextBtn");
  if (prev) prev.disabled = window.currentQuestionIndex===0;
  if (next){
    const last = window.currentQuestionIndex===window.examData.questions.length-1;
    next.textContent = last? "Submit":"Next →";
    next.disabled=false;
  }
};
window.updateQuestionNavigation = function(){
  const grid=$("#questionGrid");
  if (!grid||!window.examData) return;
  let html="";
  for (let i=0;i<window.examData.questions.length;i++){
    const q=window.examData.questions[i];
    const qid=q?.id??i;
    const active=i===window.currentQuestionIndex?"active":"";
    const answered=window.userAnswers[qid]?"answered":"";
    html+=`<button class="question-nav-btn ${active} ${answered}" data-q-index="${i}">${i+1}</button>`;
  }
  grid.innerHTML=html;
  $$(".question-nav-btn",grid).forEach(btn=>{
    btn.onclick=()=>loadQuestion(Number(btn.dataset.qIndex||btn.dataset["q-index"]||btn.getAttribute("data-q-index")));
  });
};

// --------------------
// Fullscreen
// --------------------
window.toggleFullscreen=function(){
  if (!document.fullscreenElement){
    (document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen||document.documentElement.msRequestFullscreen)?.call(document.documentElement);
  } else {
    (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen)?.call(document);
  }
};

// --------------------
// Results & Submit
// --------------------
function calculateResults(){
  if (!window.examData || !Array.isArray(window.examData.questions)) {
    return {
      totalQuestions: 0,
      answeredQuestions: 0,
      correctAnswers: 0,
      score: 0,
      timeTaken: 0
    };
  }

  const total = window.examData.questions.length;
  let correct = 0;

  window.examData.questions.forEach((q,i)=>{
    const qid = q.id ?? i;
    const ua = window.userAnswers[qid];
    if (!ua) return;
    const right = getCorrectIndex(q);
    if (ua.index === right) correct++;
  });

  return {
    totalQuestions: total,
    answeredQuestions: Object.keys(window.userAnswers).length,
    correctAnswers: correct,
    score: total ? Math.round((correct/total) * 100) : 0,
    timeTaken: Math.round((Date.now() - (window.examStartTime || Date.now()))/1000)
  };
}



window.submitExam = async function(timeUp=false){
  if (window.__examFinished) return;
  window.__examFinished=true;
  if (window.examTimer) clearInterval(window.examTimer);

  const res=calculateResults();
  try{
    await fetch("/api/exam/submit",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        score: res.score,
        correct: res.correctAnswers,
        total: res.totalQuestions,
        answered: res.answeredQuestions,
        timeTaken: res.timeTaken,
        submittedAt: new Date().toISOString(),
        status: timeUp? "timeout":"completed"
      })
    });
  }catch(e){ console.error(e); }
  finally{
    try{ sessionStorage.removeItem(SS_KEY);}catch{}
    window.location.href="/result";
  }
};

// --------------------
// Start Exam
// --------------------
window.startExam = async function(){
  if (window.examStarted) return;
  window.examStarted = true;

  try {
    const subject = (document.querySelector('meta[name="exam-subject"]')?.content || "biology").toLowerCase();
    const res = await fetch(`/static/data/${subject}.json`, {cache:"no-store"});
    if (!res.ok) throw new Error(`Failed ${res.status}`);
    
    // 👇 shuffle applied here too
    window.examData = shuffleQuestions(await res.json());

    // Try to load saved state first
    if (loadProgress()) {
      loadQuestion(window.currentQuestionIndex);
      startTimer();
    } else {
      // Fresh start
      window.examStartTime = Date.now();
      window.timeRemaining = (window.examData.time_allowed_minutes || 20) * 60;
      loadQuestion(0);
      startTimer();
    }

    $("#instructionsModal")?.classList.add("hidden");
    $("#examInterface")?.classList.remove("hidden");
    $("#examTimer")?.classList.remove("hidden");
    $("#fullscreenBtn")?.classList.remove("hidden");

  } catch (err) {
    console.error("[exam-core] startExam error:", err);
    alert("Unable to start exam. Contact admin.");
  }
};

// --------------------
// DOM Ready
// --------------------
function setupKeyboardNav(){
  document.addEventListener("keydown",e=>{
    if (!window.examStarted||window.__examFinished) return;
    if (e.key==="ArrowRight"){ e.preventDefault(); nextQuestion(); }
    if (e.key==="ArrowLeft"){ e.preventDefault(); previousQuestion(); }
    if (e.key==="Enter"){ e.preventDefault(); $("#nextBtn")?.click(); }
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  $("#startExamBtn")?.addEventListener("click",e=>{ e.preventDefault(); startExam(); });
  $("#fullscreenBtn")?.addEventListener("click",e=>{ e.preventDefault(); toggleFullscreen(); });

  const subject=(document.querySelector('meta[name="exam-subject"]')?.content||"biology").toLowerCase();
  loadExamData(subject);

  setupAntiCheat();
  setupKeyboardNav();
  handleReloadPolicy();
});



document.addEventListener("visibilitychange", () => {
  if (document.hidden && window.examStarted && !window.__examFinished) {
    alert("⚠️ Leaving the exam tab is not allowed. This has been recorded.");
    window.tabSwitches = (window.tabSwitches || 0) + 1;
    saveProgress();
    if (window.tabSwitches >= 2) {
      submitExam(true); // disqualify on 2nd switch
    }
  }
});




window.endExam = function() {
  if (!window.examData) return;

  const total = window.examData.questions.length;
  const answered = Object.keys(window.userAnswers).length;
  const remaining = total - answered;

  const msg = `
    Are you sure you want to end this exam?<br><br>
    <ul style="margin-left:1.2em;list-style:disc;">
      <li>You have answered <b>${answered}</b> out of <b>${total}</b> questions.</li>
      <li><b>${remaining}</b> unanswered questions will be marked incorrect.</li>
      <li>You will not be able to retake this exam.</li>
    </ul>
  `;

  const modal = document.getElementById("endExamModal");
  const msgEl = document.getElementById("endExamMessage");
  if (msgEl) msgEl.innerHTML = msg;
  if (modal) modal.classList.remove("hidden");
};

window.closeEndExam = function() {
  document.getElementById("endExamModal")?.classList.add("hidden");
};
