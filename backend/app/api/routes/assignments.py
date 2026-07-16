from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, get_mentor
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.schemas.submission import SubmissionCreate, SubmissionGrade, SubmissionResponse
from app.services.assignment_service import (
    create_assignment,
    get_assignments_for_course,
    submit_assignment,
    grade_submission,
    get_my_submission,
    get_all_submissions,
)

router = APIRouter(prefix="/courses", tags=["Assignments"])


@router.get("/{course_id}/assignments", response_model=list[AssignmentResponse])
def list_assignments(
    course_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_assignments_for_course(db, course_id)


@router.post("/{course_id}/assignments", response_model=AssignmentResponse, status_code=201)
def create(
    course_id: UUID,
    data: AssignmentCreate,
    current_user: User = Depends(get_mentor),
    db: Session = Depends(get_db),
):
    return create_assignment(db, course_id, data, current_user)


@router.post("/{course_id}/assignments/{assignment_id}/submit",
             response_model=SubmissionResponse, status_code=201)
def submit(
    course_id: UUID,
    assignment_id: UUID,
    data: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return submit_assignment(db, assignment_id, data, current_user)


@router.get("/{course_id}/assignments/{assignment_id}/submission/me",
            response_model=SubmissionResponse)
def my_submission(
    course_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = get_my_submission(db, assignment_id, current_user.id)
    if not sub:
        raise HTTPException(status_code=404, detail="No submission found")
    return sub


@router.get("/{course_id}/assignments/{assignment_id}/submissions",
            response_model=list[SubmissionResponse])
def all_submissions(
    course_id: UUID,
    assignment_id: UUID,
    current_user: User = Depends(get_mentor),
    db: Session = Depends(get_db),
):
    return get_all_submissions(db, assignment_id)


@router.put("/{course_id}/assignments/{assignment_id}/submissions/{submission_id}/grade",
            response_model=SubmissionResponse)
def grade(
    course_id: UUID,
    assignment_id: UUID,
    submission_id: UUID,
    data: SubmissionGrade,
    current_user: User = Depends(get_mentor),
    db: Session = Depends(get_db),
):
    return grade_submission(db, submission_id, data, current_user)
