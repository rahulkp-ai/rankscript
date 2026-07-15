from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.enrollment import EnrollRequest, ProgressUpdate, EnrollmentResponse
from app.services.enrollment_service import (
    enroll_student, get_my_enrollments, update_progress
)

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


@router.post("", response_model=EnrollmentResponse, status_code=201)
def enroll(
    data:         EnrollRequest,
    current_user: User    = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    """Enroll the current student in a course."""
    return enroll_student(db, data, current_user)


@router.get("/me", response_model=list[EnrollmentResponse])
def my_enrollments(
    current_user: User    = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    """Get all courses the current user is enrolled in."""
    return get_my_enrollments(db, current_user.id)


@router.put("/{enrollment_id}/progress", response_model=EnrollmentResponse)
def track_progress(
    enrollment_id: UUID,
    data:          ProgressUpdate,
    current_user:  User    = Depends(get_current_user),
    db:            Session = Depends(get_db),
):
    """Update lesson progress for an enrollment."""
    return update_progress(db, enrollment_id, data, current_user)