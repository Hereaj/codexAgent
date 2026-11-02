import json
import os
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

# Same contract as the old Express server: secrets live in the repo-root .env
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Opened in the FastAPI lifespan (main.py); importing this module never
# requires a reachable database.
pool = ConnectionPool(
    conninfo=DATABASE_URL,
    min_size=1,
    max_size=5,
    kwargs={"row_factory": dict_row},
    open=False,
)


def _json_value(value):
    """Serialize DB values the way Express/node-pg did (ISO + milliseconds + Z)."""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%S.") + f"{value.microsecond // 1000:03d}Z"
    if isinstance(value, date):
        return value.isoformat()
    return value


def row_out(row):
    return {k: _json_value(v) for k, v in row.items()} if row else {}


def rows_out(rows):
    return [row_out(r) for r in rows]


def parse_technologies(value):
    """Port of the Express parseTechnologies helper (old server/server.js)."""
    if not value:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            if value.startswith("[") and value.endswith("]"):
                return json.loads(value)
            return [t.strip() for t in value.split(",") if t.strip()]
        except Exception:
            return []
    return []
