from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from datetime import datetime, timezone

from app.models.course import Course
from app.models.lesson import Lesson, LessonReviewStatus
from app.models.enrollment import Enrollment
from app.models.quiz import Quiz
from app.models.assignment import Assignment
from app.models.user import User, UserRole
from app.schemas.course import CourseCreate, CourseUpdate, CourseStatusUpdate, CourseStatus
from app.schemas.lesson import LessonReviewUpdate


def create_course(db: Session, data: CourseCreate, mentor: User) -> Course:
    course = Course(
        mentor_id=mentor.id,
        title=data.title,
        description=data.description,
        thumbnail=data.thumbnail,
        level=data.level,
        tags=data.tags,
        is_gated=data.is_gated,
        status=CourseStatus.pending,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def get_courses(db: Session, status: str = "approved", skip: int = 0, limit: int = 20):
    query = db.query(Course)
    if status:
        query = query.filter(Course.status == status)
    total = query.count()
    courses = query.offset(skip).limit(limit).all()
    return courses, total


def get_course_by_id(db: Session, course_id: UUID) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def update_course(db: Session, course_id: UUID, data: CourseUpdate, mentor: User) -> Course:
    course = get_course_by_id(db, course_id)
    if str(course.mentor_id) != str(mentor.id) and mentor.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your course")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


def approve_course(db: Session, course_id: UUID, data: CourseStatusUpdate, admin: User) -> Course:
    """Approve or reject a course with admin review notes."""
    course = get_course_by_id(db, course_id)
    
    # Validate that course is in pending status before approving/rejecting
    if course.status != CourseStatus.pending:
        raise HTTPException(
            status_code=400, 
            detail=f"Course is not pending approval. Current status: {course.status}"
        )
    
    course.status = data.status
    course.reviewed_by = admin.id
    course.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if data.reason:
        course.review_notes = data.reason
    db.commit()
    db.refresh(course)
    return course


def get_mentor_courses(db: Session, mentor_id: UUID):
    return db.query(Course).filter(Course.mentor_id == mentor_id).all()


def get_pending_courses(db: Session):
    return db.query(Course).filter(Course.status == CourseStatus.pending).all()


def get_pending_lessons(db: Session):
    """Get all lessons with pending review status across all courses."""
    return db.query(Lesson).filter(
        Lesson.review_status == LessonReviewStatus.pending
    ).all()


def review_lesson(db: Session, lesson_id: UUID, data: LessonReviewUpdate, admin: User) -> Lesson:
    """Admin review a lesson - approve or reject with feedback."""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    lesson.review_status = LessonReviewStatus.approved if data.status == "approved" else LessonReviewStatus.rejected
    lesson.reviewed_by = admin.id
    lesson.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if data.feedback:
        lesson.review_feedback = data.feedback
    
    db.commit()
    db.refresh(lesson)
    return lesson


def get_course_lessons_for_review(db: Session, course_id: UUID) -> list:
    """Get all lessons of a course with their review status for admin review."""
    course = get_course_by_id(db, course_id)
    return course.lessons


def delete_course(db: Session, course_id: UUID, mentor: User) -> dict:
    """Delete a course and all related data. Only the creator or admin can delete.

    Explicitly deletes all dependent records (quizzes, assignments, enrollments)
    before deleting the course itself, providing defense-in-depth beyond ORM cascade.
    Returns a dict with info about what was deleted so the frontend
    can show appropriate feedback.
    """
    course = get_course_by_id(db, course_id)

    # Authorization: only the mentor who created the course (or admin) can delete
    if str(course.mentor_id) != str(mentor.id) and mentor.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your course")

    # Count records for feedback before deletion
    enrollment_count = db.query(Enrollment).filter(
        Enrollment.course_id == course_id
    ).count()
    lesson_count = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).count()
    quiz_count = db.query(Quiz).filter(
        Quiz.course_id == course_id
    ).count()
    assignment_count = db.query(Assignment).filter(
        Assignment.course_id == course_id
    ).count()

    # Explicitly delete all related records to avoid FK constraint issues.
    # The database has ON DELETE CASCADE, but SQLAlchemy's unit of work may
    # not respect it for relationships defined via backref without cascade.
    # This ensures clean deletion regardless of ORM relationship configuration.

    # Delete enrollments
    db.query(Enrollment).filter(
        Enrollment.course_id == course_id
    ).delete(synchronize_session=False)

    # Delete lessons (questions/quiz_attempts cascade from quizzes, submissions from assignments)
    db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).delete(synchronize_session=False)

    # Delete quizzes (questions and quiz_attempts cascade from quiz model)
    db.query(Quiz).filter(
        Quiz.course_id == course_id
    ).delete(synchronize_session=False)

    # Delete assignments (submissions cascade from assignment model)
    db.query(Assignment).filter(
        Assignment.course_id == course_id
    ).delete(synchronize_session=False)

    # Now delete the course itself
    db.delete(course)
    db.commit()

    return {
        "deleted": True,
        "course_id": str(course_id),
        "enrollments_removed": enrollment_count,
        "lessons_removed": lesson_count,
        "quizzes_removed": quiz_count,
        "assignments_removed": assignment_count,
    }


def get_course_enrollment_count(db: Session, course_id: UUID) -> int:
    """Get the number of enrollments for a course."""
    return db.query(Enrollment).filter(
        Enrollment.course_id == course_id
    ).count()