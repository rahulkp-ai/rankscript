from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, get_mentor
from app.models.user import User
from app.schemas.lesson import LessonCreate, LessonResponse
from app.services.lesson_service import add_lesson, get_lessons, delete_lesson, get_lesson_enrollment_count

router = APIRouter(prefix="/courses", tags=["Lessons"])


@router.get("/{course_id}/lessons", response_model=list[LessonResponse])
def list_lessons(
    course_id: UUID,
    db:        Session = Depends(get_db),
):
    """Get all lessons for a course — public."""
    return get_lessons(db, course_id)


@router.post("/{course_id}/lessons", response_model=LessonResponse, status_code=201)
def create_lesson(
    course_id:    UUID,
    data:         LessonCreate,
    current_user: User    = Depends(get_mentor),
    db:           Session = Depends(get_db),
):
    """Add a lesson to a course — mentor only."""
    return add_lesson(db, course_id, data, current_user)


@router.delete("/{course_id}/lessons/{lesson_id}", status_code=200)
def remove_lesson(
    course_id:    UUID,
    lesson_id:    UUID,
    current_user: User    = Depends(get_mentor),
    db:           Session = Depends(get_db),
):
    """Delete a lesson — mentor only. Returns info about what was deleted."""
    return delete_lesson(db, lesson_id, current_user)


@router.get("/{course_id}/lessons/{lesson_id}/enrollment-count")
def check_lesson_enrollment_count(
    course_id: UUID,
    lesson_id: UUID,
    db:        Session = Depends(get_db),
    _:         User    = Depends(get_mentor),
):
    """Get enrollment count for the course containing this lesson."""
    count = get_lesson_enrollment_count(db, lesson_id)
    return {"lesson_id": str(lesson_id), "enrollment_count": count}