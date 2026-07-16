"""
Tests for quiz service functions.
"""
import pytest
import json
from uuid import uuid4
from fastapi import HTTPException

from app.services.quiz_service import (
    create_quiz,
    get_quizzes_for_course,
    get_quiz_by_id,
    add_question,
    get_questions,
    submit_quiz,
    get_my_attempts,
    get_best_score,
)
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.quiz_attempt import QuizAttempt
from app.models.user import User, UserRole


# --- Helper data classes ---

class FakeQuizCreate:
    def __init__(self, title="Test Quiz", description=None, time_limit=0,
                 pass_score=50.0, max_attempts=3, randomize=False):
        self.title = title
        self.description = description
        self.time_limit = time_limit
        self.pass_score = pass_score
        self.max_attempts = max_attempts
        self.randomize = randomize


class FakeQuestionCreate:
    def __init__(self, text="What is 2+2?", option_a="3", option_b="4",
                 option_c="5", option_d="6", correct_option="b",
                 explanation="Basic math", points=1, order=0):
        self.text = text
        self.option_a = option_a
        self.option_b = option_b
        self.option_c = option_c
        self.option_d = option_d
        self.correct_option = correct_option
        self.explanation = explanation
        self.points = points
        self.order = order


class FakeQuizSubmit:
    def __init__(self, answers=None, time_taken=60):
        self.answers = answers or {}
        self.time_taken = time_taken


# --- Helper fixtures ---

@pytest.fixture
def test_quiz(db, test_users, test_course):
    """Create a test quiz."""
    quiz = Quiz(
        course_id=test_course.id,
        mentor_id=test_users["mentor"].id,
        title="Test Quiz",
        description="A test quiz",
        time_limit=300,
        pass_score=50.0,
        max_attempts=3,
        is_active=True,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


@pytest.fixture
def test_question(db, test_quiz):
    """Create a test question."""
    question = Question(
        quiz_id=test_quiz.id,
        text="What is the capital of France?",
        option_a="London",
        option_b="Paris",
        option_c="Berlin",
        option_d="Madrid",
        correct_option="b",
        explanation="Paris is the capital of France",
        points=1,
        order=1,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


# --- Tests ---

class TestCreateQuiz:
    """Tests for create_quiz function."""

    def test_create_quiz_success(self, db, test_users, test_course):
        """Test creating a quiz."""
        mentor = test_users["mentor"]
        data = FakeQuizCreate(
            title="Python Quiz",
            description="Test your Python knowledge",
            time_limit=600,
            pass_score=60.0,
            max_attempts=5,
        )
        quiz = create_quiz(db, test_course.id, data, mentor)

        assert quiz.title == "Python Quiz"
        assert quiz.description == "Test your Python knowledge"
        assert quiz.time_limit == 600
        assert quiz.pass_score == 60.0
        assert quiz.max_attempts == 5
        assert quiz.course_id == test_course.id
        assert quiz.mentor_id == mentor.id
        assert quiz.is_active is True

    def test_create_quiz_defaults(self, db, test_users, test_course):
        """Test creating a quiz with default values."""
        mentor = test_users["mentor"]
        data = FakeQuizCreate(title="Default Quiz")
        quiz = create_quiz(db, test_course.id, data, mentor)

        assert quiz.time_limit == 0
        assert quiz.pass_score == 50.0
        assert quiz.max_attempts == 3
        assert quiz.randomize is False


class TestGetQuizzesForCourse:
    """Tests for get_quizzes_for_course function."""

    def test_get_quizzes_active_only(self, db, test_users, test_course):
        """Test that only active quizzes are returned."""
        mentor = test_users["mentor"]
        active_quiz = Quiz(
            course_id=test_course.id,
            mentor_id=mentor.id,
            title="Active Quiz",
            is_active=True,
        )
        inactive_quiz = Quiz(
            course_id=test_course.id,
            mentor_id=mentor.id,
            title="Inactive Quiz",
            is_active=False,
        )
        db.add(active_quiz)
        db.add(inactive_quiz)
        db.commit()

        quizzes = get_quizzes_for_course(db, test_course.id)
        titles = [q.title for q in quizzes]
        assert "Active Quiz" in titles
        assert "Inactive Quiz" not in titles

    def test_get_quizzes_empty_course(self, db, test_course):
        """Test getting quizzes for a course with none."""
        quizzes = get_quizzes_for_course(db, test_course.id)
        assert quizzes == []


class TestGetQuizById:
    """Tests for get_quiz_by_id function."""

    def test_get_quiz_success(self, db, test_quiz):
        """Test getting a quiz by ID."""
        found = get_quiz_by_id(db, test_quiz.id)
        assert found.id == test_quiz.id
        assert found.title == "Test Quiz"

    def test_get_quiz_not_found(self, db):
        """Test getting a non-existent quiz raises 404."""
        with pytest.raises(HTTPException) as exc_info:
            get_quiz_by_id(db, uuid4())
        assert exc_info.value.status_code == 404
        assert "Quiz not found" in exc_info.value.detail


class TestAddQuestion:
    """Tests for add_question function."""

    def test_add_question_success(self, db, test_users, test_quiz):
        """Test adding a question to a quiz."""
        mentor = test_users["mentor"]
        data = FakeQuestionCreate()
        question = add_question(db, test_quiz.id, data, mentor)

        assert question.text == "What is 2+2?"
        assert question.option_a == "3"
        assert question.option_b == "4"
        assert question.correct_option == "b"
        assert question.explanation == "Basic math"
        assert question.quiz_id == test_quiz.id

    def test_add_question_unauthorized(self, db, test_users, test_quiz):
        """Test that another mentor cannot add questions."""
        other_mentor = User(
            name="Other Mentor",
            email="other_quiz_mentor@test.com",
            password_hash="hash",
            role=UserRole.mentor,
            is_active=True,
        )
        db.add(other_mentor)
        db.commit()

        data = FakeQuestionCreate()
        with pytest.raises(HTTPException) as exc_info:
            add_question(db, test_quiz.id, data, other_mentor)
        assert exc_info.value.status_code == 403
        assert "Not your quiz" in exc_info.value.detail

    def test_add_question_admin_allowed(self, db, test_users, test_quiz):
        """Test that admin can add questions to any quiz."""
        admin = test_users["admin"]
        data = FakeQuestionCreate(text="Admin question here")
        question = add_question(db, test_quiz.id, data, admin)

        assert question.text == "Admin question here"

    def test_add_question_quiz_not_found(self, db, test_users):
        """Test adding question to non-existent quiz raises 404."""
        mentor = test_users["mentor"]
        data = FakeQuestionCreate()
        with pytest.raises(HTTPException) as exc_info:
            add_question(db, uuid4(), data, mentor)
        assert exc_info.value.status_code == 404


class TestGetQuestions:
    """Tests for get_questions function."""

    def test_get_questions_ordered(self, db, test_quiz):
        """Test that questions are returned in order."""
        for i in range(3):
            q = Question(
                quiz_id=test_quiz.id,
                text=f"Question {i+1}",
                option_a="A",
                option_b="B",
                correct_option="a",
                points=1,
                order=i + 1,
            )
            db.add(q)
        db.commit()

        questions = get_questions(db, test_quiz.id)
        assert len(questions) == 3
        assert questions[0].order <= questions[1].order <= questions[2].order

    def test_get_questions_empty(self, db, test_quiz):
        """Test getting questions when quiz has none."""
        questions = get_questions(db, test_quiz.id)
        assert questions == []


class TestSubmitQuiz:
    """Tests for submit_quiz function."""

    def test_submit_quiz_all_correct(self, db, test_users, test_course, test_quiz, test_question, test_enrollment):
        """Test submitting quiz with all correct answers."""
        student = test_users["student"]
        answers = {str(test_question.id): "b"}
        data = FakeQuizSubmit(answers=answers, time_taken=120)

        attempt = submit_quiz(db, test_quiz.id, data, student)

        assert attempt.score == 100.0
        assert attempt.passed is True
        assert attempt.earned_points == 1
        assert attempt.total_points == 1
        assert attempt.time_taken == 120

    def test_submit_quiz_all_wrong(self, db, test_users, test_course, test_quiz, test_question, test_enrollment):
        """Test submitting quiz with all wrong answers."""
        student = test_users["student"]
        answers = {str(test_question.id): "a"}  # wrong answer
        data = FakeQuizSubmit(answers=answers, time_taken=60)

        attempt = submit_quiz(db, test_quiz.id, data, student)

        assert attempt.score == 0.0
        assert attempt.passed is False
        assert attempt.earned_points == 0

    def test_submit_quiz_partial_correct(self, db, test_users, test_course, test_quiz, test_enrollment):
        """Test submitting quiz with partial correct answers."""
        student = test_users["student"]
        mentor = test_users["mentor"]

        # Add two questions
        q1 = Question(
            quiz_id=test_quiz.id,
            text="Q1",
            option_a="A",
            option_b="B",
            correct_option="a",
            points=1,
            order=1,
        )
        q2 = Question(
            quiz_id=test_quiz.id,
            text="Q2",
            option_a="A",
            option_b="B",
            correct_option="b",
            points=1,
            order=2,
        )
        db.add(q1)
        db.add(q2)
        db.commit()

        answers = {str(q1.id): "a", str(q2.id): "a"}  # first correct, second wrong
        data = FakeQuizSubmit(answers=answers)
        attempt = submit_quiz(db, test_quiz.id, data, student)

        assert attempt.score == 50.0
        assert attempt.earned_points == 1
        assert attempt.total_points == 2

    def test_submit_quiz_max_attempts_reached(self, db, test_users, test_course, test_quiz, test_question, test_enrollment):
        """Test that exceeding max attempts raises error."""
        student = test_users["student"]

        # Create max_attempts existing attempts
        for _ in range(test_quiz.max_attempts):
            attempt = QuizAttempt(
                quiz_id=test_quiz.id,
                student_id=student.id,
                answers={str(test_question.id): "a"},
                score=0.0,
                total_points=1,
                earned_points=0,
                passed=False,
            )
            db.add(attempt)
        db.commit()

        answers = {str(test_question.id): "b"}
        data = FakeQuizSubmit(answers=answers)
        with pytest.raises(HTTPException) as exc_info:
            submit_quiz(db, test_quiz.id, data, student)
        assert exc_info.value.status_code == 400
        assert "Maximum attempts" in exc_info.value.detail

    def test_submit_quiz_no_questions(self, db, test_users, test_course, test_enrollment):
        """Test submitting a quiz with no questions raises error."""
        student = test_users["student"]
        mentor = test_users["mentor"]

        quiz = Quiz(
            course_id=test_course.id,
            mentor_id=mentor.id,
            title="Empty Quiz",
        )
        db.add(quiz)
        db.commit()

        data = FakeQuizSubmit(answers={})
        with pytest.raises(HTTPException) as exc_info:
            submit_quiz(db, quiz.id, data, student)
        assert exc_info.value.status_code == 400
        assert "no questions" in exc_info.value.detail

    def test_submit_quiz_invalid_question_id(self, db, test_users, test_course, test_quiz, test_question, test_enrollment):
        """Test submitting with invalid question ID raises error."""
        student = test_users["student"]
        fake_id = str(uuid4())
        answers = {fake_id: "b"}
        data = FakeQuizSubmit(answers=answers)

        with pytest.raises(HTTPException) as exc_info:
            submit_quiz(db, test_quiz.id, data, student)
        assert exc_info.value.status_code == 400
        assert "Invalid question ID" in exc_info.value.detail

    def test_submit_quiz_unlimited_attempts(self, db, test_users, test_course, test_enrollment):
        """Test quiz with unlimited attempts (max_attempts=0)."""
        mentor = test_users["mentor"]
        student = test_users["student"]

        quiz = Quiz(
            course_id=test_course.id,
            mentor_id=mentor.id,
            title="Unlimited Quiz",
            max_attempts=0,
        )
        db.add(quiz)
        db.commit()

        q = Question(
            quiz_id=quiz.id,
            text="Q",
            option_a="A",
            option_b="B",
            correct_option="a",
            points=1,
            order=1,
        )
        db.add(q)
        db.commit()

        # Should allow multiple attempts
        for _ in range(5):
            data = FakeQuizSubmit(answers={str(q.id): "a"})
            submit_quiz(db, quiz.id, data, student)

        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.student_id == student.id,
        ).all()
        assert len(attempts) == 5

    def test_submit_quiz_pass_score_boundary(self, db, test_users, test_course, test_enrollment):
        """Test quiz scoring at exact pass_score boundary."""
        mentor = test_users["mentor"]
        student = test_users["student"]

        quiz = Quiz(
            course_id=test_course.id,
            mentor_id=mentor.id,
            title="Boundary Quiz",
            pass_score=50.0,
        )
        db.add(quiz)
        db.commit()

        # Two questions, each worth 1 point
        q1 = Question(quiz_id=quiz.id, text="Q1", option_a="A", option_b="B", correct_option="a", points=1, order=1)
        q2 = Question(quiz_id=quiz.id, text="Q2", option_a="A", option_b="B", correct_option="b", points=1, order=2)
        db.add(q1)
        db.add(q2)
        db.commit()

        # One correct, one wrong = 50% = exactly at pass_score
        data = FakeQuizSubmit(answers={str(q1.id): "a", str(q2.id): "a"})
        attempt = submit_quiz(db, quiz.id, data, student)

        assert attempt.score == 50.0
        assert attempt.passed is True

    def test_submit_quiz_just_below_pass_score(self, db, test_users, test_course, test_enrollment):
        """Test quiz scoring just below pass_score."""
        mentor = test_users["mentor"]
        student = test_users["student"]

        quiz = Quiz(
            course_id=test_course.id,
            mentor_id=mentor.id,
            title="Fail Quiz",
            pass_score=60.0,
        )
        db.add(quiz)
        db.commit()

        q1 = Question(quiz_id=quiz.id, text="Q1", option_a="A", option_b="B", correct_option="a", points=1, order=1)
        q2 = Question(quiz_id=quiz.id, text="Q2", option_a="A", option_b="B", correct_option="b", points=1, order=2)
        db.add(q1)
        db.add(q2)
        db.commit()

        # One correct, one wrong = 50% < 60%
        data = FakeQuizSubmit(answers={str(q1.id): "a", str(q2.id): "a"})
        attempt = submit_quiz(db, quiz.id, data, student)

        assert attempt.score == 50.0
        assert attempt.passed is False


class TestGetMyAttempts:
    """Tests for get_my_attempts function."""

    def test_get_my_attempts_returns_all(self, db, test_users, test_quiz, test_question):
        """Test getting all attempts for a student."""
        student = test_users["student"]
        for i in range(3):
            attempt = QuizAttempt(
                quiz_id=test_quiz.id,
                student_id=student.id,
                answers=json.dumps({str(test_question.id): "a"}),
                score=float(i * 10),
                total_points=1,
                earned_points=i,
                passed=i > 0,
            )
            db.add(attempt)
        db.commit()

        attempts = get_my_attempts(db, test_quiz.id, student.id)
        assert len(attempts) == 3

    def test_get_my_attempts_empty(self, db, test_users, test_quiz):
        """Test getting attempts when none exist."""
        student = test_users["student"]
        attempts = get_my_attempts(db, test_quiz.id, student.id)
        assert attempts == []


class TestGetBestScore:
    """Tests for get_best_score function."""

    def test_get_best_score_multiple_attempts(self, db, test_users, test_quiz, test_question):
        """Test getting best score from multiple attempts."""
        student = test_users["student"]
        scores = [30.0, 80.0, 50.0]
        for score in scores:
            attempt = QuizAttempt(
                quiz_id=test_quiz.id,
                student_id=student.id,
                answers=json.dumps({}),
                score=score,
                total_points=1,
                earned_points=0,
                passed=False,
            )
            db.add(attempt)
        db.commit()

        best = get_best_score(db, test_quiz.id, student.id)
        assert best == 80.0

    def test_get_best_score_no_attempts(self, db, test_users, test_quiz):
        """Test getting best score with no attempts returns 0."""
        student = test_users["student"]
        best = get_best_score(db, test_quiz.id, student.id)
        assert best == 0.0

    def test_get_best_score_single_attempt(self, db, test_users, test_quiz, test_question):
        """Test getting best score with single attempt."""
        student = test_users["student"]
        attempt = QuizAttempt(
            quiz_id=test_quiz.id,
            student_id=student.id,
            answers=json.dumps({}),
            score=75.0,
            total_points=1,
            earned_points=0,
            passed=True,
        )
        db.add(attempt)
        db.commit()

        best = get_best_score(db, test_quiz.id, student.id)
        assert best == 75.0
