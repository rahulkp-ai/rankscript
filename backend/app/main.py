from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError, HTTPException as FastAPIHTTPException
import logging

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base

from app.models.user import User                   # noqa: F401
from app.models.course import Course               # noqa: F401
from app.models.lesson import Lesson               # noqa: F401
from app.models.enrollment import Enrollment       # noqa: F401
from app.models.quiz import Quiz                   # noqa: F401
from app.models.question import Question           # noqa: F401
from app.models.quiz_attempt import QuizAttempt    # noqa: F401
from app.models.assignment import Assignment       # noqa: F401
from app.models.submission import Submission       # noqa: F401
from app.models.ranking import RankEntry           # noqa: F401
from app.models.audit_log import AuditLog         # noqa: F401

from app.api.routes import (
    auth, users, courses, lessons,
    enrollments, quizzes, assignments,
    ranking, analytics, admin
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CORS configuration
# In development we use allow_origins=["*"] so preflight always succeeds
# regardless of which localhost variant the browser sends.
# In production, restrict to the explicit ALLOWED_ORIGINS list.
# ─────────────────────────────────────────────────────────────────────────────
_is_dev = getattr(settings, "ENVIRONMENT", "development") in ("development", "test", "dev")

if _is_dev:
    # Wildcard – no origin matching, every preflight is accepted immediately
    cors_origins = ["*"]
else:
    cors_origins_raw = settings.ALLOWED_ORIGINS if settings.ALLOWED_ORIGINS.strip() else ""
    cors_origins = (
        [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
        if cors_origins_raw else []
    )
    # Always include localhost variants in non-prod for convenience
    for _origin in [
        "http://localhost:3000", "http://localhost:3001",
        "http://127.0.0.1:3000", "http://127.0.0.1:3001",
    ]:
        if _origin not in cors_origins:
            cors_origins.append(_origin)

logger.info(f"CORS mode: {'wildcard (dev)' if _is_dev else 'restricted'} | origins: {cors_origins}")

# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="RankScript API",
    description="Backend API for RankScript — Competitive Learning Platform",
    version="1.0.0",
)


@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Middleware — CORSMiddleware MUST be registered FIRST so it becomes the
# outermost layer and processes every request/response including preflight.
#
# NOTE: allow_credentials=True is incompatible with allow_origins=["*"] in
# Starlette ≥ 0.20. In dev mode we disable credentials to allow wildcard.
# In production mode credentials are enabled with explicit origin list.
# ─────────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=not _is_dev,   # False in dev (wildcard), True in prod
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "X-Request-ID"],
    max_age=600,
)


# ─────────────────────────────────────────────────────────────────────────────
# Safety-net OPTIONS handler
# Starlette's CORSMiddleware handles preflight at the middleware layer and
# never reaches routes. This catch-all is a last-resort fallback in case the
# middleware is misconfigured — it ensures OPTIONS never returns 405.
# ─────────────────────────────────────────────────────────────────────────────
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request) -> Response:
    origin = request.headers.get("origin", "*")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin if not _is_dev else "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "600",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Exception handlers
# Return JSONResponse for ALL exception types so the response always passes
# through CORSMiddleware (which adds the CORS headers).
# NEVER use `raise exc` inside an exception handler — that re-raises past the
# middleware stack and the response loses its CORS headers.
# ─────────────────────────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = []
    for error in errors:
        loc = ".".join(str(l) for l in error.get("loc", []) if str(l) != "body")
        msg = error.get("msg", "Validation error")
        messages.append(f"{loc}: {msg}" if loc else msg)
    detail = "; ".join(messages) if messages else "Validation error"
    return JSONResponse(status_code=422, content={"detail": detail})


@app.exception_handler(FastAPIHTTPException)
async def http_exception_handler(request: Request, exc: FastAPIHTTPException):
    # Return as JSONResponse so CORSMiddleware can add CORS headers.
    # Do NOT `raise exc` here — that bypasses the middleware response path.
    headers = dict(exc.headers) if exc.headers else {}
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers if headers else None,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    is_dev = getattr(settings, "ENVIRONMENT", "development") in ("development", "test", "dev")
    error_detail = str(exc) if is_dev else "Internal server error"
    logger.error(
        f"Unhandled {type(exc).__name__} on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(status_code=500, content={"detail": error_detail})


# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(lessons.router)
app.include_router(enrollments.router)
app.include_router(quizzes.router)
app.include_router(assignments.router)
app.include_router(ranking.router)
app.include_router(analytics.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "RankScript API is running! 🚀", "docs": "/docs", "version": "1.0.0"}


@app.get("/debug/cors")
def debug_cors(request: Request):
    return {
        "cors_mode": "wildcard" if _is_dev else "restricted",
        "allowed_origins": cors_origins,
        "request_origin": request.headers.get("origin", "NOT SET"),
        "request_host": request.headers.get("host", "NOT SET"),
        "environment": getattr(settings, "ENVIRONMENT", "unknown"),
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
