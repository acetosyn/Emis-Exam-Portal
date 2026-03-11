// static/js/bot.js
// EMIS exam instruction reader for exam.html
// ElevenLabs first, browser TTS fallback

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const instructionsModal = document.getElementById("instructionsModal");
  if (!instructionsModal) return;

  const startExamBtn = document.getElementById("startExamBtn");
  const modalCard = instructionsModal.querySelector(".modal-card");
  const modalHead = instructionsModal.querySelector(".modal-head");

  if (!modalCard) return;

  const hasBrowserTTS =
    "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

  const synth = hasBrowserTTS ? window.speechSynthesis : null;
  const ua = navigator.userAgent || "";

  const isiOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua);

  let bestVoice = null;
  let isSpeaking = false;
  let hasReadThisLoad = false;
  let speechBlocked = false;
  let currentAudio = null;
  let currentObjectUrl = null;

  function ensureVoicePanel() {
    if (document.getElementById("emisVoiceAssistantBox")) return;

    const panel = document.createElement("div");
    panel.id = "emisVoiceAssistantBox";
    panel.className = "exam-voice-panel";
    panel.innerHTML = `
      <div class="exam-voice-panel__left">
        <div class="exam-voice-panel__title">Voice Assistant</div>
        <div class="exam-voice-panel__status" id="emisVoiceStatus">
          Preparing instruction audio...
        </div>
      </div>
      <div class="exam-voice-panel__actions">
        <button type="button" id="replayInstructionsBtn" class="btn-secondary">Replay</button>
        <button type="button" id="stopInstructionsBtn" class="btn-secondary">Stop Voice</button>
      </div>
    `;

    if (modalHead) {
      modalHead.insertAdjacentElement("afterend", panel);
    } else {
      modalCard.insertBefore(panel, modalCard.firstChild);
    }

    document.getElementById("replayInstructionsBtn")?.addEventListener("click", () => {
      speakInstructions(true);
    });

    document.getElementById("stopInstructionsBtn")?.addEventListener("click", stopSpeaking);
  }

  function setVoiceStatus(message) {
    const el = document.getElementById("emisVoiceStatus");
    if (el) el.textContent = message;
  }

  function sanitizeTTS(text) {
    return String(text || "")
      .replace(/EMIS/gi, "Ee-miss")
      .replace(/\bMCQ(s)?\b/gi, "multiple choice question$1")
      .replace(/\bA–D\b/g, "A to D")
      .replace(/\bA-D\b/g, "A to D")
      .replace(/\//g, " or ")
      .replace(/&/g, " and ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreVoice(voice) {
    const name = (voice.name || "").toLowerCase();
    const lang = (voice.lang || "").toLowerCase();

    let score = 0;

    if (lang.startsWith("en")) score += 50;
    if (voice.default) score += 10;

    if (isSafari || isiOS) {
      if (/samantha/.test(name)) score += 100;
      if (/karen|moira|ava|allison|susan/.test(name)) score += 90;
      if (/premium|enhanced|natural/.test(name)) score += 40;
      if (/compact/.test(name)) score -= 10;
    }

    if (isChrome) {
      if (/google uk english female/.test(name)) score += 100;
      if (/google us english/.test(name)) score += 90;
      if (/google.*english/.test(name)) score += 70;
      if (/female/.test(name)) score += 8;
    }

    if (/microsoft aria|microsoft jenny|microsoft zira/.test(name)) score += 60;
    if (/female/.test(name)) score += 5;

    return score;
  }

  function cacheBestVoice() {
    if (!hasBrowserTTS) return null;

    const voices = synth.getVoices() || [];
    if (!voices.length) return null;

    const englishVoices = voices.filter(v => (v.lang || "").toLowerCase().startsWith("en"));
    bestVoice = (englishVoices.length ? englishVoices : voices)
      .slice()
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];

    return bestVoice;
  }

  function getInstructionText() {
    const durationBadge = instructionsModal.querySelector(".exam-duration-badge");
    const duration = durationBadge
      ? durationBadge.textContent.replace(/\s+/g, " ").trim()
      : "60 minutes";

    const paragraphs = Array.from(instructionsModal.querySelectorAll(".instruction-card p"))
      .map(p => p.textContent.trim())
      .filter(Boolean);

    const intro = [
      "Assalamu alaikum.",
      "Welcome to the Ee-miss examination portal.",
      "Please listen carefully to these instructions before you begin.",
      `Your exam duration is ${duration}.`
    ].join(" ");

    const body = paragraphs.map((text, index) => {
      const cleaned = sanitizeTTS(text.replace(/\.$/, ""));

      if (index === 0) return `First, ${cleaned}.`;
      if (index === 1) return `Important notice: ${cleaned}.`;
      if (index === 2) return `Please note this carefully: ${cleaned}.`;
      if (index === 3) return `Also, ${cleaned}.`;
      if (index === 4) return `${cleaned}.`;
      if (index === 5) return `Remember, ${cleaned}.`;
      return `${cleaned}.`;
    }).join(" ");

    const closing = [
      "Take your time, stay calm, and answer carefully.",
      "When you are fully ready, click Start Exam to begin.",
      "We wish you success."
    ].join(" ");

    return sanitizeTTS(`${intro} ${body} ${closing}`);
  }

  function getVoiceSettings() {
    const name = (bestVoice?.name || "").toLowerCase();

    if (isSafari || isiOS) {
      return {
        rate: 0.9,
        pitch: /daniel/.test(name) ? 1.0 : 1.02,
        volume: 1
      };
    }

    if (isChrome) {
      return {
        rate: 0.94,
        pitch: /female/.test(name) ? 1.02 : 1.0,
        volume: 1
      };
    }

    return {
      rate: 0.93,
      pitch: 1.0,
      volume: 1
    };
  }

  function cleanupAudioUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  function stopSpeaking() {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }

      cleanupAudioUrl();

      if (hasBrowserTTS) {
        synth.cancel();
      }

      isSpeaking = false;
      setVoiceStatus("Voice stopped.");
    } catch (err) {
      console.warn("Unable to stop speech:", err);
    }
  }

  async function playElevenLabsInstructions() {
    const res = await fetch("/api/tts/instructions", {
      method: "GET",
      cache: "no-store"
    });

    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    if (!res.ok || !contentType.includes("audio")) {
      let errorMessage = "Instruction audio unavailable.";
      try {
        const data = await res.json();
        errorMessage = data.error || errorMessage;
      } catch (_) {}
      throw new Error(errorMessage);
    }

    const blob = await res.blob();
    cleanupAudioUrl();
    currentObjectUrl = URL.createObjectURL(blob);

    currentAudio = new Audio(currentObjectUrl);
    currentAudio.preload = "auto";

    currentAudio.onplay = () => {
      isSpeaking = true;
      speechBlocked = false;
      setVoiceStatus("Reading instructions with ElevenLabs...");
    };

    currentAudio.onended = () => {
      isSpeaking = false;
      setVoiceStatus("Instruction reading completed.");
      cleanupAudioUrl();
    };

    currentAudio.onerror = () => {
      isSpeaking = false;
      setVoiceStatus("ElevenLabs audio could not play. Falling back...");
      cleanupAudioUrl();
      throw new Error("Audio playback failed.");
    };

    await currentAudio.play();
  }

  function speakNow(text) {
    if (!hasBrowserTTS) {
      setVoiceStatus("Voice is not supported in this browser.");
      return;
    }

    if (!text) {
      setVoiceStatus("No instruction text found.");
      return;
    }

    cacheBestVoice();

    const { rate, pitch, volume } = getVoiceSettings();
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.voice = bestVoice || null;
    utterance.lang = (bestVoice && bestVoice.lang) || "en-US";
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => {
      isSpeaking = true;
      speechBlocked = false;
      setVoiceStatus(`Reading instructions with ${bestVoice ? bestVoice.name : "browser voice"}...`);
    };

    utterance.onend = () => {
      isSpeaking = false;
      setVoiceStatus("Instruction reading completed.");
    };

    utterance.onerror = () => {
      isSpeaking = false;
      speechBlocked = true;
      setVoiceStatus("Browser voice was blocked. Tap anywhere once or press Replay.");
    };

    try {
      synth.cancel();
      synth.speak(utterance);
    } catch (err) {
      console.warn("Speech failed:", err);
      speechBlocked = true;
      setVoiceStatus("Voice could not start. Press Replay.");
    }
  }

  function initBrowserSpeech(text) {
    if (!hasBrowserTTS) {
      setVoiceStatus("Voice is not supported in this browser.");
      return;
    }

    const tryLoad = (attempt = 0) => {
      const voices = synth.getVoices();

      if ((voices && voices.length) || attempt >= 10) {
        cacheBestVoice();
        speakNow(text);
        return;
      }

      setTimeout(() => tryLoad(attempt + 1), 200);
    };

    tryLoad();
  }

  async function speakInstructions(force = false) {
    if (!force && hasReadThisLoad) return;

    stopSpeaking();
    hasReadThisLoad = true;

    try {
      setVoiceStatus("Preparing ElevenLabs audio...");
      await playElevenLabsInstructions();
    } catch (err) {
      console.warn("ElevenLabs failed, falling back to browser TTS:", err);
      const text = getInstructionText();
      setVoiceStatus("ElevenLabs unavailable. Falling back to browser voice...");
      initBrowserSpeech(text);
    }
  }

  function unlockSpeechAndRead() {
    if (hasBrowserTTS) {
      try {
        const primer = new SpeechSynthesisUtterance(" ");
        primer.volume = 0;
        synth.speak(primer);
        synth.cancel();
      } catch (err) {
        console.warn("Speech prime failed:", err);
      }
    }

    if (!isSpeaking) {
      speakInstructions(true);
    }
  }

  function isInstructionsVisible() {
    return !instructionsModal.classList.contains("hidden");
  }

  ensureVoicePanel();
  cacheBestVoice();

  if (hasBrowserTTS && "onvoiceschanged" in synth) {
    synth.onvoiceschanged = () => {
      cacheBestVoice();
    };
  }

  if (isInstructionsVisible()) {
    setVoiceStatus("Preparing audio instructions...");
    speakInstructions(false);
  }

  const firstInteractionHandler = () => {
    if (!isInstructionsVisible()) return;
    if (isSpeaking) return;

    if (speechBlocked || !hasReadThisLoad) {
      unlockSpeechAndRead();
    }
  };

  document.addEventListener("click", firstInteractionHandler, true);
  document.addEventListener("touchstart", firstInteractionHandler, true);
  document.addEventListener("keydown", firstInteractionHandler, true);

  startExamBtn?.addEventListener("click", stopSpeaking);
});