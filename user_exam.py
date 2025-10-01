# user_exam.py
import sqlite3
from pathlib import Path
from datetime import datetime
import csv

DB_PATH = Path("database.db")
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)


# ==========================
#   INIT
# ==========================
def init_db():
    """Ensure exam_results table exists (without wiping existing data)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS exam_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            fullname TEXT NOT NULL,
            email TEXT,
            subject TEXT NOT NULL,
            score INTEGER NOT NULL,
            correct INTEGER,
            total INTEGER,
            answered INTEGER,
            time_taken INTEGER,
            submitted_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


# ==========================
#   SAVE RESULT
# ==========================
def save_exam_result(username, fullname, email, subject,
                     score, correct, total, answered,
                     time_taken, submitted_at=None):
    """Save candidate exam results into DB and CSV log."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if not submitted_at:
        submitted_at = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO exam_results (
            username, fullname, email, subject,
            score, correct, total, answered,
            time_taken, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        username, fullname, email, subject,
        score, correct, total, answered,
        time_taken, submitted_at
    ))
    conn.commit()
    conn.close()

    # Save to CSV for redundancy/logging
    save_exam_to_csv(username, fullname, email, subject,
                     score, correct, total, answered,
                     time_taken, submitted_at)

    return True


def save_exam_to_csv(username, fullname, email, subject,
                     score, correct, total, answered,
                     time_taken, submitted_at):
    """Append exam results to CSV log file."""
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = LOGS_DIR / f"exam_results_{today}.csv"

    new_file = not log_file.exists()
    with open(log_file, "a", newline="") as csvfile:
        fieldnames = [
            "username", "fullname", "email", "subject",
            "score", "correct", "total", "answered",
            "time_taken", "submitted_at"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if new_file:
            writer.writeheader()
        writer.writerow({
            "username": username,
            "fullname": fullname,
            "email": email,
            "subject": subject,
            "score": score,
            "correct": correct,
            "total": total,
            "answered": answered,
            "time_taken": time_taken,
            "submitted_at": submitted_at
        })


# ==========================
#   GET RESULTS
# ==========================
def get_exam_results(limit=100):
    """Fetch latest exam results for admin dashboard."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT username, fullname, email, subject,
               score, correct, total, answered,
               time_taken, submitted_at
        FROM exam_results
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "username": r[0],
            "fullname": r[1],
            "email": r[2],
            "subject": r[3],
            "score": r[4],
            "correct": r[5],
            "total": r[6],
            "answered": r[7],
            "time_taken": r[8],
            "submitted_at": r[9],
        }
        for r in rows
    ]
