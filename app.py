from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory, Response
from dotenv import load_dotenv
import os
import user_credentials  # credential generator / DB handler
import engine            # file upload handler
import mimetypes
import user_exam   # new module for exam results
import email_server 
from datetime import datetime
from threading import Thread
# Load environment variables
from pathlib import Path
import csv
import tts_service


# Define logs directory
BASE_DIR = Path(__file__).resolve().parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)  # create folder if missing

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "fallback_secret_key")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")



def _send_emails_async(result_payload: dict):
    """Fire-and-forget email sending so the HTTP response is snappy."""
    try:
        status = email_server.send_result_emails(result_payload)
        app.logger.info(f"[email] send_result_emails -> {status}")
    except Exception as e:
        app.logger.exception(f"[email] send_result_emails failed: {e}")




def _safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def _build_exam_instruction_text():
    """
    Canonical instruction text for exam modal narration.
    Keep this aligned with exam.html instruction modal.
    """
    subject = (session.get("subject") or "your selected subject").strip()

    lines = [
        "This exam contains 40 multiple-choice questions.",
        "Opening a new browser tab or leaving this page will result in disqualification.",
        "You can only answer a question once. Check carefully before answering.",
        "Each question has options A to D. Select the most appropriate answer.",
        "You have 60 minutes to complete all questions.",
        "Navigate using Previous and Next buttons or the question grid.",
        "You may flag questions to review them before submission.",
        "Once started, you must finish in one sitting.",
        "After completing all questions, ensure you submit your exam."
    ]

    intro = (
        f"Assalamu alaikum. Welcome to the EMIS examination portal. "
        f"You are about to begin your {subject} examination. "
        f"Please listen carefully to these instructions before you start. "
    )

    body = " ".join(lines)

    closing = (
        "Take your time, stay calm, and answer carefully. "
        "When you are fully ready, click Start Exam to begin. "
        "We wish you success."
    )

    return tts_service.sanitize_tts_text(f"{intro} {body} {closing}")


def _build_result_summary_text(latest_result: dict | None):
    """
    Build a spoken result summary for the candidate result page.
    """
    latest_result = latest_result or {}

    full_name = session.get("full_name") or latest_result.get("fullname") or "candidate"
    subject = latest_result.get("subject") or session.get("subject") or "your subject"
    score = latest_result.get("score")
    correct = latest_result.get("correct")
    total = latest_result.get("total")
    status = latest_result.get("status") or "completed"

    parts = [
        "Assalamu alaikum.",
        f"Hello {tts_service.sanitize_tts_text(full_name)}.",
        "Your exam result is now available.",
        f"Subject: {tts_service.sanitize_tts_text(str(subject))}.",
    ]

    if score is not None:
        parts.append(f"Your score is {score} percent.")

    if correct is not None and total is not None:
        parts.append(f"You answered {correct} questions correctly out of {total}.")

    parts.append(f"Your exam status is {tts_service.sanitize_tts_text(str(status))}.")
    parts.append("Thank you for taking the examination.")

    return tts_service.sanitize_tts_text(" ".join(parts))


@app.route('/')
def home():
    """Landing page redirects to admin login by default."""
    return redirect(url_for('admin_login'))


# -------------------- ADMIN LOGIN --------------------
@app.route('/admin_login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session.clear()
            session['user_type'] = 'admin'
            session['username'] = username
            return redirect(url_for('admin_dashboard'))
        else:
            return render_template('admin_login.html', error="Invalid credentials")

    return render_template('admin_login.html')


# -------------------- USER LOGIN --------------------
@app.route('/user_login', methods=['GET', 'POST'])
def user_login():
    # Admin opens this page for candidates (public page)
    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip()
        gender = request.form.get('gender', '').strip()
        subject = request.form.get('subject', '').strip()   # <-- NEW
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        # Validate against generated + issued accounts
        if user_credentials.validate_credentials(username, password):
            session.clear()
            session['user_type'] = 'user'
            session['username'] = username
            session['full_name'] = full_name
            session['email'] = email
            session['gender'] = gender
            session['subject'] = subject                   # <-- NEW
            session['exam_started'] = False
            session['exam_submitted'] = False
            return redirect(url_for('user_portal'))

        return render_template('user_login.html', error="Invalid login details")

    return render_template('user_login.html')


# -------------------- ADMIN DASHBOARD --------------------
@app.route('/admin')
def admin_dashboard():
    if session.get('user_type') != 'admin':
        return redirect(url_for('admin_login'))
    return render_template('admin.html')


@app.route('/dashboard')
def dashboard():
    if session.get('user_type') != 'user':
        return redirect(url_for('user_login'))

    return render_template('dashboard.html')


# -------------------- USER PORTAL (Dashboard-first) --------------------
@app.route('/user_portal')
def user_portal():
    if session.get('user_type') != 'user':
        return redirect(url_for('user_login'))

    return render_template(
        'user_portal.html',
        full_name=session.get('full_name'),
        username=session.get('username'),
        email=session.get('email'),
        gender=session.get('gender'),
        subject=session.get('subject'),        # <-- NEW
        exam_started=session.get('exam_started', False),
        exam_submitted=session.get('exam_submitted', False)
    )


# -------------------- START EXAM (sets flag, then go to /exam) --------------------
@app.route('/start_exam', methods=['POST'])
def start_exam():
    if session.get('user_type') != 'user':
        return redirect(url_for('user_login'))

    # Gate: only allow if not already submitted
    if session.get('exam_submitted'):
        return redirect(url_for('result'))

    session['exam_started'] = True
    return redirect(url_for('exam'))


# -------------------- EXAM PAGE --------------------
@app.route('/exam')
def exam():
    if session.get('user_type') != 'user':
        return redirect(url_for('user_login'))

    # Always render exam.html
    return render_template(
        'exam.html',
        full_name=session.get('full_name'),
        username=session.get('username'),
        subject=session.get('subject'),   # ✅ inject subject here
        exam_started=session.get('exam_started', False)
    )


# -------------------- SUBMIT / END EXAM --------------------
@app.route('/submit_exam', methods=['POST'])
def submit_exam():
    if session.get('user_type') != 'user':
        return redirect(url_for('user_login'))

    # Mark submitted, clear started flag
    session['exam_submitted'] = True
    session['exam_started'] = False
    return redirect(url_for('result'))







# -------------------- API: TTS (Generic) --------------------
@app.route("/api/tts", methods=["POST"])
def api_tts():
    """
    Generic ElevenLabs TTS endpoint.
    Frontend sends text.
    If ElevenLabs works -> returns audio/mpeg
    If ElevenLabs fails -> returns JSON with fallback=True
    """
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({
            "success": False,
            "fallback": True,
            "error": "No text supplied"
        }), 400

    ok, audio_bytes, meta = tts_service.generate_tts_audio(text)

    if ok:
        return Response(audio_bytes, mimetype="audio/mpeg")

    app.logger.warning(f"[tts] generic failed: {meta}")
    return jsonify({
        "success": False,
        "fallback": True,
        "provider": "elevenlabs",
        "error": meta.get("error", "TTS failed")
    }), 503


# -------------------- API: TTS Exam Instructions --------------------
@app.route("/api/tts/instructions", methods=["GET"])
def api_tts_instructions():
    """
    Returns spoken audio for the exam instructions modal.
    Candidate only.
    """
    if session.get("user_type") != "user":
        return jsonify({
            "success": False,
            "fallback": True,
            "error": "Unauthorized"
        }), 403

    text = _build_exam_instruction_text()
    ok, audio_bytes, meta = tts_service.generate_tts_audio(text)

    if ok:
        return Response(audio_bytes, mimetype="audio/mpeg")

    app.logger.warning(f"[tts] instructions failed: {meta}")
    return jsonify({
        "success": False,
        "fallback": True,
        "provider": "elevenlabs",
        "error": meta.get("error", "Instruction TTS failed"),
        "text": text
    }), 503


# -------------------- API: TTS Result Summary --------------------
@app.route("/api/tts/result-summary", methods=["GET"])
def api_tts_result_summary():
    """
    Returns spoken audio for the candidate's latest result page summary.
    Candidate only.
    """
    if session.get("user_type") != "user":
        return jsonify({
            "success": False,
            "fallback": True,
            "error": "Unauthorized"
        }), 403

    username = session.get("username")
    latest = user_exam.get_user_latest_result(username)
    text = _build_result_summary_text(latest)

    ok, audio_bytes, meta = tts_service.generate_tts_audio(text)

    if ok:
        return Response(audio_bytes, mimetype="audio/mpeg")

    app.logger.warning(f"[tts] result summary failed: {meta}")
    return jsonify({
        "success": False,
        "fallback": True,
        "provider": "elevenlabs",
        "error": meta.get("error", "Result summary TTS failed"),
        "text": text
    }), 503


# -------------------- RESULT PAGE --------------------
@app.route('/result')
def result():
    if session.get('user_type') != 'user':
        return redirect(url_for('user_login'))

    username = session.get('username')
    latest = user_exam.get_user_latest_result(username)

    return render_template(
        'result.html',
        full_name=session.get('full_name'),
        username=username,
        result=latest or {}
    )

# -------------------- API: Generate Credentials --------------------
@app.route('/generate_credentials', methods=['POST'])
def generate_credentials_route():
    if session.get('user_type') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    count = int(request.form.get("count", 1))
    prefix = request.form.get("prefix", "candidate")
    pwd_length = int(request.form.get("pwd_length", 8))
    result = user_credentials.generate_credentials(count, prefix, pwd_length)
    return jsonify(result)


# -------------------- API: List Credentials --------------------
@app.route('/list_credentials')
def list_credentials():
    if session.get('user_type') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify(user_credentials.get_credentials())


# -------------------- API: Mark Issued --------------------
@app.route('/mark_issued', methods=['POST'])
def mark_issued():
    if session.get('user_type') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    usernames = request.json.get("usernames", [])
    ok = user_credentials.mark_issued(usernames)
    return jsonify({"success": ok})


# -------------------- LOGOUT --------------------
# -------------------- LOGOUT --------------------
@app.route('/logout')
def logout():
    # capture user type before clearing the session
    user_type = session.get('user_type')
    session.clear()

    # send candidates back to candidate login; admins to admin login
    if user_type == 'user':
        return redirect(url_for('user_login'))
    return redirect(url_for('admin_login'))



# -------------------- API: Document Upload --------------------
@app.route('/upload_document', methods=['POST'])
def upload_document():
    if session.get('user_type') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    result = engine.save_uploaded_file(file)
    if result["success"]:
        return jsonify({
            "message": "File uploaded successfully",
            "filename": result["filename"],
            "path": result["path"]
        })
    else:
        return jsonify({"error": result["error"]}), 400


# -------------------- API: List/Search Documents --------------------
@app.route('/documents')
def list_documents_route():
    if session.get('user_type') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    q = request.args.get("q", "", type=str)
    docs = engine.list_documents(q)
    # attach URLs for frontend
    for d in docs:
        d["url"] = url_for('serve_upload', filename=d["name"])
    return jsonify({"documents": docs})


# -------------------- Serve uploaded files inline --------------------
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    if session.get('user_type') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    
    file_path = os.path.join(engine.UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    # guess mime type (important for inline preview)
    mime, _ = mimetypes.guess_type(file_path)
    mime = mime or "application/octet-stream"

    # force Content-Disposition:inline so browser tries preview, not download
    resp = send_from_directory(engine.UPLOAD_FOLDER, filename, as_attachment=False, mimetype=mime)
    resp.headers["Content-Disposition"] = f'inline; filename="{filename}"'
    return resp



# -------------------- API: Exam Submission (Realtime) --------------------
# -------------------- API: Exam Submission (Realtime) --------------------
@app.route('/api/exam/submit', methods=['POST'])
def api_exam_submit():
    if session.get('user_type') != 'user':
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json or {}
    username = session.get("username")
    fullname = session.get("full_name")
    subject  = session.get("subject")
    email    = session.get("email")

    # Extract score data from JS payload
    score        = data.get("score", 0)          # percentage
    correct      = data.get("correct", 0)
    total        = data.get("total", 0)
    answered     = data.get("answered", 0)
    time_taken   = data.get("timeTaken", 0)
    submitted_at = data.get("submittedAt") or datetime.utcnow().isoformat()
    status       = data.get("status", "completed")  # completed | timeout | disqualified, etc.

    # Save result into DB with status
    user_exam.save_exam_result(
        username=username,
        fullname=fullname,
        email=email,
        subject=subject,
        score=score,
        correct=correct,
        total=total,
        answered=answered,
        time_taken=time_taken,
        submitted_at=submitted_at,
        status=status
    )

    # Prepare payload for email_server
    result_payload = {
        "username": username,
        "fullname": fullname,
        "email": email,            # candidate email (may be blank)
        "subject": subject,
        "score": score,            # percent
        "correct": correct,
        "total": total,
        "answered": answered,
        "time_taken": time_taken,
        "submitted_at": submitted_at,
        "status": status
    }

    # Send emails in the background (admin + candidate)
    Thread(target=_send_emails_async, args=(result_payload,), daemon=True).start()

    # Mark session flags
    session['exam_submitted'] = True
    session['exam_started'] = False

    return jsonify({"success": True, "message": f"Exam result recorded ({status})"})



# ============================================================
# ✅ Unified Results & Credentials APIs (Dynamic + Delete + Filters)
# ============================================================


# -------------------- API: Get All Exam Results (for Admin Dashboard) --------------------
@app.route("/api/exam/results")
def api_exam_results():
    """Return exam results from DB with optional subject/date filters."""
    if session.get("user_type") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    subject = (request.args.get("subject") or "").strip()
    from_date = (request.args.get("from") or "").strip()
    to_date = (request.args.get("to") or "").strip()

    def parse_date(value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", ""))
        except Exception:
            return None

    try:
        results = user_exam.get_exam_results() or []

        # Subject filter
        if subject and subject.lower() != "all":
            results = [
                r for r in results
                if (r.get("subject") or "").strip().lower() == subject.lower()
            ]

        # Date filters
        if from_date:
            from_dt = parse_date(from_date)
            if from_dt:
                results = [
                    r for r in results
                    if parse_date(r.get("submitted_at")) and parse_date(r.get("submitted_at")) >= from_dt
                ]

        if to_date:
            to_dt = parse_date(to_date)
            if to_dt:
                results = [
                    r for r in results
                    if parse_date(r.get("submitted_at")) and parse_date(r.get("submitted_at")) <= to_dt
                ]

        # Latest first
        results.sort(
            key=lambda r: str(r.get("submitted_at", "")),
            reverse=True
        )

        return jsonify({
            "success": True,
            "results": results,
            "count": len(results)
        })

    except Exception as e:
        app.logger.exception(f"/api/exam/results failed: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch exam results",
            "results": [],
            "count": 0
        }), 500


# -------------------- DELETE SINGLE RESULT --------------------
# -------------------- DELETE SINGLE RESULT --------------------
@app.route("/delete_result", methods=["POST"])
def delete_result():
    """Delete one specific result permanently using a composite identity."""
    if session.get("user_type") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    subject = (data.get("subject") or "").strip()
    submitted_at = (data.get("submitted_at") or "").strip()
    email = (data.get("email") or "").strip()

    if not username:
        return jsonify({"success": False, "message": "Username required"}), 400

    try:
        deleted = user_exam.delete_result(
            username=username,
            subject=subject,
            submitted_at=submitted_at,
            email=email
        )

        if deleted:
            app.logger.info(
                f"Deleted result -> username={username}, subject={subject}, submitted_at={submitted_at}, email={email}"
            )
            return jsonify({
                "success": True,
                "message": f"Result for {username} deleted successfully"
            })

        return jsonify({
            "success": False,
            "message": "Result not found"
        }), 404

    except Exception as e:
        app.logger.exception(f"Delete result error: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500



# -------------------- DELETE MULTIPLE RESULTS --------------------
@app.route("/delete_results_bulk", methods=["POST"])
def delete_results_bulk():
    """Delete multiple selected results permanently."""
    if session.get("user_type") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    results = data.get("results", [])

    if not isinstance(results, list) or not results:
        return jsonify({
            "success": False,
            "message": "No results provided"
        }), 400

    deleted_count = 0

    try:
        for row in results:
            ok = user_exam.delete_result(
                username=(row.get("username") or "").strip(),
                subject=(row.get("subject") or "").strip(),
                submitted_at=(row.get("submitted_at") or "").strip(),
                email=(row.get("email") or "").strip()
            )
            if ok:
                deleted_count += 1

        return jsonify({
            "success": True,
            "deleted": deleted_count,
            "requested": len(results),
            "message": f"{deleted_count} result(s) deleted successfully"
        })

    except Exception as e:
        app.logger.exception(f"Bulk delete results error: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# -------------------- CLEAR RESULTS (ALL / SUBJECT / DATE RANGE) --------------------
@app.route("/clear_results", methods=["POST"])
def clear_results():
    """Delete all results or filter by subject/date."""
    if session.get("user_type") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json or {}
    subject = data.get("subject")
    from_date = data.get("from")
    to_date = data.get("to")

    try:
        count = user_exam.clear_results(subject=subject, from_date=from_date, to_date=to_date)
        return jsonify({"success": True, "deleted": count})
    except Exception as e:
        print(f"⚠️ Clear results error: {e}")
        return jsonify({"success": False, "message": str(e)})

# -------------------- VIEW RESULTS (Dynamic DB First, CSV Fallback) --------------------
@app.route("/view_results")
def view_results():
    """Load live results from DB first, then fall back to CSV logs if DB is empty."""
    if session.get("user_type") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    results = []

    # 1. Try database first
    try:
        results = user_exam.get_exam_results() or []
    except Exception as e:
        app.logger.warning(f"DB fetch failed in /view_results: {e}")

    # 2. Fallback to CSV logs if DB returned nothing
    if not results:
        files = sorted(LOGS_DIR.glob("exam_results_*.csv"), reverse=True)

        for file in files:
            try:
                with open(file, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        cleaned = {str(k).strip(): (v or "").strip() for k, v in row.items()}
                        results.append(cleaned)
            except Exception as e:
                app.logger.warning(f"Error reading {file.name}: {e}")

    # 3. Sort latest first
    results.sort(key=lambda r: str(r.get("submitted_at", "")), reverse=True)

    return jsonify({"results": results})



# -------------------- API: Send Selected Results to EDA --------------------
@app.route("/api/results/send-to-eda", methods=["POST"])
def send_results_to_eda():
    if session.get("user_type") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    results = data.get("results", [])

    if not isinstance(results, list) or not results:
        return jsonify({"success": False, "error": "No results provided"}), 400

    try:
        status = email_server.send_eda_emails(results)

        sent = int(status.get("sent", 0))
        failed = int(status.get("failed", 0))

        return jsonify({
            "success": sent > 0 and failed == 0,
            "message": f"{sent} result(s) sent to EDA successfully" if sent else "No results were sent",
            "sent": sent,
            "failed": failed
        })
    except Exception as e:
        app.logger.exception(f"[EDA] send_results_to_eda failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------- DEBUG: EMAIL TEST --------------------
@app.route("/debug/email_test")
def debug_email_test():
    """
    Optional debug route.
    Only keep this if send_test_email exists in email_server.py.
    """
    if session.get("user_type") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    from email_server import send_test_email
    ok = send_test_email()
    return jsonify({"sent": ok})


# -------------------- VIEW CREDENTIALS --------------------
@app.route("/view_credentials")
def view_credentials():
    """Load latest credentials_YYYY-MM-DD.csv from logs folder safely."""
    if session.get("user_type") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    files = sorted(LOGS_DIR.glob("credentials_*.csv"), reverse=True)
    if not files:
        return jsonify({"credentials": []})

    latest = files[0]
    creds = []

    try:
        with open(latest, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                creds.append({
                    "username": row.get("username", "").strip(),
                    "password": row.get("password", "").strip()
                })
    except Exception as e:
        app.logger.warning(f"Error reading credentials file {latest.name}: {e}")

    return jsonify({"credentials": creds})


if __name__ == '__main__':
    user_credentials.init_db()
    user_exam.init_db()   # ensure exam_results table exists
    app.run(host='0.0.0.0', port=5000, debug=True)



