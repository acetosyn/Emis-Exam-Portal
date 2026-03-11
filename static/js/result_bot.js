// static/js/result_bot.js
// Reads candidate result summary
// ElevenLabs first, browser fallback

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const resultCard = document.querySelector(".result-card");
  if (!resultCard) return;

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

  function ensureResultVoicePanel() {
    if (document.getElementById("resultVoiceAssistantBox")) return;

    const header = document.querySelector(".result-header");
    if (!header) return;

    const panel = document.createElement("div");
    panel.id = "resultVoiceAssistantBox";
    panel.className = "exam-voice-panel result-voice-panel";
    panel.innerHTML = `
      <div class="exam-voice-panel__left">
        <div class="exam-voice-panel__title">Result Voice Assistant</div>
        <div class="exam-voice-panel__status" id="resultVoiceStatus">
          Preparing result audio...
        </div>
      </div>
      <div class="exam-voice-panel__actions">
        <button type="button" id="replayResultBtn" class="btn-secondary">Replay</button>
        <button type="button" id="stopResultBtn" class="btn-secondary">Stop Voice</button>
      </div>
    `;

    header.insertAdjacentElement("afterend", panel);

    document.getElementById("replayResultBtn")?.addEventListener("click", () => {
      speakResultSummary(true);
    });

    document.getElementById("stopResultBtn")?.addEventListener("click", stopSpeaking);
  }

  function setVoiceStatus(message) {
    const el = document.getElementById("resultVoiceStatus");
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
      console.warn("Unable to stop result speech:", err);
    }
  }

  function getResultText() {
    const result = window.resultData || {};

    const fullName = result.fullname || "candidate";
    const subject = result.subject || "your subject";
    const score = Number(result.score ?? 0);
    const correct = Number(result.correct ?? 0);
    const total = Number(result.total ?? 0);
    const status = result.status || "completed";

    return sanitizeTTS(
      [
        "Assalamu alaikum.",
        `Hello ${fullName}.`,
        "Your exam result is now available.",
        `Subject: ${subject}.`,
        `Your score is ${score} percent.`,
        `You answered ${correct} questions correctly out of ${total}.`,
        `Your exam status is ${status}.`,
        "Thank you for taking the examination."
      ].join(" ")
    );
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

  async function playElevenLabsResultSummary() {
    const res = await fetch("/api/tts/result-summary", {
      method: "GET",
      cache: "no-store"
    });

    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    if (!res.ok || !contentType.includes("audio")) {
      let errorMessage = "Result audio unavailable.";
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
      setVoiceStatus("Reading result with ElevenLabs...");
    };

    currentAudio.onended = () => {
      isSpeaking = false;
      setVoiceStatus("Result reading completed.");
      cleanupAudioUrl();
    };

    currentAudio.onerror = () => {
      isSpeaking = false;
      setVoiceStatus("ElevenLabs result audio failed. Falling back...");
      cleanupAudioUrl();
      throw new Error("Result audio playback failed.");
    };

    await currentAudio.play();
  }

  function speakNow(text) {
    if (!hasBrowserTTS) {
      setVoiceStatus("Voice is not supported in this browser.");
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
      setVoiceStatus(`Reading result with ${bestVoice ? bestVoice.name : "browser voice"}...`);
    };

    utterance.onend = () => {
      isSpeaking = false;
      setVoiceStatus("Result reading completed.");
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
      console.warn("Result speech failed:", err);
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

  async function speakResultSummary(force = false) {
    if (!force && hasReadThisLoad) return;

    stopSpeaking();
    hasReadThisLoad = true;

    try {
      setVoiceStatus("Preparing ElevenLabs result audio...");
      await playElevenLabsResultSummary();
    } catch (err) {
      console.warn("ElevenLabs result summary failed, using browser fallback:", err);
      const text = getResultText();
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
        console.warn("Result speech prime failed:", err);
      }
    }

    if (!isSpeaking) {
      speakResultSummary(true);
    }
  }

  ensureResultVoicePanel();
  cacheBestVoice();

  if (hasBrowserTTS && "onvoiceschanged" in synth) {
    synth.onvoiceschanged = () => {
      cacheBestVoice();
    };
  }

  setVoiceStatus("Preparing result audio...");
  speakResultSummary(false);

  const interactionHandler = () => {
    if (isSpeaking) return;

    if (speechBlocked || !hasReadThisLoad) {
      unlockSpeechAndRead();
    }
  };

  document.addEventListener("click", interactionHandler, true);
  document.addEventListener("touchstart", interactionHandler, true);
  document.addEventListener("keydown", interactionHandler, true);
});