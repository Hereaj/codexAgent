"""Portfolio API — FastAPI port of the old Express server (server/server.js).

Serves only /api/*. In production nginx serves the built React app
(client/dist) and /attached_assets directly, and proxies /api here
(uvicorn on 127.0.0.1:8000 — see deploy/portfolio.service).
"""

import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Body, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from admin import router as admin_router
from db import parse_technologies, pool
from init_db import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open(wait=True, timeout=30)
    initialize_database()
    yield
    pool.close()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

# The old Express server ran cors() wide open; keep the same behavior.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Match the Express error shape: {"error": "..."} — never FastAPI's {"detail": ...}.
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse({"error": "Invalid request"}, status_code=400)


app.include_router(admin_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/analytics/view")
def track_view(request: Request, payload: dict = Body(default={})):
    try:
        ts = payload.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                ts = None
        if ts is None:
            ts = datetime.now(timezone.utc).replace(tzinfo=None)
        ip = request.client.host if request.client else None
        with pool.connection() as conn:
            conn.execute(
                "INSERT INTO page_views (page, user_agent, ip_address, timestamp) VALUES (%s, %s, %s, %s)",
                (payload.get("page"), payload.get("userAgent"), ip, ts),
            )
        return {"success": True}
    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": "Failed to track view"}, status_code=500)


def _project_out(row):
    return {
        "id": row["id"],
        "category": row["category"],
        "title": row["title"],
        "description": row["description"],
        "technologies": parse_technologies(row["technologies"]),
        "link": row["link"],
        "linkText": row["link_text"],
    }


def _group_skills(rows):
    grouped = {}
    for skill in rows:
        grouped.setdefault(skill["category"], []).append(
            {"name": skill["name"], "level": skill["level"]}
        )
    return grouped


@app.get("/api/portfolio")
def get_portfolio():
    try:
        with pool.connection() as conn:
            hero = conn.execute("SELECT * FROM hero_info ORDER BY id DESC LIMIT 1").fetchall()
            stats = conn.execute("SELECT * FROM hero_stats ORDER BY sort_order").fetchall()
            about = conn.execute("SELECT * FROM about_info ORDER BY id DESC LIMIT 1").fetchall()
            current = conn.execute(
                "SELECT * FROM projects WHERE is_current_study = true ORDER BY sort_order"
            ).fetchall()
            projects = conn.execute(
                "SELECT * FROM projects WHERE is_current_study = false ORDER BY sort_order"
            ).fetchall()
            skills = conn.execute("SELECT * FROM skills ORDER BY category, sort_order").fetchall()
            education = conn.execute("SELECT * FROM education ORDER BY sort_order").fetchall()
            contact = conn.execute("SELECT * FROM contact_info ORDER BY id DESC LIMIT 1").fetchall()

        h = hero[0] if hero else {}
        c = contact[0] if contact else {}
        return {
            "hero": {
                "name": h.get("name") or "",
                "title": h.get("title") or "",
                "description": h.get("description") or "",
                "stats": [{"number": s["number"], "label": s["label"]} for s in stats],
            },
            "about": (about[0].get("content") if about else "") or "",
            "currentStudies": [
                {
                    "id": r["id"],
                    "category": r["category"],
                    "title": r["title"],
                    "description": r["description"],
                    "technologies": parse_technologies(r["technologies"]),
                }
                for r in current
            ],
            "projects": [_project_out(r) for r in projects],
            "skills": _group_skills(skills),
            "education": [
                {
                    "id": r["id"],
                    "date": r["date_range"],
                    "title": r["title"],
                    "description": r["description"],
                }
                for r in education
            ],
            "contact": {
                "email": c.get("email") or "",
                "linkedin": c.get("linkedin") or "",
                "github": c.get("github") or "",
                "location": c.get("location") or "",
            },
        }
    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": "Failed to fetch portfolio data"}, status_code=500)


@app.get("/api/projects")
def get_projects():
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM projects WHERE is_current_study = false ORDER BY sort_order"
            ).fetchall()
        return [_project_out(r) for r in rows]
    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": "Failed to fetch projects"}, status_code=500)


@app.get("/api/skills")
def get_skills():
    try:
        with pool.connection() as conn:
            rows = conn.execute("SELECT * FROM skills ORDER BY category, sort_order").fetchall()
        return _group_skills(rows)
    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": "Failed to fetch skills"}, status_code=500)


@app.get("/api/education")
def get_education():
    try:
        with pool.connection() as conn:
            rows = conn.execute("SELECT * FROM education ORDER BY sort_order").fetchall()
        return [
            {
                "id": r["id"],
                "date": r["date_range"],
                "title": r["title"],
                "description": r["description"],
            }
            for r in rows
        ]
    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": "Failed to fetch education"}, status_code=500)
