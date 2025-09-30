from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory, Response
from dotenv import load_dotenv
import os
import user_credentials  # our credential generator / DB handler
import engine  # new import for document handling
import mimetypes

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
        username = request.form.get('username')
        password = request.form.get('password')

        # Validate against generated user accounts
        if user_credentials.validate_credentials(username, password):
            session['user_type'] = 'user'
            session['username'] = username
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
@app.route('/logout')
def logout():
    session.clear()
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




# ... existing imports

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


if __name__ == '__main__':
    # Initialize DB on startup
    user_credentials.init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
