from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, get_mentor, get_student
from app.models.user import User
from app.schemas.quiz import QuizCreate, QuizResponse
from app.schemas.question import QuestionCreate, QuestionResponse, QuestionWithAnswer
from app.schemas.quiz_attempt import QuizSubmit, AttemptResult
from app.services.quiz_service import (
    create_quiz, get_quizzes_for_course, get_quiz_by_id,
    add_question, get_questions,
    submit_quiz, get_my_attempts,
)

router = APIRouter(prefix="/courses", tags=["Quizzes"])


@router.get("/{course_id}/quizzes", response_model=list[QuizResponse])
def list_quizzes(
    course_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all quizzes for a course."""
    quizzes = get_quizzes_for_course(db, course_id)
    for q in quizzes:
        q.question_count = len(q.questions)
    return quizzes


@router.post("/{course_id}/quizzes", response_model=QuizResponse, status_code=201)
def create(
    course_id:    UUID,
    data:         QuizCreate,
    current_user: User    = Depends(get_mentor),
    db:           Session = Depends(get_db),
):
    """Create a quiz for a course — mentor only."""
    return create_quiz(db, course_id, data, current_user)


@router.get("/{course_id}/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    course_id: UUID,
    quiz_id:   UUID,
    db:        Session = Depends(get_db),
    _:         User    = Depends(get_current_user),
):
    """Get a single quiz."""
    return get_quiz_by_id(db, quiz_id)


@router.post("/{course_id}/quizzes/{quiz_id}/questions",
             response_model=QuestionWithAnswer, status_code=201)
def add_question_to_quiz(
    course_id:    UUID,
    quiz_id:      UUID,
    data:         QuestionCreate,
    current_user: User    = Depends(get_mentor),
    db:           Session = Depends(get_db),
):
    """Add a question to a quiz — mentor only."""
    return add_question(db, quiz_id, data, current_user)


@router.get("/{course_id}/quizzes/{quiz_id}/questions",
            response_model=list[QuestionResponse])
def list_questions(
    course_id: UUID,
    quiz_id:   UUID,
    db:        Session = Depends(get_db),
    _:         User    = Depends(get_current_user),
):
    """Get questions for a quiz — correct answers hidden from students."""
    return get_questions(db, quiz_id)


@router.post("/{course_id}/quizzes/{quiz_id}/attempt",
             response_model=AttemptResult, status_code=201)
def attempt_quiz(
    course_id:    UUID,
    quiz_id:      UUID,
    data:         QuizSubmit,
    current_user: User    = Depends(get_student),   # ← fixed: was get_current_user
    db:           Session = Depends(get_db),
):
    """Submit a quiz attempt — students only, auto-graded instantly."""
    return submit_quiz(db, quiz_id, data, current_user)


@router.get("/{course_id}/quizzes/{quiz_id}/attempts/me",
            response_model=list[AttemptResult])
def my_attempts(
    course_id:    UUID,
    quiz_id:      UUID,
    current_user: User    = Depends(get_student),   # ← fixed: was get_current_user
    db:           Session = Depends(get_db),
):
    """Get current student's quiz attempts."""
    return get_my_attempts(db, quiz_id, current_user.id)