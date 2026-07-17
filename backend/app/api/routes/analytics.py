from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, get_mentor, get_admin, get_student, get_student_or_admin
from app.models.user import User
from app.schemas.analytics import StudentAnalytics, MentorAnalytics, AdminAnalytics
from app.services.analytics_service import (
    get_student_analytics,
    get_mentor_analytics,
    get_admin_analytics,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/student/me", response_model=StudentAnalytics)
def student_analytics(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_student_or_admin),
):
    """Get analytics for the current student."""
    return get_student_analytics(db, current_user)


@router.get("/mentor/overview", response_model=MentorAnalytics)
def mentor_analytics(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_mentor),
):
    """Get analytics for the current mentor's courses."""
    return get_mentor_analytics(db, current_user)


@router.get("/admin/overview", response_model=AdminAnalytics)
def admin_analytics(
    db: Session = Depends(get_db),
    _:  User    = Depends(get_admin),
):
    """Get platform-wide analytics — admin only."""
    return get_admin_analytics(db)