import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from postgrest.exceptions import APIError
from supabase import ClientOptions, create_client

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DATA_FILE = BASE_DIR / "data.json"
SUPABASE_TABLE = "records"
SUPABASE_ERRORS = (httpx.HTTPError, APIError)

app = Flask(
    __name__,
    template_folder="template",
    static_folder="Static",
    static_url_path="/static",
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


@app.route("/")
def index():
    return render_template("index.html")


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

    record = {
        "id": str(uuid.uuid4()),
        "data": data,
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
