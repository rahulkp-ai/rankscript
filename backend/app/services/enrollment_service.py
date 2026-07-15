import logging

from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from datetime import datetime, timezone

from app.models.enrollment import Enrollment
from app.models.course import Course, CourseStatus
from app.models.user import User
from app.schemas.enrollment import EnrollRequest, ProgressUpdate

logger = logging.getLogger(__name__)


def enroll_student(db: Session, data: EnrollRequest, student: User) -> Enrollment:
    # Use a transaction with row locking to prevent race conditions
    course = db.query(Course).filter(Course.id == data.course_id).with_for_update().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.status != CourseStatus.approved:
        raise HTTPException(status_code=400, detail="Course is not available for enrollment")

    # Check already enrolled (with lock held)
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.course_id == data.course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")

    enrollment = Enrollment(
        student_id=student.id,
        course_id=data.course_id,
        is_approved=not course.is_gated,   # auto-approve if not gated
    )
    db.add(enrollment)

    # total_enrolled is maintained by the database trigger trg_enrollment_count
    db.commit()
    db.refresh(enrollment)
    return enrollment


def get_my_enrollments(db: Session, student_id: UUID):
    return db.query(Enrollment).filter(Enrollment.student_id == student_id).all()


def update_progress(
    db: Session, enrollment_id: UUID, data: ProgressUpdate, student: User
) -> Enrollment:
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if str(enrollment.student_id) != str(student.id):
        raise HTTPException(status_code=403, detail="Not your enrollment")

    # Validate lessons_done doesn't exceed total_lessons
    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
    if course and data.lessons_done > course.total_lessons:
        raise HTTPException(
            status_code=400, 
            detail=f"lessons_done ({data.lessons_done}) exceeds total lessons ({course.total_lessons})"
        )

    enrollment.progress       = data.progress
    enrollment.lessons_done   = data.lessons_done
    enrollment.last_lesson_id = data.lesson_id

    # Mark as completed if 100%
    if data.progress >= 100.0 and not enrollment.is_completed:
        enrollment.is_completed = True
        enrollment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()
    db.refresh(enrollment)
    
    # Automatically update ranking after progress update
    try:
        # Import here to avoid circular import
        from app.services.ranking_service import update_user_ranking
        update_user_ranking(db, student)
    except ValueError as e:
        # Non-student role - ranking not applicable, this is expected
        logger.debug(f"Ranking skipped for non-student user {student.id}: {e}")
    except Exception as e:
        # Log ranking failures to catch unexpected issues
        logger.warning(f"Ranking update failed for user {student.id}: {e}")
    
    return enrollment