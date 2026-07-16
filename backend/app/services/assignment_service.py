from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from uuid import UUID
import logging

from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.enrollment import Enrollment
from app.models.user import User, UserRole
from app.schemas.assignment import AssignmentCreate
from app.schemas.submission import SubmissionCreate, SubmissionGrade

logger = logging.getLogger(__name__)


def create_assignment(db: Session, course_id: UUID, data: AssignmentCreate, mentor: User) -> Assignment:
    assignment = Assignment(
        course_id=course_id,
        mentor_id=mentor.id,
        title=data.title,
        description=data.description,
        instructions=data.instructions,
        max_score=data.max_score,
        passing_score=data.passing_score,
        deadline=data.deadline,
        late_penalty=data.late_penalty,
        allow_late=data.allow_late,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def get_assignments_for_course(db: Session, course_id: UUID):
    return db.query(Assignment).filter(
        Assignment.course_id == course_id,
        Assignment.is_active == True
    ).all()


def get_assignment_by_id(db: Session, assignment_id: UUID) -> Assignment:
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


def submit_assignment(db: Session, assignment_id: UUID, data: SubmissionCreate, student: User) -> Submission:
    try:
        assignment = get_assignment_by_id(db, assignment_id)

        # Validate that the student is enrolled and approved
        enrollment = db.query(Enrollment).filter(
            Enrollment.course_id == assignment.course_id,
            Enrollment.student_id == student.id,
        ).first()

        if not enrollment:
            raise HTTPException(
                status_code=403,
                detail="You must be enrolled in this course to submit assignments"
            )

        if not enrollment.is_approved:
            raise HTTPException(
                status_code=403,
                detail="Your enrollment is pending approval. Please wait for the mentor to approve."
            )

        existing = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == student.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already submitted this assignment")

        # FIX: Keep 'now' as an Offset-Aware datetime (UTC)
        now = datetime.now(timezone.utc)
        is_late = False
        late_days = 0.0

        if assignment.deadline:
            # Ensure the database deadline is treated as UTC if it's missing tzinfo
            deadline = assignment.deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            
            if now > deadline:
                if not assignment.allow_late:
                    raise HTTPException(
                        status_code=400, 
                        detail="Deadline has passed and late submissions are not allowed"
                    )
                is_late = True
                delta = now - deadline
                late_days = round(delta.total_seconds() / 86400, 2)

        submission = Submission(
            assignment_id=assignment_id,
            student_id=student.id,
            content=data.content,
            file_url=data.file_url,
            file_name=data.file_name,
            is_late=is_late,
            late_days=late_days,
            submitted_at=now  # Ensure we use the aware timestamp here
        )

        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    except HTTPException:
        raise
    except OperationalError as e:
        db.rollback()
        logger.error(f"DB connection error during submission: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Database temporarily unavailable. Please try again in a moment."
        )
    except IntegrityError as e:
        db.rollback()
        logger.error(f"DB integrity error during submission: {e}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail="Submission could not be saved — you may have already submitted this assignment."
        )
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"DB error during submission: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while saving your submission. Please try again."
        )


def grade_submission(db: Session, submission_id: UUID, data: SubmissionGrade, mentor: User) -> Submission:
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    assignment = get_assignment_by_id(db, submission.assignment_id)
    if str(assignment.mentor_id) != str(mentor.id) and mentor.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your assignment")

    if data.score < 0 or data.score > assignment.max_score:
        raise HTTPException(
            status_code=400,
            detail=f"Score must be between 0 and {assignment.max_score}"
        )

    score = data.score
    if submission.is_late and submission.late_days > 0:
        penalty = assignment.late_penalty * submission.late_days
        score = max(0, score - penalty)

    submission.score = round(score, 2)
    submission.feedback = data.feedback
    submission.is_graded = True
    # FIX: Use aware datetime for grading timestamp
    submission.graded_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(submission)

    # Update ranking after grading
    try:
        from app.services.ranking_service import update_user_ranking
        student = submission.student
        if student:
            update_user_ranking(db, student)
    except Exception as e:
        logger.warning(f"Failed to update user ranking: {e}")
        pass

    return submission


def get_my_submission(db: Session, assignment_id: UUID, student_id: UUID):
    return db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == student_id,
    ).first()


def get_all_submissions(db: Session, assignment_id: UUID):
    return db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).all()


def get_course_submissions(db: Session, course_id: UUID):
    """Get all submissions for all assignments in a course — single JOIN query (no N+1)."""
    results = (
        db.query(Submission, Assignment)
        .join(Assignment, Submission.assignment_id == Assignment.id)
        .filter(Assignment.course_id == course_id)
        .all()
    )
    return [{"submission": sub, "assignment": asgn} for sub, asgn in results]