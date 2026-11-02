"""Admin API — port of the old server/routes/admin.js.

Same contract the React admin page already uses: x-session-id header auth,
in-memory sessions with a 30-minute absolute expiry, and a 5-failures-per-IP
per-15-minutes login rate limit.

Deliberate changes from the Express version:
- no admin/admin123 fallback when ADMIN_USERNAME/ADMIN_PASSWORD are unset
  (login fails instead);
- the unauthenticated POST /clear-limits debug endpoint is not ported.
"""

import hmac
import os
import secrets
import time
import traceback

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from db import pool, row_out, rows_out

router = APIRouter(prefix="/api/admin")

SESSION_TTL_SECONDS = 30 * 60
ATTEMPT_WINDOW_SECONDS = 15 * 60
MAX_LOGIN_ATTEMPTS = 5

_sessions = {}        # session_id -> login time (epoch seconds)
_login_attempts = {}  # ip -> {"count": int, "last_attempt": epoch seconds}


def _err(message, status=500, **extra):
    return JSONResponse({"error": message, **extra}, status_code=status)


def _client_ip(request):
    return request.client.host if request.client else "unknown"


def require_auth(x_session_id: str | None = Header(default=None)):
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Authentication required: No session ID")
    login_time = _sessions.get(x_session_id)
    if login_time is not None and time.time() - login_time > SESSION_TTL_SECONDS:
        _sessions.pop(x_session_id, None)
        login_time = None
    if login_time is None:
        raise HTTPException(status_code=401, detail="Authentication required: Invalid session")


authed = [Depends(require_auth)]


@router.post("/login")
def login(request: Request, payload: dict = Body(default={})):
    username = payload.get("username")
    password = payload.get("password")
    ip = _client_ip(request)
    now = time.time()

    attempts = _login_attempts.get(ip, {"count": 0, "last_attempt": now})
    if now - attempts["last_attempt"] > ATTEMPT_WINDOW_SECONDS:
        attempts["count"] = 0
    if attempts["count"] >= MAX_LOGIN_ATTEMPTS:
        return _err("Too many login attempts. Please try again in 15 minutes.", 429)

    admin_username = os.environ.get("ADMIN_USERNAME")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if not admin_username or not admin_password:
        return _err("Admin credentials are not configured", 500)

    user_ok = hmac.compare_digest(str(username or ""), admin_username)
    pass_ok = hmac.compare_digest(str(password or ""), admin_password)
    if user_ok and pass_ok:
        _login_attempts.pop(ip, None)
        session_id = secrets.token_hex(32)
        _sessions[session_id] = time.time()
        return {"success": True, "sessionId": session_id}

    attempts["count"] += 1
    attempts["last_attempt"] = now
    _login_attempts[ip] = attempts
    if len(_login_attempts) > 1000:
        cutoff = now - ATTEMPT_WINDOW_SECONDS
        for stale in [k for k, v in _login_attempts.items() if v["last_attempt"] < cutoff]:
            _login_attempts.pop(stale, None)
    return _err("Invalid credentials", 401)


@router.post("/logout")
def logout(x_session_id: str | None = Header(default=None)):
    if x_session_id:
        _sessions.pop(x_session_id, None)
    return {"success": True}


def _all_tables(conn):
    hero = conn.execute("SELECT * FROM hero_info ORDER BY id DESC LIMIT 1").fetchall()
    stats = conn.execute("SELECT * FROM hero_stats ORDER BY sort_order").fetchall()
    about = conn.execute("SELECT * FROM about_info ORDER BY id DESC LIMIT 1").fetchall()
    projects = conn.execute("SELECT * FROM projects ORDER BY sort_order").fetchall()
    skills = conn.execute("SELECT * FROM skills ORDER BY category, sort_order").fetchall()
    education = conn.execute("SELECT * FROM education ORDER BY sort_order").fetchall()
    contact = conn.execute("SELECT * FROM contact_info ORDER BY id DESC LIMIT 1").fetchall()
    return {
        "hero": row_out(hero[0]) if hero else {},
        "stats": rows_out(stats),
        "about": row_out(about[0]) if about else {},
        "projects": rows_out(projects),
        "skills": rows_out(skills),
        "education": rows_out(education),
        "contact": row_out(contact[0]) if contact else {},
    }


@router.get("/export", dependencies=authed)
def export_data():
    try:
        with pool.connection() as conn:
            data = _all_tables(conn)
        data["exportDate"] = (
            time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + f".{int(time.time() * 1000) % 1000:03d}Z"
        )
        return JSONResponse(
            data,
            headers={"Content-Disposition": "attachment; filename=portfolio-backup.json"},
        )
    except Exception:
        traceback.print_exc()
        return _err("Failed to export data")


@router.get("/data", dependencies=authed)
def get_data():
    try:
        with pool.connection() as conn:
            return _all_tables(conn)
    except Exception:
        traceback.print_exc()
        return _err("Failed to fetch data")


@router.put("/hero", dependencies=authed)
def update_hero(payload: dict = Body(default={})):
    name = payload.get("name")
    title = payload.get("title")
    description = payload.get("description")
    if not name or not title or not description:
        return _err("Name, title, and description are required", 400)
    try:
        with pool.connection() as conn:
            existing = conn.execute("SELECT id FROM hero_info ORDER BY id DESC LIMIT 1").fetchall()
            if existing:
                conn.execute(
                    "UPDATE hero_info SET name = %s, title = %s, description = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (name, title, description, existing[0]["id"]),
                )
            else:
                conn.execute(
                    "INSERT INTO hero_info (name, title, description) VALUES (%s, %s, %s)",
                    (name, title, description),
                )
        return {"success": True, "message": "Hero info updated successfully"}
    except Exception:
        traceback.print_exc()
        return _err("Failed to update hero info")


@router.put("/about", dependencies=authed)
def update_about(payload: dict = Body(default={})):
    content = payload.get("content")
    if not content:
        return _err("Content is required", 400)
    try:
        with pool.connection() as conn:
            existing = conn.execute("SELECT id FROM about_info ORDER BY id DESC LIMIT 1").fetchall()
            if existing:
                conn.execute(
                    "UPDATE about_info SET content = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (content, existing[0]["id"]),
                )
            else:
                conn.execute("INSERT INTO about_info (content) VALUES (%s)", (content,))
        return {"success": True, "message": "About info updated successfully"}
    except Exception:
        traceback.print_exc()
        return _err("Failed to update about info")


# --- Projects ---------------------------------------------------------------

@router.post("/projects", dependencies=authed)
def add_project(payload: dict = Body(default={})):
    try:
        with pool.connection() as conn:
            row = conn.execute(
                """
                INSERT INTO projects (category, title, description, link, link_text, is_current_study, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
                """,
                (
                    payload.get("category"),
                    payload.get("title"),
                    payload.get("description"),
                    payload.get("link"),
                    payload.get("linkText"),
                    bool(payload.get("isCurrentStudy")),
                    payload.get("sortOrder") or 0,
                ),
            ).fetchone()
        return {"success": True, "id": row["id"]}
    except Exception:
        traceback.print_exc()
        return _err("Failed to add project")


@router.put("/projects/{item_id}", dependencies=authed)
def update_project(item_id: int, payload: dict = Body(default={})):
    if not payload.get("category") or not payload.get("title") or not payload.get("description"):
        return _err("Missing required fields", 400, details="Category, title, and description are required")
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                """
                UPDATE projects
                SET category = %s, title = %s, description = %s, link = %s, link_text = %s,
                    is_current_study = %s, sort_order = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (
                    payload.get("category"),
                    payload.get("title"),
                    payload.get("description"),
                    payload.get("link"),
                    payload.get("linkText"),
                    bool(payload.get("isCurrentStudy")),
                    payload.get("sortOrder") or 0,
                    item_id,
                ),
            ).fetchall()
        if not rows:
            return _err("Project not found", 404, details=f"No project found with ID {item_id}")
        return {"success": True, "message": "Project updated successfully"}
    except Exception:
        traceback.print_exc()
        return _err("Database error occurred")


@router.delete("/projects/{item_id}", dependencies=authed)
def delete_project(item_id: int):
    try:
        with pool.connection() as conn:
            conn.execute("DELETE FROM projects WHERE id = %s", (item_id,))
        return {"success": True}
    except Exception:
        traceback.print_exc()
        return _err("Failed to delete project")


# --- Skills -----------------------------------------------------------------

@router.post("/skills", dependencies=authed)
def add_skill(payload: dict = Body(default={})):
    try:
        with pool.connection() as conn:
            row = conn.execute(
                "INSERT INTO skills (category, name, level, sort_order) VALUES (%s, %s, %s, %s) RETURNING id",
                (
                    payload.get("category"),
                    payload.get("name"),
                    payload.get("level"),
                    payload.get("sortOrder") or 0,
                ),
            ).fetchone()
        return {"success": True, "id": row["id"]}
    except Exception:
        traceback.print_exc()
        return _err("Failed to add skill")


@router.put("/skills/{item_id}", dependencies=authed)
def update_skill(item_id: int, payload: dict = Body(default={})):
    if not payload.get("category") or not payload.get("name") or not payload.get("level"):
        return _err("Missing required fields", 400, details="Category, name, and level are required")
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                "UPDATE skills SET category = %s, name = %s, level = %s, sort_order = %s WHERE id = %s RETURNING id",
                (
                    payload.get("category"),
                    payload.get("name"),
                    payload.get("level"),
                    payload.get("sortOrder") or 0,
                    item_id,
                ),
            ).fetchall()
        if not rows:
            return _err("Skill not found", 404, details=f"No skill found with ID {item_id}")
        return {"success": True, "message": "Skill updated successfully"}
    except Exception:
        traceback.print_exc()
        return _err("Database error occurred")


@router.delete("/skills/{item_id}", dependencies=authed)
def delete_skill(item_id: int):
    try:
        with pool.connection() as conn:
            conn.execute("DELETE FROM skills WHERE id = %s", (item_id,))
        return {"success": True}
    except Exception:
        traceback.print_exc()
        return _err("Failed to delete skill")


# --- Hero stats ---------------------------------------------------------------

@router.post("/stats", dependencies=authed)
def add_stat(payload: dict = Body(default={})):
    try:
        with pool.connection() as conn:
            row = conn.execute(
                "INSERT INTO hero_stats (number, label, sort_order) VALUES (%s, %s, %s) RETURNING id",
                (payload.get("number"), payload.get("label"), payload.get("sortOrder") or 0),
            ).fetchone()
        return {"success": True, "id": row["id"]}
    except Exception:
        traceback.print_exc()
        return _err("Failed to add stat")


@router.put("/stats/{item_id}", dependencies=authed)
def update_stat(item_id: int, payload: dict = Body(default={})):
    try:
        with pool.connection() as conn:
            conn.execute(
                "UPDATE hero_stats SET number = %s, label = %s, sort_order = %s WHERE id = %s",
                (payload.get("number"), payload.get("label"), payload.get("sortOrder") or 0, item_id),
            )
        return {"success": True}
    except Exception:
        traceback.print_exc()
        return _err("Failed to update stat")


@router.delete("/stats/{item_id}", dependencies=authed)
def delete_stat(item_id: int):
    try:
        with pool.connection() as conn:
            conn.execute("DELETE FROM hero_stats WHERE id = %s", (item_id,))
        return {"success": True}
    except Exception:
        traceback.print_exc()
        return _err("Failed to delete stat")


# --- Education ----------------------------------------------------------------

@router.post("/education", dependencies=authed)
def add_education(payload: dict = Body(default={})):
    try:
        with pool.connection() as conn:
            row = conn.execute(
                "INSERT INTO education (title, date_range, description, sort_order) VALUES (%s, %s, %s, %s) RETURNING id",
                (
                    payload.get("title"),
                    payload.get("dateRange"),
                    payload.get("description"),
                    payload.get("sortOrder") or 0,
                ),
            ).fetchone()
        return {"success": True, "id": row["id"]}
    except Exception:
        traceback.print_exc()
        return _err("Failed to add education")


@router.put("/education/{item_id}", dependencies=authed)
def update_education(item_id: int, payload: dict = Body(default={})):
    try:
        with pool.connection() as conn:
            conn.execute(
                "UPDATE education SET title = %s, date_range = %s, description = %s, sort_order = %s WHERE id = %s",
                (
                    payload.get("title"),
                    payload.get("dateRange"),
                    payload.get("description"),
                    payload.get("sortOrder") or 0,
                    item_id,
                ),
            )
        return {"success": True}
    except Exception:
        traceback.print_exc()
        return _err("Failed to update education")


@router.delete("/education/{item_id}", dependencies=authed)
def delete_education(item_id: int):
    try:
        with pool.connection() as conn:
            conn.execute("DELETE FROM education WHERE id = %s", (item_id,))
        return {"success": True}
    except Exception:
        traceback.print_exc()
        return _err("Failed to delete education")


# --- Contact messages ---------------------------------------------------------

@router.get("/messages", dependencies=authed)
def list_messages():
    try:
        with pool.connection() as conn:
            rows = conn.execute("SELECT * FROM contact_messages ORDER BY created_at DESC").fetchall()
        return rows_out(rows)
    except Exception:
        traceback.print_exc()
        return _err("Failed to fetch messages")


@router.delete("/messages/{item_id}", dependencies=authed)
def delete_message(item_id: int):
    try:
        with pool.connection() as conn:
            conn.execute("DELETE FROM contact_messages WHERE id = %s", (item_id,))
        return {"success": True}
    except Exception:
        traceback.print_exc()
        return _err("Failed to delete message")
