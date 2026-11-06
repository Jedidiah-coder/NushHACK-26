import json
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from flask import (
    Flask,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from postgrest.exceptions import APIError
from supabase import AuthError, ClientOptions, create_client

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DATA_FILE = BASE_DIR / "data.json"
SUPABASE_TABLE = "records"
SUPABASE_ERRORS = (httpx.HTTPError, APIError)
AUTH_ERRORS = (httpx.HTTPError, AuthError)
PUBLIC_ENDPOINTS = {"login", "register", "static"}
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 72
SERVICE_UNAVAILABLE = "Can't reach the account service. Check your connection and try again."

SECRET_KEY = os.getenv("FLASK_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "Add FLASK_SECRET_KEY to NUSHack/.env. Generate a value with: "
        'python -c "import secrets; print(secrets.token_hex(32))"'
    )

app = Flask(
    __name__,
    template_folder="template",
    static_folder="Static",
    static_url_path="/static",
)
app.config.update(
    SECRET_KEY=SECRET_KEY,
    SESSION_COOKIE_SAMESITE="Lax",
    # Set SESSION_COOKIE_SECURE=1 when hosting over HTTPS.
    SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE") == "1",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = (
    create_client(
        SUPABASE_URL,
        SUPABASE_KEY,
        # Fail fast when offline, because records wait safely in data.json.
        options=ClientOptions(postgrest_client_timeout=5, postgrest_client_retry=False),
    )
    if SUPABASE_URL and SUPABASE_KEY
    else None
)

# Flask handles requests on several threads, so JSON file access takes turns.
data_lock = threading.Lock()


def load_records():
    if not DATA_FILE.exists():
        return []
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def save_records(records):
    # Write to a temporary file first so a crash can't leave data.json half-written.
    temp_file = DATA_FILE.with_suffix(".tmp")
    temp_file.write_text(json.dumps(records, indent=2), encoding="utf-8")
    os.replace(temp_file, DATA_FILE)


def is_online():
    if supabase is None:
        return False
    try:
        supabase.table(SUPABASE_TABLE).select("id").limit(1).execute()
        return True
    except SUPABASE_ERRORS as error:
        app.logger.warning("Supabase is unavailable: %s", error)
        return False


def sync_pending_records():
    """Upload unsynced JSON records to Supabase. Returns True if none remain."""
    if supabase is None:
        return False

    with data_lock:
        pending = [record for record in load_records() if not record["synced"]]
    if not pending:
        return True

    rows = [
        {key: record[key] for key in ("id", "data", "created_at")}
        for record in pending
    ]
    try:
        supabase.table(SUPABASE_TABLE).upsert(rows).execute()
    except SUPABASE_ERRORS as error:
        app.logger.warning("Sync failed, records stay in data.json: %s", error)
        return False

    uploaded_ids = {record["id"] for record in pending}
    with data_lock:
        records = load_records()
        for record in records:
            if record["id"] in uploaded_ids:
                record["synced"] = True
        save_records(records)
    return True


def pull_remote_records():
    """Copy recent records made on other devices from Supabase into data.json."""
    if supabase is None:
        return
    try:
        rows = (
            supabase.table(SUPABASE_TABLE)
            .select("id,data,created_at")
            .order("created_at", desc=True)
            .limit(200)
            .execute()
            .data
        )
    except SUPABASE_ERRORS as error:
        app.logger.warning("Could not download records: %s", error)
        return

    with data_lock:
        records = load_records()
        known_ids = {record["id"] for record in records}
        new_records = [
            {**row, "synced": True} for row in rows if row["id"] not in known_ids
        ]
        if new_records:
            save_records(records + new_records)


class AccountError(Exception):
    """A sign-up or log-in problem, with a message that's safe to show the user."""


def create_account(name, email, password):
    if supabase is None:
        raise AccountError(SERVICE_UNAVAILABLE)
    try:
        return supabase.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"name": name},
            }
        ).user
    except AUTH_ERRORS as error:
        code = getattr(error, "code", None)
        app.logger.warning("Sign-up failed: %s %s", type(error).__name__, code)
        if code in ("email_exists", "user_already_exists"):
            raise AccountError("An account with this email already exists.") from error
        if code == "weak_password":
            raise AccountError("Please choose a stronger password.") from error
        if code in ("email_address_invalid", "validation_failed"):
            raise AccountError("Enter a valid email address.") from error
        raise AccountError(SERVICE_UNAVAILABLE) from error


def verify_login(email, password):
    if supabase is None:
        raise AccountError(SERVICE_UNAVAILABLE)
    # Signing in changes a client's credentials, so this must not use the shared client.
    client = create_client(
        SUPABASE_URL,
        SUPABASE_KEY,
        options=ClientOptions(auto_refresh_token=False, persist_session=False),
    )
    try:
        return client.auth.sign_in_with_password(
            {"email": email, "password": password}
        ).user
    except AUTH_ERRORS as error:
        code = getattr(error, "code", None)
        app.logger.warning("Log-in failed: %s %s", type(error).__name__, code)
        if code == "invalid_credentials":
            raise AccountError("Incorrect email or password.") from error
        raise AccountError(SERVICE_UNAVAILABLE) from error


def start_session(user):
    metadata = user.user_metadata or {}
    session.clear()
    session.permanent = True
    session["user"] = {
        "id": user.id,
        "name": metadata.get("name") or user.email,
        "email": user.email,
    }


def find_signup_problem(name, email, password):
    if not name or len(name) > 100:
        return "Enter your name (up to 100 characters)."
    if "@" not in email or len(email) > 254:
        return "Enter a valid email address."
    if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
        return (
            f"Password must be {MIN_PASSWORD_LENGTH} to "
            f"{MAX_PASSWORD_LENGTH} characters long."
        )
    return None


@app.before_request
def require_login():
    if request.endpoint in PUBLIC_ENDPOINTS or "user" in session:
        return None
    if request.path.startswith("/api/"):
        return jsonify(error="Log in first."), 401
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if "user" in session:
        return redirect(url_for("index"))

    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    error = None
    if request.method == "POST":
        password = request.form.get("password", "")
        try:
            error = find_signup_problem(name, email, password)
            if not error:
                start_session(create_account(name, email, password))
                return redirect(url_for("index"))
        except AccountError as account_error:
            error = str(account_error)

    status = 400 if error else 200
    return render_template("auth.html", mode="register", name=name, email=email, error=error), status


@app.route("/login", methods=["GET", "POST"])
def login():
    if "user" in session:
        return redirect(url_for("index"))

    email = request.form.get("email", "").strip().lower()
    error = None
    if request.method == "POST":
        try:
            start_session(verify_login(email, request.form.get("password", "")))
            return redirect(url_for("index"))
        except AccountError as account_error:
            error = str(account_error)

    status = 400 if error else 200
    return render_template("auth.html", mode="login", email=email, error=error), status


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
def index():
    response = make_response(render_template("index.html", user=session["user"]))
    # Stops the Back button showing this page on a shared device after logging out.
    response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/api/status")
def status():
    with data_lock:
        pending = sum(not record["synced"] for record in load_records())
    return jsonify(online=is_online(), pending=pending)


@app.route("/api/records")
def get_records():
    pull_remote_records()
    with data_lock:
        return jsonify(load_records())


@app.route("/api/records", methods=["POST"])
def create_record():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return jsonify(error="Send a non-empty JSON object."), 400

    user = session["user"]
    record = {
        "id": str(uuid.uuid4()),
        # The sender comes from the session, so a request can't pretend to be someone else.
        "data": {**data, "sender_id": user["id"], "sender_name": user["name"]},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "synced": False,
    }
    # Save locally first, so the record is safe even if the upload fails.
    with data_lock:
        records = load_records()
        records.append(record)
        save_records(records)

    sync_pending_records()

    with data_lock:
        saved = next(r for r in load_records() if r["id"] == record["id"])
    return jsonify(saved), 201


@app.route("/api/sync", methods=["POST"])
def sync():
    synced = sync_pending_records()
    with data_lock:
        pending = sum(not record["synced"] for record in load_records())
    return jsonify(synced=synced, pending=pending)


if __name__ == "__main__":
    # Debug mode can expose secrets, so it's off unless FLASK_DEBUG=1 is set locally.
    app.run(port=8050)
