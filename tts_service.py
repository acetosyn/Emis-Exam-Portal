# tts_service.py
from __future__ import annotations

import os
import re
from typing import Dict, Optional, Tuple

import requests
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "").strip()
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "").strip()
ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2").strip()

# ElevenLabs TTS endpoint
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

# Safe default output for web playback
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"


def has_tts_config() -> bool:
    """Return True only when all required ElevenLabs config is present."""
    return bool(ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID and ELEVENLABS_MODEL_ID)


def sanitize_tts_text(text: str) -> str:
    """
    Clean and normalize text for smoother pronunciation.
    Important custom pronunciation:
    - EMIS -> Ee-miss
    """
    if not text:
        return ""

    cleaned = str(text)

    # Custom pronunciation and normalization
    cleaned = re.sub(r"\bEMIS\b", "Ee-miss", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bMCQ(s)?\b", r"multiple choice question\1", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace("A–D", "A to D").replace("A-D", "A to D")
    cleaned = cleaned.replace("&", " and ")
    cleaned = cleaned.replace("/", " or ")

    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def build_headers() -> Dict[str, str]:
    return {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }


def build_payload(
    text: str,
    model_id: Optional[str] = None,
    language_code: str = "en",
) -> Dict:
    """
    Build a balanced payload for natural but stable exam narration.
    ElevenLabs supports model_id, language_code, voice_settings, and text normalization controls. :contentReference[oaicite:1]{index=1}
    """
    return {
        "text": sanitize_tts_text(text),
        "model_id": model_id or ELEVENLABS_MODEL_ID or "eleven_multilingual_v2",
        "language_code": language_code,
        "apply_text_normalization": "auto",
        "voice_settings": {
            # Tuned for calm, natural instruction reading
            "stability": 0.42,
            "similarity_boost": 0.82,
            "style": 0.18,
            "use_speaker_boost": True,
        },
    }


def generate_tts_audio(
    text: str,
    *,
    output_format: str = DEFAULT_OUTPUT_FORMAT,
    timeout: int = 45,
    model_id: Optional[str] = None,
    language_code: str = "en",
) -> Tuple[bool, bytes, Dict]:
    """
    Generate MP3 audio bytes from ElevenLabs.

    Returns:
        (success, audio_bytes, meta)

    success = True  -> audio_bytes contains MP3 data
    success = False -> audio_bytes is b'' and meta contains error info

    output_format is passed as a query parameter, which ElevenLabs supports. :contentReference[oaicite:2]{index=2}
    """
    if not has_tts_config():
        return False, b"", {
            "provider": "elevenlabs",
            "error": "ElevenLabs is not configured in .env",
            "status_code": None,
            "fallback": True,
        }

    cleaned_text = sanitize_tts_text(text)
    if not cleaned_text:
        return False, b"", {
            "provider": "elevenlabs",
            "error": "No text provided for TTS",
            "status_code": None,
            "fallback": True,
        }

    url = ELEVENLABS_TTS_URL.format(voice_id=ELEVENLABS_VOICE_ID)
    params = {
        "output_format": output_format
    }
    payload = build_payload(
        cleaned_text,
        model_id=model_id,
        language_code=language_code,
    )

    try:
        response = requests.post(
            url,
            params=params,
            headers=build_headers(),
            json=payload,
            timeout=timeout,
        )

        content_type = (response.headers.get("Content-Type") or "").lower()

        if response.ok and ("audio" in content_type or response.content):
            return True, response.content, {
                "provider": "elevenlabs",
                "voice_id": ELEVENLABS_VOICE_ID,
                "model_id": payload["model_id"],
                "output_format": output_format,
                "status_code": response.status_code,
                "fallback": False,
            }

        # Try to extract any JSON error body
        error_detail = None
        try:
            error_detail = response.json()
        except Exception:
            error_detail = response.text[:500] if response.text else "Unknown ElevenLabs error"

        return False, b"", {
            "provider": "elevenlabs",
            "error": error_detail,
            "status_code": response.status_code,
            "fallback": True,
        }

    except requests.Timeout:
        return False, b"", {
            "provider": "elevenlabs",
            "error": "ElevenLabs request timed out",
            "status_code": None,
            "fallback": True,
        }
    except requests.RequestException as exc:
        return False, b"", {
            "provider": "elevenlabs",
            "error": f"Network error: {exc}",
            "status_code": None,
            "fallback": True,
        }
    except Exception as exc:
        return False, b"", {
            "provider": "elevenlabs",
            "error": f"Unexpected error: {exc}",
            "status_code": None,
            "fallback": True,
        }


def generate_instruction_text_from_lines(lines: list[str], duration_text: str = "60 minutes") -> str:
    """
    Optional helper for exam instructions if you want to build the text on the backend.
    """
    safe_lines = [sanitize_tts_text(x) for x in (lines or []) if str(x).strip()]
    intro = (
        f"Assalamu alaikum. Welcome to the Ee-miss examination portal. "
        f"Please listen carefully to these instructions before you begin. "
        f"Your exam duration is {duration_text}. "
    )
    closing = (
        "Take your time, stay calm, and answer carefully. "
        "When you are fully ready, click Start Exam to begin. "
        "We wish you success."
    )

    body_parts = []
    for index, item in enumerate(safe_lines):
        if index == 0:
            body_parts.append(f"First, {item}.")
        elif index == 1:
            body_parts.append(f"Important notice: {item}.")
        elif index == 2:
            body_parts.append(f"Please note this carefully: {item}.")
        elif index == 3:
            body_parts.append(f"Also, {item}.")
        elif index == 4:
            body_parts.append(f"{item}.")
        elif index == 5:
            body_parts.append(f"Remember, {item}.")
        else:
            body_parts.append(f"{item}.")

    return sanitize_tts_text(f"{intro} {' '.join(body_parts)} {closing}")


def generate_result_summary_text(
    *,
    full_name: str = "",
    subject: str = "",
    score: Optional[float] = None,
    correct: Optional[int] = None,
    total: Optional[int] = None,
    status: str = "",
) -> str:
    """
    Optional helper for result page narration.
    """
    parts = [
        "Assalamu alaikum.",
        "Your examination has been completed.",
    ]

    if full_name:
        parts.append(f"Candidate, {sanitize_tts_text(full_name)}.")

    if subject:
        parts.append(f"Subject: {sanitize_tts_text(subject)}.")

    if score is not None:
        parts.append(f"Your score is {score} percent.")

    if correct is not None and total is not None:
        parts.append(f"You answered {correct} questions correctly out of {total}.")

    if status:
        parts.append(f"Your exam status is {sanitize_tts_text(status)}.")

    parts.append("Thank you for taking the examination.")

    return sanitize_tts_text(" ".join(parts))