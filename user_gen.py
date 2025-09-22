# user_gen.py
import random
import string
import sqlite3
from pathlib import Path

DB_PATH = Path("database.db")

def init_db():
    """Create users table if not exists"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def generate_username(next_id: int) -> str:
    """Format candidate username with two digits"""
    return f"candidate{next_id:02d}"

def generate_password() -> str:
    """Random 3 letters + 2 digits password"""
    letters = ''.join(random.choices(string.ascii_lowercase, k=3))
    digits = ''.join(random.choices(string.digits, k=2))
    return letters + digits

def generate_credentials(count=1):
    """Generate and save new candidate credentials"""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    credentials = []
    for _ in range(count):
        # Next ID based on row count
        cursor.execute("SELECT COUNT(*) FROM candidates")
        total = cursor.fetchone()[0]
        username = generate_username(total + 1)
        password = generate_password()

        # Insert into DB
        cursor.execute(
            "INSERT INTO candidates (username, password) VALUES (?, ?)",
            (username, password)
        )
        conn.commit()
        credentials.append({"username": username, "password": password})
    
    conn.close()
    return credentials

def get_credentials():
    """Fetch all generated credentials"""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT username, password FROM candidates")
    creds = cursor.fetchall()
    conn.close()
    return [{"username": u, "password": p} for u, p in creds]

def validate_credentials(username, password):
    """Check if given credentials exist"""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM candidates WHERE username=? AND password=?",
        (username, password)
    )
    row = cursor.fetchone()
    conn.close()
    return row is not None
