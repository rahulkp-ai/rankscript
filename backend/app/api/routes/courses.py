from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, get_mentor, get_admin
from app.models.user import User
from app.schemas.course import (
    CourseCreate, CourseUpdate, CourseStatusUpdate, CourseReviewUpdate,
    CourseResponse, CourseListResponse
)
from app.schemas.lesson import (
    LessonResponse, LessonReviewUpdate
)
from app.services.course_service import (
    create_course, get_courses, get_course_by_id,
    update_course, approve_course,
    get_mentor_courses, get_pending_courses, get_pending_lessons,
    review_lesson as review_lesson_service,
    get_course_lessons_for_review,
    delete_course, get_course_enrollment_count,
)

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", response_model=CourseListResponse)
def list_courses(
    status: str = Query(default="approved"),
    skip:   int = Query(default=0, ge=0),
    limit:  int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    """List all approved courses — public."""
    courses, total = get_courses(db, status=status, skip=skip, limit=limit)
    return {"courses": courses, "total": total}


@router.get("/pending", response_model=list[CourseResponse])
def list_pending(
    db: Session = Depends(get_db),
    _:  User    = Depends(get_admin),
):
    """List courses pending admin approval — admin only."""
    return get_pending_courses(db)


@router.get("/pending-lessons")
def list_pending_lessons(
    db: Session = Depends(get_db),
    _:  User    = Depends(get_admin),
):
    """List all lessons pending admin review — admin only."""
    lessons = get_pending_lessons(db)
    result = []
    for lesson in lessons:
        course = get_course_by_id(db, lesson.course_id)
        result.append({
            "id": str(lesson.id),
            "course_id": str(lesson.course_id),
            "course_title": course.title,
            "title": lesson.title,
            "description": lesson.description,
            "youtube_url": lesson.youtube_url,
            "review_status": lesson.review_status.value if hasattr(lesson.review_status, 'value') else lesson.review_status,
            "created_at": str(lesson.created_at),
        })
    return result


@router.get("/my", response_model=list[CourseResponse])
def my_courses(
    current_user: User    = Depends(get_mentor),
    db:           Session = Depends(get_db),
):
    """List courses created by the logged-in mentor."""
    return get_mentor_courses(db, current_user.id)


@router.post("", response_model=CourseResponse, status_code=201)
def create(
    data:         CourseCreate,
    current_user: User    = Depends(get_mentor),
    db:           Session = Depends(get_db),
):
    """Create a new course — mentor only."""
    return create_course(db, data, current_user)


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: UUID,
    db:        Session = Depends(get_db),
):
    """Get a single course by ID — public."""
    return get_course_by_id(db, course_id)


@router.put("/{course_id}", response_model=CourseResponse)
def update(
    course_id:    UUID,
    data:         CourseUpdate,
    current_user: User    = Depends(get_mentor),
    db:           Session = Depends(get_db),
):
    """Update a course — mentor only."""
    return update_course(db, course_id, data, current_user)


@router.put("/{course_id}/approve", response_model=CourseResponse)
def approve(
    course_id: UUID,
    data:      CourseStatusUpdate,
    db:        Session = Depends(get_db),
    current_user: User = Depends(get_admin),
):
    """Approve or reject a course — admin only."""
    return approve_course(db, course_id, data, current_user)


@router.get("/{course_id}/lessons-for-review")
def get_lessons_for_review(
    course_id: UUID,
    db:        Session = Depends(get_db),
    _:         User    = Depends(get_admin),
):
    """Get all lessons of a course for admin review — admin only."""
    return get_course_lessons_for_review(db, course_id)


@router.put("/lessons/{lesson_id}/review")
def review_lesson_endpoint(
    lesson_id:    UUID,
    data:         LessonReviewUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_admin),
):
    """Review a lesson (approve/reject) with feedback — admin only."""
    return review_lesson_service(db, lesson_id, data, current_user)


@router.delete("/{course_id}", status_code=200)
def delete_course_endpoint(
    course_id:    UUID,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_mentor),
):
    """Delete a course and all related data — only the creator mentor or admin."""
    return delete_course(db, course_id, current_user)


@router.get("/{course_id}/enrollment-count")
def check_enrollment_count(
    course_id: UUID,
    db:        Session = Depends(get_db),
    _:         User    = Depends(get_mentor),
):
    """Get enrollment count for a course — used for deletion warnings."""
    count = get_course_enrollment_count(db, course_id)
    return {"course_id": str(course_id), "enrollment_count": count}