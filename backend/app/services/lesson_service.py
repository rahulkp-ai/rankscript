from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID

from app.models.lesson import Lesson
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User, UserRole
from app.schemas.lesson import LessonCreate, extract_youtube_id


def add_lesson(db: Session, course_id: UUID, data: LessonCreate, mentor: User) -> Lesson:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if str(course.mentor_id) != str(mentor.id) and mentor.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your course")

    lesson = Lesson(
        course_id=course_id,
        title=data.title,
        description=data.description,
        youtube_url=data.youtube_url,
        youtube_id=extract_youtube_id(data.youtube_url),
        duration=data.duration,
        order=data.order,
        module=data.module,
        is_free=data.is_free,
    )
    db.add(lesson)

    # total_lessons is maintained by the database trigger trg_lesson_count
    db.commit()
    db.refresh(lesson)
    return lesson


def get_lessons(db: Session, course_id: UUID):
    return (
        db.query(Lesson)
        .filter(Lesson.course_id == course_id)
        .order_by(Lesson.order)
        .all()
    )


def delete_lesson(db: Session, lesson_id: UUID, mentor: User) -> dict:
    """Delete a lesson. Only the course creator or admin can delete.

    Returns a dict with info about what was deleted so the frontend
    can show appropriate feedback.
    """
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    if str(course.mentor_id) != str(mentor.id) and mentor.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your course")

    # Count enrolled students for the parent course (for warning feedback)
    enrollment_count = db.query(Enrollment).filter(
        Enrollment.course_id == lesson.course_id
    ).count()

    db.delete(lesson)
    # total_lessons is maintained by the database trigger trg_lesson_count
    db.commit()

    return {
        "deleted": True,
        "lesson_id": str(lesson_id),
        "course_id": str(lesson.course_id),
        "enrollment_count": enrollment_count,
    }


def get_lesson_enrollment_count(db: Session, lesson_id: UUID) -> int:
    """Get the enrollment count for the course containing this lesson."""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return db.query(Enrollment).filter(
        Enrollment.course_id == lesson.course_id
    ).count()