from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from uuid import UUID
import logging

from app.models.quiz import Quiz
from app.models.question import Question
from app.models.quiz_attempt import QuizAttempt
from app.models.enrollment import Enrollment
from app.models.user import User, UserRole
from app.schemas.quiz import QuizCreate
from app.schemas.question import QuestionCreate
from app.schemas.quiz_attempt import QuizSubmit

logger = logging.getLogger(__name__)


def create_quiz(db: Session, course_id: UUID, data: QuizCreate, mentor: User) -> Quiz:
    quiz = Quiz(
        course_id=course_id,
        mentor_id=mentor.id,
        title=data.title,
        description=data.description,
        time_limit=data.time_limit,
        pass_score=data.pass_score,
        max_attempts=data.max_attempts,
        randomize=data.randomize,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


def get_quizzes_for_course(db: Session, course_id: UUID):
    quizzes = db.query(Quiz).filter(
        Quiz.course_id == course_id,
        Quiz.is_active == True
    ).all()
    for q in quizzes:
        q.question_count = len(q.questions)
    return quizzes


def get_quiz_by_id(db: Session, quiz_id: UUID) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


def add_question(db: Session, quiz_id: UUID, data: QuestionCreate, mentor: User) -> Question:
    quiz = get_quiz_by_id(db, quiz_id)
    if str(quiz.mentor_id) != str(mentor.id) and mentor.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your quiz")

    question = Question(
        quiz_id=quiz_id,
        text=data.text,
        option_a=data.option_a,
        option_b=data.option_b,
        option_c=data.option_c,
        option_d=data.option_d,
        correct_option=data.correct_option,
        explanation=data.explanation,
        points=data.points,
        order=data.order,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def get_questions(db: Session, quiz_id: UUID):
    """Return questions for a quiz. Correct answers are excluded from the
    ORM objects by Pydantic serialization (QuestionResponse schema)."""
    return db.query(Question).filter(
        Question.quiz_id == quiz_id
    ).order_by(Question.order).all()


def submit_quiz(db: Session, quiz_id: UUID, data: QuizSubmit, student: User) -> QuizAttempt:
    quiz = get_quiz_by_id(db, quiz_id)

    # Validate that the student is enrolled in the course
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == quiz.course_id,
        Enrollment.student_id == student.id,
    ).first()
    if not enrollment:
        raise HTTPException(
            status_code=403,
            detail="You must be enrolled in this course to take the quiz"
        )

    if quiz.max_attempts > 0:
        attempt_count = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.student_id == student.id,
        ).count()
        if attempt_count >= quiz.max_attempts:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum attempts ({quiz.max_attempts}) reached"
            )

    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    if not questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")

    # Validate that all submitted answers belong to this quiz
    valid_question_ids = {str(q.id) for q in questions}
    for question_id in data.answers.keys():
        if question_id not in valid_question_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid question ID: {question_id}"
            )

    total_points  = sum(q.points for q in questions)
    earned_points = 0

    for question in questions:
        answer = data.answers.get(str(question.id), "").lower()
        if answer == question.correct_option.lower():
            earned_points += question.points

    score  = (earned_points / total_points * 100) if total_points > 0 else 0
    passed = score >= quiz.pass_score

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=student.id,
        answers=data.answers,
        score=round(score, 2),
        total_points=total_points,
        earned_points=earned_points,
        passed=passed,
        time_taken=data.time_taken,
        submitted_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )

    try:
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
    except OperationalError as e:
        db.rollback()
        logger.error(f"Database connection error during quiz submission: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Database temporarily unavailable. Please try again in a moment."
        )
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error during quiz submission: {e}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail="Quiz submission could not be saved due to a data conflict."
        )
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during quiz submission: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while saving your quiz submission. Please try again."
        )

    # Update ranking after quiz submission
    try:
        from app.services.ranking_service import update_user_ranking
        update_user_ranking(db, student)
    except Exception:
        pass  # don't fail the quiz if ranking update fails

    return attempt


def get_my_attempts(db: Session, quiz_id: UUID, student_id: UUID):
    return db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == student_id,
    ).order_by(QuizAttempt.submitted_at.desc()).all()


def get_best_score(db: Session, quiz_id: UUID, student_id: UUID) -> float:
    attempts = get_my_attempts(db, quiz_id, student_id)
    if not attempts:
        return 0.0
    return max(a.score for a in attempts)