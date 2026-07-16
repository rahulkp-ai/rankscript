"""
Tests for assignments API endpoints.
"""
import pytest
from fastapi import status
from datetime import datetime, timedelta, timezone


class TestListAssignments:
    """Tests for GET /courses/{course_id}/assignments endpoint."""

    def test_list_assignments_success(self, client, auth_headers, test_course):
        """Test listing assignments for a course."""
        response = client.get(
            f"/courses/{test_course.id}/assignments",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_list_assignments_unauthenticated(self, client, test_course):
        """Test listing assignments without auth."""
        response = client.get(f"/courses/{test_course.id}/assignments")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCreateAssignment:
    """Tests for POST /courses/{course_id}/assignments endpoint."""

    def test_create_assignment_success(self, client, mentor_auth_headers, test_course):
        """Test creating an assignment as mentor."""
        response = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={
                "title": "Python Homework",
                "description": "Complete exercises",
                "instructions": "Use Python 3",
                "max_score": 100.0,
                "passing_score": 50.0,
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "Python Homework"
        assert data["max_score"] == 100.0
        assert data["passing_score"] == 50.0

    def test_create_assignment_unauthenticated(self, client, test_course):
        """Test creating assignment without auth."""
        response = client.post(
            f"/courses/{test_course.id}/assignments",
            json={"title": "No Auth Assignment"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_assignment_student_forbidden(self, client, student_auth_headers, test_course):
        """Test that students cannot create assignments."""
        response = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=student_auth_headers,
            json={"title": "Student Assignment"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_assignment_validation(self, client, mentor_auth_headers, test_course):
        """Test assignment creation validation."""
        response = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "AB"},  # too short
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_assignment_with_deadline(self, client, mentor_auth_headers, test_course):
        """Test creating assignment with deadline."""
        deadline = (datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)).isoformat()
        response = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={
                "title": "Timed Assignment",
                "deadline": deadline,
                "allow_late": True,
                "late_penalty": 15.0,
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["allow_late"] is True
        assert data["late_penalty"] == 15.0


class TestSubmitAssignment:
    """Tests for POST /courses/{course_id}/assignments/{assignment_id}/submit endpoint."""

    def test_submit_success(self, client, student_auth_headers, mentor_auth_headers, test_course, test_enrollment):
        """Test submitting an assignment."""
        # Create assignment
        create_resp = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "Submit Test Assignment"},
        )
        assignment_id = create_resp.json()["id"]

        # Submit as student
        response = client.post(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submit",
            headers=student_auth_headers,
            json={"content": "My answer"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["content"] == "My answer"
        assert data["is_graded"] is False

    def test_submit_unauthenticated(self, client, test_course):
        """Test submitting without auth."""
        response = client.post(
            f"/courses/{test_course.id}/assignments/fake-id/submit",
            json={"content": "answer"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_submit_without_enrollment(self, client, student_auth_headers, mentor_auth_headers, test_course):
        """Test that unenrolled students cannot submit."""
        create_resp = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "Enrollment Required"},
        )
        assignment_id = create_resp.json()["id"]

        response = client.post(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submit",
            headers=student_auth_headers,
            json={"content": "My answer"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "enrolled" in response.json()["detail"].lower()


class TestGetMySubmission:
    """Tests for GET /courses/{course_id}/assignments/{assignment_id}/submission/me endpoint."""

    def test_get_my_submission_success(self, client, student_auth_headers, mentor_auth_headers, test_course, test_enrollment):
        """Test getting own submission."""
        # Create assignment
        create_resp = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "Get Submission Test"},
        )
        assignment_id = create_resp.json()["id"]

        # Submit as student
        client.post(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submit",
            headers=student_auth_headers,
            json={"content": "My work"},
        )

        # Get submission
        response = client.get(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submission/me",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["content"] == "My work"

    def test_get_my_submission_not_found(self, client, student_auth_headers, mentor_auth_headers, test_course, test_enrollment):
        """Test getting submission when none exists."""
        create_resp = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "No Submission"},
        )
        assignment_id = create_resp.json()["id"]

        response = client.get(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submission/me",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAllSubmissions:
    """Tests for GET /courses/{course_id}/assignments/{assignment_id}/submissions endpoint."""

    def test_all_submissions_mentor_access(self, client, mentor_auth_headers, test_course):
        """Test mentor can view all submissions."""
        create_resp = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "View All Submissions"},
        )
        assignment_id = create_resp.json()["id"]

        response = client.get(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submissions",
            headers=mentor_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_all_submissions_student_forbidden(self, client, student_auth_headers, mentor_auth_headers, test_course):
        """Test students cannot view all submissions."""
        create_resp = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "Student Cannot View All"},
        )
        assignment_id = create_resp.json()["id"]

        response = client.get(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submissions",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestGradeSubmission:
    """Tests for PUT /courses/{course_id}/assignments/{assignment_id}/submissions/{submission_id}/grade endpoint."""

    def test_grade_success(self, client, student_auth_headers, mentor_auth_headers, test_course, test_enrollment):
        """Test grading a submission."""
        # Create assignment
        create_resp = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "Grade Test"},
        )
        assignment_id = create_resp.json()["id"]

        # Submit as student
        submit_resp = client.post(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submit",
            headers=student_auth_headers,
            json={"content": "My work"},
        )
        submission_id = submit_resp.json()["id"]

        # Grade as mentor
        response = client.put(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submissions/{submission_id}/grade",
            headers=mentor_auth_headers,
            json={"score": 85.0, "feedback": "Good work"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["score"] == 85.0
        assert data["feedback"] == "Good work"
        assert data["is_graded"] is True

    def test_grade_student_forbidden(self, client, student_auth_headers, mentor_auth_headers, test_course):
        """Test students cannot grade submissions."""
        create_resp = client.post(
            f"/courses/{test_course.id}/assignments",
            headers=mentor_auth_headers,
            json={"title": "No Student Grading"},
        )
        assignment_id = create_resp.json()["id"]

        response = client.put(
            f"/courses/{test_course.id}/assignments/{assignment_id}/submissions/fake-id/grade",
            headers=student_auth_headers,
            json={"score": 50.0},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
