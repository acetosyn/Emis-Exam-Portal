from email_server import send_admin_email

dummy_result = {
    "username": "testuser",
    "fullname": "Test User",
    "subject": "Biology",
    "correct": 30,
    "total": 40,
    "score": 75,
    "time_taken": 600,
    "submitted_at": "2025-10-05T12:00:00"
}

print("Sending admin test email...")
ok = send_admin_email(dummy_result)
print("Admin email send result:", ok)
