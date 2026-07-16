"""
Tests for quizzes API endpoints.
"""
import pytest
import json
from fastapi import status


class TestListQuizzes:
    """Tests for GET /courses/{course_id}/quizzes endpoint."""

    def test_list_quizzes_success(self, client, auth_headers, test_course):
        """Test listing quizzes for a course."""
        response = client.get(
            f"/courses/{test_course.id}/quizzes",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_list_quizzes_unauthenticated(self, client, test_course):
        """Test listing quizzes without auth."""
        response = client.get(f"/courses/{test_course.id}/quizzes")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCreateQuiz:
    """Tests for POST /courses/{course_id}/quizzes endpoint."""

    def test_create_quiz_success(self, client, mentor_auth_headers, test_course):
        """Test creating a quiz as mentor."""
        response = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={
                "title": "Python Basics Quiz",
                "description": "Test your Python knowledge",
                "time_limit": 600,
                "pass_score": 60.0,
                "max_attempts": 3,
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "Python Basics Quiz"
        assert data["time_limit"] == 600
        assert data["pass_score"] == 60.0
        assert data["max_attempts"] == 3

    def test_create_quiz_unauthenticated(self, client, test_course):
        """Test creating quiz without auth."""
        response = client.post(
            f"/courses/{test_course.id}/quizzes",
            json={"title": "No Auth Quiz"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_quiz_student_forbidden(self, client, student_auth_headers, test_course):
        """Test students cannot create quizzes."""
        response = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=student_auth_headers,
            json={"title": "Student Quiz"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_quiz_validation(self, client, mentor_auth_headers, test_course):
        """Test quiz creation validation."""
        response = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "AB"},  # too short
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_quiz_defaults(self, client, mentor_auth_headers, test_course):
        """Test quiz creation with default values."""
        response = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "Default Quiz Test"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["time_limit"] == 0
        assert data["pass_score"] == 50.0
        assert data["max_attempts"] == 3


class TestGetQuiz:
    """Tests for GET /courses/{course_id}/quizzes/{quiz_id} endpoint."""

    def test_get_quiz_success(self, client, mentor_auth_headers, test_course):
        """Test getting a single quiz."""
        # Create quiz
        create_resp = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "Find Me Quiz"},
        )
        quiz_id = create_resp.json()["id"]

        response = client.get(
            f"/courses/{test_course.id}/quizzes/{quiz_id}",
            headers=mentor_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == "Find Me Quiz"

    def test_get_quiz_not_found(self, client, auth_headers, test_course):
        """Test getting non-existent quiz."""
        response = client.get(
            f"/courses/{test_course.id}/quizzes/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAddQuestion:
    """Tests for POST /courses/{course_id}/quizzes/{quiz_id}/questions endpoint."""

    def test_add_question_success(self, client, mentor_auth_headers, test_course):
        """Test adding a question to a quiz."""
        # Create quiz
        quiz_resp = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "Question Quiz"},
        )
        quiz_id = quiz_resp.json()["id"]

        response = client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/questions",
            headers=mentor_auth_headers,
            json={
                "text": "What is the capital of France?",
                "option_a": "London",
                "option_b": "Paris",
                "option_c": "Berlin",
                "option_d": "Madrid",
                "correct_option": "b",
                "explanation": "Paris is the capital",
                "points": 1,
                "order": 1,
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["text"] == "What is the capital of France?"
        assert data["correct_option"] == "b"

    def test_add_question_student_forbidden(self, client, student_auth_headers, mentor_auth_headers, test_course):
        """Test students cannot add questions."""
        quiz_resp = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "No Student Q"},
        )
        quiz_id = quiz_resp.json()["id"]

        response = client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/questions",
            headers=student_auth_headers,
            json={
                "text": "Test question here",
                "option_a": "A",
                "option_b": "B",
                "correct_option": "a",
            },
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestListQuestions:
    """Tests for GET /courses/{course_id}/quizzes/{quiz_id}/questions endpoint."""

    def test_list_questions_success(self, client, mentor_auth_headers, test_course):
        """Test listing questions for a quiz."""
        # Create quiz and add question
        quiz_resp = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "List Q Quiz"},
        )
        quiz_id = quiz_resp.json()["id"]

        client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/questions",
            headers=mentor_auth_headers,
            json={
                "text": "Sample question here",
                "option_a": "A",
                "option_b": "B",
                "correct_option": "a",
            },
        )

        response = client.get(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/questions",
            headers=mentor_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_list_questions_unauthenticated(self, client, test_course):
        """Test listing questions without auth."""
        response = client.get(
            f"/courses/{test_course.id}/quizzes/fake-id/questions",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestAttemptQuiz:
    """Tests for POST /courses/{course_id}/quizzes/{quiz_id}/attempt endpoint."""

    def test_attempt_quiz_success(self, client, auth_headers, mentor_auth_headers, test_course):
        """Test submitting a quiz attempt."""
        # Create quiz
        quiz_resp = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "Attempt Quiz"},
        )
        quiz_id = quiz_resp.json()["id"]

        # Add question
        q_resp = client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/questions",
            headers=mentor_auth_headers,
            json={
                "text": "What is 2+2?",
                "option_a": "3",
                "option_b": "4",
                "correct_option": "b",
                "points": 1,
                "order": 1,
            },
        )
        question_id = q_resp.json()["id"]

        # Attempt quiz
        response = client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/attempt",
            headers=auth_headers,
            json={
                "answers": {question_id: "b"},
                "time_taken": 60,
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["score"] == 100.0
        assert data["passed"] is True

    def test_attempt_quiz_wrong_answer(self, client, auth_headers, mentor_auth_headers, test_course):
        """Test quiz attempt with wrong answer."""
        quiz_resp = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "Wrong Answer Quiz"},
        )
        quiz_id = quiz_resp.json()["id"]

        q_resp = client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/questions",
            headers=mentor_auth_headers,
            json={
                "text": "What is 2+2?",
                "option_a": "3",
                "option_b": "4",
                "correct_option": "b",
                "points": 1,
                "order": 1,
            },
        )
        question_id = q_resp.json()["id"]

        response = client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/attempt",
            headers=auth_headers,
            json={
                "answers": {question_id: "a"},  # wrong
                "time_taken": 30,
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["score"] == 0.0
        assert data["passed"] is False

    def test_attempt_quiz_unauthenticated(self, client, test_course):
        """Test quiz attempt without auth."""
        response = client.post(
            f"/courses/{test_course.id}/quizzes/fake-id/attempt",
            json={"answers": {}, "time_taken": 0},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestMyAttempts:
    """Tests for GET /courses/{course_id}/quizzes/{quiz_id}/attempts/me endpoint."""

    def test_my_attempts_success(self, client, auth_headers, mentor_auth_headers, test_course):
        """Test getting own quiz attempts."""
        # Create quiz and question
        quiz_resp = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "My Attempts Quiz"},
        )
        quiz_id = quiz_resp.json()["id"]

        q_resp = client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/questions",
            headers=mentor_auth_headers,
            json={
                "text": "Sample question here",
                "option_a": "A",
                "option_b": "B",
                "correct_option": "a",
                "points": 1,
                "order": 1,
            },
        )
        question_id = q_resp.json()["id"]

        # Make an attempt
        client.post(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/attempt",
            headers=auth_headers,
            json={"answers": {question_id: "a"}, "time_taken": 45},
        )

        # Get attempts
        response = client.get(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/attempts/me",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_my_attempts_empty(self, client, mentor_auth_headers, test_course):
        """Test getting attempts when none exist."""
        quiz_resp = client.post(
            f"/courses/{test_course.id}/quizzes",
            headers=mentor_auth_headers,
            json={"title": "Empty Attempts Quiz"},
        )
        quiz_id = quiz_resp.json()["id"]

        response = client.get(
            f"/courses/{test_course.id}/quizzes/{quiz_id}/attempts/me",
            headers=mentor_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data == []

    def test_my_attempts_unauthenticated(self, client, test_course):
        """Test getting attempts without auth."""
        response = client.get(
            f"/courses/{test_course.id}/quizzes/fake-id/attempts/me",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
