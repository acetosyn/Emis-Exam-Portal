from flask import Flask, render_template, request, redirect, url_for, session
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "fallback_secret_key")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

@app.route('/')
def home():
    # First landing page → admin login
    return redirect(url_for('admin_login'))

# -------------------- ADMIN LOGIN --------------------
@app.route('/admin_login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['user_type'] = 'admin'
            session['username'] = username
            return redirect(url_for('admin_dashboard'))
        else:
            return render_template('admin_login.html', error="Invalid credentials")

    return render_template('admin_login.html')

# -------------------- USER LOGIN --------------------
@app.route('/user_login', methods=['GET', 'POST'])
def user_login():
    if request.method == 'POST':
        full_name = request.form.get('full_name')
        gender = request.form.get('gender')
        username = request.form.get('username')
        password = request.form.get('password')

        # In real deployment: validate against generated user accounts
        if username and password:
            session['user_type'] = 'user'
            session['username'] = username
            session['full_name'] = full_name
            session['gender'] = gender
            return redirect(url_for('user_dashboard'))

        return render_template('user_login.html', error="Invalid login details")

    return render_template('user_login.html')

# -------------------- ADMIN DASHBOARD --------------------
@app.route('/admin')
def admin_dashboard():
    if session.get('user_type') != 'admin':
        return redirect(url_for('admin_login'))
    return render_template('admin.html')

# -------------------- USER DASHBOARD --------------------
@app.route('/user')
def user_dashboard():
    if session.get('user_type') != 'user':
        return redirect(url_for('user_login'))
    return render_template('user.html')

# -------------------- EXAM PAGE --------------------
@app.route('/exam')
def exam():
    if session.get('user_type') != 'user':
        return redirect(url_for('user_login'))
    return render_template('exam.html')

# -------------------- RESULT PAGE --------------------
@app.route('/result')
def result():
    if 'user_type' not in session:
        return redirect(url_for('user_login'))
    return render_template('result.html')

# -------------------- LOGOUT --------------------
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('admin_login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
