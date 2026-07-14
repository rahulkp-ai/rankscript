"""
Pytest configuration and fixtures for RankScript backend tests.
"""
import pytest
import os
import sys
import uuid
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Set test environment BEFORE importing anything from app
os.environ["DATABASE_URL"]   = "sqlite:///:memory:"
os.environ["SECRET_KEY"]     = "test-secret-key-for-testing-only-not-for-production"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000"
os.environ["REDIS_URL"]      = "redis://localhost:6379/0"
os.environ["ENVIRONMENT"]    = "test"
os.environ["DEBUG"]          = "True"

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable FK enforcement in SQLite (disabled by default)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import app and models AFTER setting environment vars
from app.db.base import Base
from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus, CourseLevel
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.audit_log import AuditLog        # ensure table is registered
from app.core.security import hash_password, create_access_token

from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# FIX: Share one session between the test's db fixture and the HTTP client's
# dependency override.  Without this, data written via `db` is invisible to
# the request handler — requests see an empty DB and hang / return 404.
# ---------------------------------------------------------------------------
_current_test_session = None


def override_get_db():
    """
    FastAPI dependency override for tests.
    Yields the same SQLAlchemy session the test is using so that data
    inserted by the test is immediately visible inside request handlers.
    """
    if _current_test_session is not None:
        yield _current_test_session
    else:
        # Fallback: create a standalone session (should not normally occur)
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()


# Import app and wire up the override
from app.main import app
from app.db.session import get_db

app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Core fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def db():
    """
    Provide a clean, isolated SQLite session for each test.

    - Creates all tables before the test.
    - Exposes the session via the module-level `_current_test_session` so
      the HTTP client's dependency override can share it.
    - Drops all tables after the test to guarantee isolation.
    """
    global _current_test_session
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    _current_test_session = session
    try:
        yield session
    finally:
        session.close()
        _current_test_session = None
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """
    Return a TestClient that shares the test's database session.
    raise_server_exceptions=False lets tests assert on 4xx/5xx responses
    rather than having the test itself raise an exception.
    """
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_users(db):
    """Create admin, mentor, and student users for each test."""
    admin = User(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        name="Test Admin",
        email="admin@test.com",
        password_hash=hash_password("password"),
        role=UserRole.admin,
        state="Test State",
        district="Test District",
        country="Test Country",
        is_active=True,
        is_verified=True,
    )
    mentor = User(
        id=uuid.UUID("20000001-0000-0001-0000-000000000001"),
        name="Test Mentor",
        email="mentor@test.com",
        password_hash=hash_password("password"),
        role=UserRole.mentor,
        state="Test State",
        district="Test District",
        country="Test Country",
        is_active=True,
        is_verified=True,
    )
    student = User(
        id=uuid.UUID("30000001-0000-0001-0000-000000000001"),
        name="Test Student",
        email="student@test.com",
        password_hash=hash_password("password"),
        role=UserRole.student,
        state="Test State",
        district="Test District",
        country="Test Country",
        is_active=True,
        is_verified=True,
    )
    db.add_all([admin, mentor, student])
    db.commit()
    db.refresh(admin)
    db.refresh(mentor)
    db.refresh(student)
    return {"admin": admin, "mentor": mentor, "student": student}


# ---------------------------------------------------------------------------
# Token / header fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def admin_token(test_users):
    user = test_users["admin"]
    return create_access_token({"sub": str(user.id), "role": user.role.value})


@pytest.fixture
def mentor_token(test_users):
    user = test_users["mentor"]
    return create_access_token({"sub": str(user.id), "role": user.role.value})


@pytest.fixture
def student_token(test_users):
    user = test_users["student"]
    return create_access_token({"sub": str(user.id), "role": user.role.value})


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def mentor_auth_headers(mentor_token):
    return {"Authorization": f"Bearer {mentor_token}"}


@pytest.fixture
def student_auth_headers(student_token):
    return {"Authorization": f"Bearer {student_token}"}


# ---------------------------------------------------------------------------
# Domain fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_course(db, test_users):
    """Create an approved test course owned by the test mentor."""
    course = Course(
        id=uuid.UUID("40000001-0000-0001-0000-000000000001"),
        mentor_id=test_users["mentor"].id,
        title="Test Course",
        description="Test Course Description",
        status=CourseStatus.approved,
        level=CourseLevel.beginner,
        is_gated=False,
        total_lessons=2,
        total_enrolled=1,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@pytest.fixture
def test_lesson(db, test_course):
    """Create two lessons for the test course."""
    lesson1 = Lesson(
        id=uuid.UUID("50000001-0000-0001-0000-000000000001"),
        course_id=test_course.id,
        title="Lesson 1",
        description="First lesson",
        youtube_url="https://www.youtube.com/watch?v=test1",
        youtube_id="test1",
        duration=600,
        order=1,
        module="Module 1",
    )
    lesson2 = Lesson(
        id=uuid.UUID("50000001-0000-0001-0000-000000000002"),
        course_id=test_course.id,
        title="Lesson 2",
        description="Second lesson",
        youtube_url="https://www.youtube.com/watch?v=test2",
        youtube_id="test2",
        duration=600,
        order=2,
        module="Module 2",
    )
    db.add_all([lesson1, lesson2])
    db.commit()
    return [lesson1, lesson2]


@pytest.fixture
def test_enrollment(db, test_users, test_course):
    """Create an approved enrollment for the test student in the test course."""
    enrollment = Enrollment(
        id=uuid.UUID("90000001-0000-0001-0000-000000000001"),
        student_id=test_users["student"].id,
        course_id=test_course.id,
        progress=50.0,
        lessons_done=1,
        is_approved=True,
        is_completed=False,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment
