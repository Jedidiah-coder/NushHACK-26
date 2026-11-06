import json
import os
import re
import threading
import uuid
from collections import Counter
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
MAX_MESSAGE_LENGTH = 500
MAX_NOTICE_LENGTH = 1000
MAX_CHECKLIST_NAME_LENGTH = 100
MAX_CHECKLIST_TASK_LENGTH = 200
MAX_CHECKLIST_TASKS = 50
MAX_PULLED_RECORDS = 1000
MAX_LISTED_USERS = 1000
SERVICE_UNAVAILABLE = "Can't reach the account service. Check your connection and try again."

SOS_PHONE_NUMBER = os.getenv("SOS_PHONE_NUMBER", "").strip()
if not re.fullmatch(r"\+?[0-9][0-9 ()-]{2,19}", SOS_PHONE_NUMBER):
    SOS_PHONE_NUMBER = ""

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


def load_store():
    if not DATA_FILE.exists():
        return {"last_logouts": {}, "users": {}, "records": []}
    stored = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    # Files from before logouts were tracked hold just a list of records.
    if isinstance(stored, list):
        return {"last_logouts": {}, "users": {}, "records": stored}
    stored.setdefault("users", {})
    return stored


def save_store(store):
    # Write to a temporary file first so a crash can't leave data.json half-written.
    temp_file = DATA_FILE.with_suffix(".tmp")
    temp_file.write_text(json.dumps(store, indent=2), encoding="utf-8")
    os.replace(temp_file, DATA_FILE)


def load_records():
    return load_store()["records"]


def save_records(records):
    store = load_store()
    store["records"] = records
    save_store(store)


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
    """Upload unsynced JSON records to Supabase. Returns True if none remain.

    New records always upload. A record may replace a row that already exists in
    Supabase only if its author's last logout happened while offline.
    """
    if supabase is None:
        return False

    with data_lock:
        store = load_store()
    pending = [record for record in store["records"] if not record["synced"]]
    if not pending:
        return True

    last_logouts = store["last_logouts"]
    overwriting, insert_only = [], []
    for record in pending:
        last_logout = last_logouts.get(record["data"].get("sender_id"), {})
        may_overwrite = last_logout.get("status") == "offline"
        (overwriting if may_overwrite else insert_only).append(
            {key: record[key] for key in ("id", "data", "created_at")}
        )

    try:
        if overwriting:
            supabase.table(SUPABASE_TABLE).upsert(overwriting).execute()
        if insert_only:
            supabase.table(SUPABASE_TABLE).upsert(
                insert_only, ignore_duplicates=True
            ).execute()
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


def pull_remote_records(user_id):
    """Copy recent records from Supabase into data.json. Supabase wins once synced.

    Other people's direct messages are left out, so they never reach this device.
    """
    if supabase is None:
        return
    try:
        rows = (
            supabase.table(SUPABASE_TABLE)
            .select("id,data,created_at")
            .or_(
                "data->>recipient_id.is.null,"
                f"data->>sender_id.eq.{user_id},"
                f"data->>recipient_id.eq.{user_id}"
            )
            .order("created_at", desc=True)
            .limit(MAX_PULLED_RECORDS)
            .execute()
            .data
        )
    except SUPABASE_ERRORS as error:
        app.logger.warning("Could not download records: %s", error)
        return

    with data_lock:
        records = load_records()
        records_by_id = {record["id"]: record for record in records}
        changed = False
        for row in rows:
            local = records_by_id.get(row["id"])
            if local is None:
                records.append({**row, "synced": True})
                changed = True
            elif local["synced"] and local["data"] != row["data"]:
                # Records still waiting to upload are left alone.
                local["data"] = row["data"]
                changed = True
        if changed:
            save_records(records)


def refresh_user_directory():
    """Return known users, updating the local copy when Supabase is reachable."""
    directory = None
    if supabase is not None:
        try:
            directory = {
                user.id: {
                    "name": (user.user_metadata or {}).get("name") or user.email,
                    "email": user.email,
                }
                for user in supabase.auth.admin.list_users(
                    page=1, per_page=MAX_LISTED_USERS
                )
            }
        except AUTH_ERRORS as error:
            app.logger.warning("Could not refresh users: %s", type(error).__name__)

    with data_lock:
        store = load_store()
        if directory is not None and directory != store["users"]:
            store["users"] = directory
            save_store(store)
        return store["users"]


def find_user(user_id):
    with data_lock:
        users = load_store()["users"]
    if user_id not in users:
        users = refresh_user_directory()
    return users.get(user_id)


def clean_text(value):
    return value.strip() if isinstance(value, str) else ""


def prepare_record(data, user):
    """Check a record from the browser. Returns (record data, error message)."""
    kind = data.get("type")
    if kind == "checklist":
        return data, None

    if kind == "checklist_template":
        name = clean_text(data.get("name"))
        if not name or len(name) > MAX_CHECKLIST_NAME_LENGTH:
            return None, f"Checklist names must be 1 to {MAX_CHECKLIST_NAME_LENGTH} characters."
        items = data.get("items")
        tasks = [clean_text(item) for item in items] if isinstance(items, list) else []
        if not 1 <= len(tasks) <= MAX_CHECKLIST_TASKS:
            return None, f"Checklists need 1 to {MAX_CHECKLIST_TASKS} tasks."
        if not all(tasks) or any(len(task) > MAX_CHECKLIST_TASK_LENGTH for task in tasks):
            return None, f"Tasks must be 1 to {MAX_CHECKLIST_TASK_LENGTH} characters."
        return {"type": "checklist_template", "name": name, "items": tasks}, None

    if kind == "sos":
        return {"type": "sos"}, None

    text = clean_text(data.get("text"))
    if kind == "notice":
        if not text or len(text) > MAX_NOTICE_LENGTH:
            return None, f"Notices must be 1 to {MAX_NOTICE_LENGTH} characters."
        return {"type": "notice", "text": text}, None

    if kind == "message":
        if not text or len(text) > MAX_MESSAGE_LENGTH:
            return None, f"Messages must be 1 to {MAX_MESSAGE_LENGTH} characters."
        recipient_id = data.get("recipient_id")
        if not isinstance(recipient_id, str) or recipient_id == user["id"]:
            return None, "Choose someone to message."
        recipient = find_user(recipient_id)
        if recipient is None:
            return None, "Choose someone to message."
        return {
            "type": "message",
            "text": text,
            "recipient_id": recipient_id,
            "recipient_name": recipient["name"],
        }, None

    return None, "Unsupported record type."


def save_new_record(data, user):
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
        # A reset can clear the file while this record is uploading.
        return next((r for r in load_records() if r["id"] == record["id"]), record)


def find_taken_down_notices(records):
    """Return the IDs of notices taken down by their own authors."""
    authors = {
        record["id"]: record["data"].get("sender_id")
        for record in records
        if record["data"].get("type") == "notice"
    }
    return {
        record["data"].get("notice_id")
        for record in records
        if record["data"].get("type") == "notice_removal"
        and authors.get(record["data"].get("notice_id")) == record["data"].get("sender_id")
    }


def find_resolved_sos(records):
    return {
        record["data"].get("sos_id")
        for record in records
        if record["data"].get("type") == "sos_resolved"
    }


def is_visible(record, user_id, taken_down, resolved_sos):
    data = record["data"]
    kind = data.get("type")
    if kind == "sos":
        return record["id"] not in resolved_sos
    if kind == "message":
        recipient_id = data.get("recipient_id")
        return bool(recipient_id) and user_id in (data.get("sender_id"), recipient_id)
    if kind == "notice":
        return record["id"] not in taken_down
    return kind in ("checklist", "checklist_template")


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
    online = is_online()
    if online:
        # Sync first, so waiting records still use the permission from the last logout.
        sync_pending_records()

    with data_lock:
        store = load_store()
        store["last_logouts"][session["user"]["id"]] = {
            "status": "online" if online else "offline",
            "at": datetime.now(timezone.utc).isoformat(),
        }
        save_store(store)

    session.clear()
    return redirect(url_for("login"))


@app.route("/")
def index():
    response = make_response(
        render_template("index.html", user=session["user"], sos_phone=SOS_PHONE_NUMBER)
    )
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
    user_id = session["user"]["id"]
    pull_remote_records(user_id)
    with data_lock:
        records = load_records()
    taken_down = find_taken_down_notices(records)
    resolved_sos = find_resolved_sos(records)
    return jsonify(
        [r for r in records if is_visible(r, user_id, taken_down, resolved_sos)]
    )


@app.route("/api/users")
def get_users():
    current_user_id = session["user"]["id"]
    others = {
        user_id: user
        for user_id, user in refresh_user_directory().items()
        if user_id != current_user_id
    }
    # Emails appear only when two people share a name, to tell them apart.
    name_counts = Counter(user["name"] for user in others.values())
    return jsonify(
        sorted(
            (
                {
                    "id": user_id,
                    "name": user["name"]
                    if name_counts[user["name"]] == 1
                    else f"{user['name']} ({user['email']})",
                }
                for user_id, user in others.items()
            ),
            key=lambda user: user["name"].casefold(),
        )
    )


@app.route("/api/records", methods=["POST"])
def create_record():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return jsonify(error="Send a non-empty JSON object."), 400

    user = session["user"]
    prepared, error = prepare_record(data, user)
    if error:
        return jsonify(error=error), 400
    return jsonify(save_new_record(prepared, user)), 201


@app.route("/api/reset-data", methods=["POST"])
def reset_data():
    # Only clears this computer's data.json. Nothing is deleted from Supabase.
    with data_lock:
        save_store([])
    return jsonify(reset=True)


@app.route("/api/sos/<sos_id>/resolve", methods=["POST"])
def resolve_sos(sos_id):
    with data_lock:
        records = load_records()
    if not any(r["id"] == sos_id and r["data"].get("type") == "sos" for r in records):
        return jsonify(error="SOS not found."), 404
    if sos_id not in find_resolved_sos(records):
        save_new_record({"type": "sos_resolved", "sos_id": sos_id}, session["user"])
    return jsonify(resolved=True)


@app.route("/api/notices/<notice_id>", methods=["DELETE"])
def take_down_notice(notice_id):
    user = session["user"]
    with data_lock:
        records = load_records()
    notice = next(
        (
            record
            for record in records
            if record["id"] == notice_id and record["data"].get("type") == "notice"
        ),
        None,
    )
    if notice is None:
        return jsonify(error="Notice not found."), 404
    if notice["data"].get("sender_id") != user["id"]:
        return jsonify(error="Only the author can take down a notice."), 403

    if notice_id not in find_taken_down_notices(records):
        # A new record, not an edit, so this works offline and always reaches Supabase.
        save_new_record({"type": "notice_removal", "notice_id": notice_id}, user)
    return jsonify(removed=True)


@app.route("/api/sync", methods=["POST"])
def sync():
    synced = sync_pending_records()
    with data_lock:
        pending = sum(not record["synced"] for record in load_records())
    return jsonify(synced=synced, pending=pending)


if __name__ == "__main__":
    # Debug mode can expose secrets, so it's off unless FLASK_DEBUG=1 is set locally.
    app.run(port=8050)
