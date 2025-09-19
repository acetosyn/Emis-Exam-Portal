from flask import Flask, render_template, request, redirect, url_for, session
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == 'admin' and password == 'admin123':
            session['user_type'] = 'admin'
            session['username'] = username
            return redirect(url_for('admin'))
        elif username and password:  # Student login
            session['user_type'] = 'student'
            session['username'] = username
            return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user_type' not in session or session['user_type'] != 'student':
        return redirect(url_for('login'))
    return render_template('dashboard.html')

@app.route('/admin')
def admin():
    if 'user_type' not in session or session['user_type'] != 'admin':
        return redirect(url_for('login'))
    return render_template('admin.html')

@app.route('/exam')
def exam():
    if 'user_type' not in session or session['user_type'] != 'student':
        return redirect(url_for('login'))
    return render_template('exam.html')

@app.route('/result')
def result():
    if 'user_type' not in session:
        return redirect(url_for('login'))
    return render_template('result.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
