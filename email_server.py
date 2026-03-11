"""
email_server.py
Robust EMIS email service for:
- automatic admin notification when a candidate submits exam
- automatic candidate result email with PDF
- admin-triggered "Send to EDA" email with PDF
- works locally and on PythonAnywhere

Delivery strategy:
1. Try explicit RELAY_URL if provided
2. Else try PythonAnywhere relay via SMTP_HOST /send
3. Else fall back to direct SMTP using MAIL_SERVER / MAIL_USERNAME / MAIL_PASSWORD

Recommended .env keys:
  MAIL_SERVER=smtp.gmail.com
  MAIL_PORT=587
  MAIL_USE_TLS=True
  MAIL_USERNAME=epiconsultdiagnostics1@gmail.com
  MAIL_PASSWORD=your_app_password
  EMAIL_FROM=epiconsultdiagnostics1@gmail.com
  NOTIFY_EMAIL=adetomi.epitomeschools@gmail.com

Optional relay keys:
  RELAY_URL=https://your-pythonanywhere-domain/send
  SMTP_HOST=acetosyn097007.pythonanywhere.com

Notes:
- NOTIFY_EMAIL is used for admin notification and EDA sends unless overridden later.
- PDF summaries are generated with reportlab.
"""

import io
import os
import smtplib
from datetime import datetime
from email.message import EmailMessage
from email.utils import formatdate
from pathlib import Path
from typing import Dict, Any

import requests
from dotenv import load_dotenv
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# --------------------------------------------------
# Setup
# --------------------------------------------------
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

load_dotenv()


# --------------------------------------------------
# Utilities
# --------------------------------------------------
def _fmt_time(seconds: int) -> str:
    try:
        seconds = int(seconds or 0)
    except Exception:
        seconds = 0
    m, s = divmod(seconds, 60)
    return f"{m}m {s:02d}s"


def _compute_pass_fail(result: Dict[str, Any]) -> str:
    """
    Business rule: PASS if correct >= 20 out of 40; else FAILED.
    If 'pass_fail' already exists and is truthy, use it.
    """
    if result.get("pass_fail"):
        return str(result["pass_fail"])
    correct = int(result.get("correct") or 0)
    return "PASS" if correct >= 20 else "FAILED"


def _safe_upper(value: Any, fallback: str = "EXAM") -> str:
    return str(value or fallback).upper()


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value or default)
    except Exception:
        return default


def _safe_str(value: Any, default: str = "") -> str:
    return str(value if value is not None else default)


def _safe_submitted_at(result: Dict[str, Any]) -> str:
    return _safe_str(result.get("submitted_at"), datetime.utcnow().isoformat())


# --------------------------------------------------
# Subject lines
# --------------------------------------------------
def _compose_subject_admin(result: Dict[str, Any]) -> str:
    username = _safe_str(result.get("username"), "unknown")
    status = _compute_pass_fail(result)
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    subject = _safe_upper(result.get("subject"))
    return f"[EMIS] Exam Completion — {username} — {status} ({correct}/{total}, {subject})"


def _compose_subject_candidate(result: Dict[str, Any]) -> str:
    status = _compute_pass_fail(result)
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    subject = _safe_upper(result.get("subject"))
    return f"[EMIS] Your Exam Result — {status} ({correct}/{total}, {subject})"


def _compose_subject_eda(result: Dict[str, Any]) -> str:
    username = _safe_str(result.get("username"), "unknown")
    fullname = _safe_str(result.get("fullname"), "Candidate")
    subject = _safe_upper(result.get("subject"))
    status = _compute_pass_fail(result)
    score = _safe_int(result.get("score"))
    return f"[EMIS] Result Sent to EDA — {fullname} ({username}) — {status} ({score}%, {subject})"


# --------------------------------------------------
# Admin mail bodies
# --------------------------------------------------
def _compose_body_admin_text(result: Dict[str, Any]) -> str:
    full_name = _safe_str(result.get("fullname"), "Candidate")
    username = _safe_str(result.get("username"), "N/A")
    subject = _safe_upper(result.get("subject"), "Exam")
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    percent = _safe_int(result.get("score"))
    status = _compute_pass_fail(result)
    time_tk = _fmt_time(result.get("time_taken"))
    submitted = _safe_submitted_at(result)

    opening = (
        "has successfully completed their examination. The candidate PASSED."
        if status == "PASS"
        else "has completed their examination. The candidate did not meet the pass threshold."
    )

    return f"""Dear Epitome Administration,

This is to notify you that candidate {username} ({full_name}) {opening}

• Subject: {subject}
• Score: {correct}/{total} ({percent}%)
• Outcome: {status}
• Time Taken: {time_tk}
• Submitted: {submitted}

A one-page PDF summary is attached. The rolling CSV log for today is also attached (if available).

Warm regards,
EMIS Exam Portal
"""


def _compose_body_admin_html(result: Dict[str, Any]) -> str:
    full_name = _safe_str(result.get("fullname"), "Candidate")
    username = _safe_str(result.get("username"), "N/A")
    subject = _safe_upper(result.get("subject"), "Exam")
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    percent = _safe_int(result.get("score"))
    status = _compute_pass_fail(result)
    time_tk = _fmt_time(result.get("time_taken"))
    submitted = _safe_submitted_at(result)

    badge_color = "#16a34a" if status == "PASS" else "#dc2626"
    badge_bg = "#dcfce7" if status == "PASS" else "#fee2e2"
    intro = (
        "has successfully completed their examination. <b>The candidate PASSED.</b>"
        if status == "PASS"
        else "has completed their examination. <b>The candidate did not meet the pass threshold.</b>"
    )

    return f"""
<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.5;">
  <p>Dear Epitome Administration,</p>
  <p>
    This is to notify you that candidate <b>{username}</b> ({full_name}) {intro}
  </p>

  <div style="margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:10px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
      <span style="background:{badge_bg};color:{badge_color};padding:6px 10px;border-radius:999px;font-weight:700;">{status}</span>
      <span style="font-weight:600">{subject}</span>
    </div>
    <div>Score: <b>{correct}/{total} ({percent}%)</b></div>
    <div>Time Taken: <b>{time_tk}</b></div>
    <div>Submitted: <b>{submitted}</b></div>
  </div>

  <p>A one-page PDF summary is attached. The rolling CSV log for today is also attached (if available).</p>
  <p>Warm regards,<br/>EMIS Exam Portal</p>
</div>
""".strip()


# --------------------------------------------------
# Candidate mail bodies
# --------------------------------------------------
def _compose_body_candidate_text(result: Dict[str, Any]) -> str:
    full_name = _safe_str(result.get("fullname"), "Candidate")
    subject = _safe_upper(result.get("subject"), "Exam")
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    percent = _safe_int(result.get("score"))
    status = _compute_pass_fail(result)
    time_tk = _fmt_time(result.get("time_taken"))
    submitted = _safe_submitted_at(result)

    summary_line = (
        "Congratulations on successfully completing your examination. You PASSED."
        if status == "PASS"
        else "You have completed your examination. You did not meet the pass threshold this time."
    )

    return f"""Dear {full_name},

{summary_line}

• Subject: {subject}
• Score: {correct}/{total} ({percent}%)
• Outcome: {status}
• Time Taken: {time_tk}
• Submitted: {submitted}

A one-page PDF summary of your result is attached for your record.

Warm regards,
Epitome Model Islamic Schools (EMIS)
"""


def _compose_body_candidate_html(result: Dict[str, Any]) -> str:
    full_name = _safe_str(result.get("fullname"), "Candidate")
    subject = _safe_upper(result.get("subject"), "Exam")
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    percent = _safe_int(result.get("score"))
    status = _compute_pass_fail(result)
    time_tk = _fmt_time(result.get("time_taken"))
    submitted = _safe_submitted_at(result)

    badge_color = "#16a34a" if status == "PASS" else "#dc2626"
    badge_bg = "#dcfce7" if status == "PASS" else "#fee2e2"
    intro = (
        "Congratulations on successfully completing your examination. <b>You PASSED.</b>"
        if status == "PASS"
        else "You have completed your examination. <b>You did not meet the pass threshold this time.</b>"
    )

    return f"""
<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.5;">
  <p>Dear {full_name},</p>
  <p>{intro}</p>

  <div style="margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:10px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
      <span style="background:{badge_bg};color:{badge_color};padding:6px 10px;border-radius:999px;font-weight:700;">{status}</span>
      <span style="font-weight:600">{subject}</span>
    </div>
    <div>Score: <b>{correct}/{total} ({percent}%)</b></div>
    <div>Time Taken: <b>{time_tk}</b></div>
    <div>Submitted: <b>{submitted}</b></div>
  </div>

  <p>A one-page PDF summary of your result is attached for your record.</p>
  <p>Warm regards,<br/>Epitome Model Islamic Schools (EMIS)</p>
</div>
""".strip()


# --------------------------------------------------
# EDA mail bodies
# --------------------------------------------------
def _compose_body_eda_text(result: Dict[str, Any]) -> str:
    full_name = _safe_str(result.get("fullname"), "Candidate")
    username = _safe_str(result.get("username"), "N/A")
    email = _safe_str(result.get("email"), "N/A")
    subject = _safe_upper(result.get("subject"), "Exam")
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    percent = _safe_int(result.get("score"))
    status = _compute_pass_fail(result)
    time_tk = _fmt_time(result.get("time_taken"))
    submitted = _safe_submitted_at(result)

    return f"""Dear EDA,

Please find attached the official EMIS result summary for the candidate below.

• Full Name: {full_name}
• Username: {username}
• Candidate Email: {email}
• Subject: {subject}
• Score: {correct}/{total} ({percent}%)
• Outcome: {status}
• Time Taken: {time_tk}
• Submitted: {submitted}

The PDF summary is attached for your record.

Warm regards,
EMIS Exam Portal
"""


def _compose_body_eda_html(result: Dict[str, Any]) -> str:
    full_name = _safe_str(result.get("fullname"), "Candidate")
    username = _safe_str(result.get("username"), "N/A")
    email = _safe_str(result.get("email"), "N/A")
    subject = _safe_upper(result.get("subject"), "Exam")
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    percent = _safe_int(result.get("score"))
    status = _compute_pass_fail(result)
    time_tk = _fmt_time(result.get("time_taken"))
    submitted = _safe_submitted_at(result)

    badge_color = "#16a34a" if status == "PASS" else "#dc2626"
    badge_bg = "#dcfce7" if status == "PASS" else "#fee2e2"

    return f"""
<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.5;">
  <p>Dear EDA,</p>
  <p>Please find attached the official EMIS result summary for the candidate below.</p>

  <div style="margin:16px 0;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
      <span style="background:{badge_bg};color:{badge_color};padding:6px 10px;border-radius:999px;font-weight:700;">{status}</span>
      <span style="font-weight:700;color:#0f2b46;">{subject}</span>
    </div>

    <div style="margin-bottom:6px;">Full Name: <b>{full_name}</b></div>
    <div style="margin-bottom:6px;">Username: <b>{username}</b></div>
    <div style="margin-bottom:6px;">Candidate Email: <b>{email}</b></div>
    <div style="margin-bottom:6px;">Score: <b>{correct}/{total} ({percent}%)</b></div>
    <div style="margin-bottom:6px;">Time Taken: <b>{time_tk}</b></div>
    <div>Submitted: <b>{submitted}</b></div>
  </div>

  <p>The PDF summary is attached for your record.</p>
  <p>Warm regards,<br/>EMIS Exam Portal</p>
</div>
""".strip()


# --------------------------------------------------
# PDF generation
# --------------------------------------------------
def _generate_pdf_bytes(result: Dict[str, Any]) -> bytes:
    """
    Generate a simple branded one-page PDF in memory.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    left = 22 * mm
    top_y = height - 25 * mm

    c.setFillColor(colors.HexColor("#0f2b46"))
    c.setFont("Helvetica-Bold", 18)
    c.drawString(left, top_y, "EMIS — Examination Result Summary")

    c.setFillColor(colors.black)
    c.setFont("Helvetica", 11)

    c.setStrokeColor(colors.HexColor("#38bdf8"))
    c.setLineWidth(2)
    c.line(left, top_y - 6 * mm, width - left, top_y - 6 * mm)

    y = top_y - 15 * mm

    def row(label: str, value: str):
        nonlocal y
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left, y, f"{label}:")
        c.setFont("Helvetica", 11)
        c.drawString(left + 42 * mm, y, _safe_str(value))
        y -= 8 * mm

    username = _safe_str(result.get("username"), "N/A")
    fullname = _safe_str(result.get("fullname"), "N/A")
    subject = _safe_upper(result.get("subject"))
    correct = _safe_int(result.get("correct"))
    total = _safe_int(result.get("total"))
    percent = _safe_int(result.get("score"))
    status = _compute_pass_fail(result)
    time_tk = _fmt_time(result.get("time_taken"))
    submitted = _safe_submitted_at(result)

    badge_color = colors.HexColor("#16a34a") if status == "PASS" else colors.HexColor("#dc2626")
    c.setFillColor(badge_color)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(left, y, f"Outcome: {status}")
    y -= 10 * mm

    c.setFillColor(colors.black)
    row("Candidate", f"{fullname} ({username})")
    row("Subject", subject)
    row("Score", f"{correct}/{total} ({percent}%)")
    row("Time Taken", time_tk)
    row("Submitted", submitted)

    c.setFillColor(colors.HexColor("#6b7280"))
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(left, 20 * mm, "Generated automatically by EMIS Exam Portal")

    c.showPage()
    c.save()
    return buf.getvalue()


# --------------------------------------------------
# Message builder
# --------------------------------------------------
def _build_base_message(to_email: str, subject: str, text: str, html: str) -> EmailMessage:
    email_from = os.getenv("EMAIL_FROM", os.getenv("MAIL_USERNAME", "no-reply@emis.local"))
    msg = EmailMessage()
    msg["From"] = email_from
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Subject"] = subject
    msg["Reply-To"] = email_from
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    return msg


# --------------------------------------------------
# Delivery engine
# --------------------------------------------------
def _smtp_send(msg: EmailMessage) -> bool:
    """
    Reliable delivery order:
    1. Use RELAY_URL if set
    2. Else use PythonAnywhere relay via SMTP_HOST -> https://<host>/send
    3. Else fall back to direct SMTP using MAIL_* settings

    This keeps mail working both locally and after deployment.
    """
    try:
        subject = msg["Subject"]
        to = msg["To"]
        html_part = msg.get_body(preferencelist=("html",))
        html = html_part.get_content() if html_part else msg.get_content()

        # 1) Explicit relay URL
        relay_url = (os.getenv("RELAY_URL") or "").strip()
        if relay_url:
            try:
                payload = {"subject": subject, "to": to, "html": html}
                response = requests.post(relay_url, json=payload, timeout=20)
                if response.status_code == 200:
                    print(f"[email_server] ✅ Email relayed successfully to {to} via RELAY_URL")
                    return True
                print(f"[email_server] ⚠️ RELAY_URL error {response.status_code}: {response.text}")
            except Exception as e:
                print(f"[email_server] ⚠️ RELAY_URL send failed: {e}")

        # 2) PythonAnywhere relay host
        relay_host = (os.getenv("SMTP_HOST") or "acetosyn097007.pythonanywhere.com").strip()
        if relay_host:
            try:
                relay_endpoint = f"https://{relay_host}/send"
                payload = {"subject": subject, "to": to, "html": html}
                response = requests.post(relay_endpoint, json=payload, timeout=20)
                if response.status_code == 200:
                    print(f"[email_server] ✅ Email relayed successfully to {to} via PythonAnywhere host")
                    return True
                print(f"[email_server] ⚠️ PythonAnywhere relay error {response.status_code}: {response.text}")
            except Exception as e:
                print(f"[email_server] ⚠️ PythonAnywhere relay failed: {e}")

        # 3) Direct SMTP fallback
        mail_server = (os.getenv("MAIL_SERVER") or "").strip()
        mail_username = (os.getenv("MAIL_USERNAME") or "").strip()
        mail_password = (os.getenv("MAIL_PASSWORD") or "").strip()

        if mail_server and mail_username and mail_password:
            mail_port = int(os.getenv("MAIL_PORT", 587))
            use_tls = os.getenv("MAIL_USE_TLS", "True").lower() == "true"

            print(f"[email_server] 📧 Falling back to direct SMTP ({mail_server}:{mail_port})")
            with smtplib.SMTP(mail_server, mail_port, timeout=20) as server:
                if use_tls:
                    server.starttls()
                server.login(mail_username, mail_password)
                server.send_message(msg)

            print(f"[email_server] ✅ Email sent directly to {to}")
            return True

        print("[email_server] ⚠️ No working relay or SMTP configuration found.")
        return False

    except Exception as e:
        print(f"[email_server] ❌ Send error: {e}")
        return False


# --------------------------------------------------
# Public senders: admin / candidate
# --------------------------------------------------
def send_admin_email(result: Dict[str, Any]) -> bool:
    """
    Send admin email with PDF and today's CSV if present.
    Supports comma-separated recipients in NOTIFY_EMAIL.
    """
    admin_to = os.getenv("NOTIFY_EMAIL", "adetomi.epitomeschools@gmail.com").strip()

    subject = _compose_subject_admin(result)
    text = _compose_body_admin_text(result)
    html = _compose_body_admin_html(result)

    msg = _build_base_message(admin_to, subject, text, html)

    pdf_bytes = _generate_pdf_bytes(result)
    username = _safe_str(result.get("username"), "candidate")
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_filename = f"EMIS_Result_{username}_{ts}.pdf"

    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=pdf_filename
    )

    today_csv = LOGS_DIR / f"exam_results_{datetime.now().strftime('%Y-%m-%d')}.csv"
    if today_csv.exists():
        with open(today_csv, "rb") as f:
            msg.add_attachment(
                f.read(),
                maintype="text",
                subtype="csv",
                filename=today_csv.name
            )

    return _smtp_send(msg)


def send_candidate_email(result: Dict[str, Any]) -> bool:
    """
    Send candidate email with PDF.
    Supports comma-separated candidate emails.
    """
    candidate_env = _safe_str(result.get("email")).strip()
    if not candidate_env:
        print("[email_server] Candidate email missing; skipping candidate email.")
        return False

    candidate_list = [addr.strip() for addr in candidate_env.split(",") if addr.strip()]

    subject = _compose_subject_candidate(result)
    text = _compose_body_candidate_text(result)
    html = _compose_body_candidate_html(result)

    pdf_bytes = _generate_pdf_bytes(result)
    username = _safe_str(result.get("username"), "candidate")
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_filename = f"EMIS_Result_{username}_{ts}.pdf"

    all_ok = True
    for to_email in candidate_list:
      msg = _build_base_message(to_email, subject, text, html)
      msg.add_attachment(
          pdf_bytes,
          maintype="application",
          subtype="pdf",
          filename=pdf_filename
      )
      print(f"[email_server] Sending candidate result to {to_email}")
      if not _smtp_send(msg):
          all_ok = False

    return all_ok


def send_result_emails(result: Dict[str, Any]) -> Dict[str, bool]:
    """
    Convenience wrapper to send both admin and candidate emails.
    """
    result = {**result, "pass_fail": _compute_pass_fail(result)}
    admin_ok = send_admin_email(result)
    candidate_ok = send_candidate_email(result)
    return {"admin": admin_ok, "candidate": candidate_ok}


# --------------------------------------------------
# Public senders: EDA
# --------------------------------------------------
def send_eda_email(result: Dict[str, Any]) -> bool:
    """
    Send a single candidate result summary to EDA.
    Uses NOTIFY_EMAIL from .env by default.
    """
    result = {**result, "pass_fail": _compute_pass_fail(result)}

    eda_to = os.getenv("NOTIFY_EMAIL", "adetomi.epitomeschools@gmail.com").strip()
    if not eda_to:
        print("[email_server] EDA email missing; skipping EDA send.")
        return False

    subject = _compose_subject_eda(result)
    text = _compose_body_eda_text(result)
    html = _compose_body_eda_html(result)

    msg = _build_base_message(eda_to, subject, text, html)

    pdf_bytes = _generate_pdf_bytes(result)
    username = _safe_str(result.get("username"), "candidate")
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_filename = f"EMIS_EDA_Result_{username}_{ts}.pdf"

    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=pdf_filename
    )

    return _smtp_send(msg)


def send_eda_emails(results: list[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Send multiple selected results to EDA one by one.
    Returns summary status.
    """
    sent = 0
    failed = 0

    for result in results:
        try:
            if send_eda_email(result):
                sent += 1
            else:
                failed += 1
        except Exception as e:
            print(f"[email_server] ❌ send_eda_emails item failed: {e}")
            failed += 1

    return {
        "success": failed == 0 and sent > 0,
        "sent": sent,
        "failed": failed
    }


# --------------------------------------------------
# Optional debug helper
# --------------------------------------------------
def send_test_email() -> bool:
    """
    Optional test helper for /debug/email_test in app.py
    Sends a simple test mail to NOTIFY_EMAIL.
    """
    to_email = os.getenv("NOTIFY_EMAIL", "adetomi.epitomeschools@gmail.com").strip()
    if not to_email:
        print("[email_server] NOTIFY_EMAIL missing; cannot send test email.")
        return False

    subject = "[EMIS] Test Email"
    text = "This is a test email from EMIS Exam Portal."
    html = """
    <div style="font-family:Arial,sans-serif;">
      <h3>EMIS Test Email</h3>
      <p>This is a test email from EMIS Exam Portal.</p>
    </div>
    """.strip()

    msg = _build_base_message(to_email, subject, text, html)
    return _smtp_send(msg)