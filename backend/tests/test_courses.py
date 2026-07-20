"""
Tests for courses API endpoints.
"""
import pytest
from fastapi import status


class TestGetCourses:
    """Tests for GET /courses endpoint."""

    def test_get_courses_success(self, client, test_course):
        """Test getting all approved courses."""
        response = client.get("/courses")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "courses" in data
        assert "total" in data
        assert isinstance(data["courses"], list)

    def test_get_courses_returns_approved_only(self, client, db, test_users):
        """Test that only approved courses are returned."""
        # Create a draft course
        from app.models.course import Course, CourseStatus, CourseLevel
        draft_course = Course(
            mentor_id=test_users["mentor"].id,
            title="Draft Course",
            status=CourseStatus.draft,
            level=CourseLevel.beginner,
        )
        db.add(draft_course)
        db.commit()
        
        response = client.get("/courses")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Draft course should not be in the list
        course_titles = [c["title"] for c in data["courses"]]
        assert "Draft Course" not in course_titles


class TestGetCourseById:
    """Tests for GET /courses/{course_id} endpoint."""

    def test_get_course_by_id_success(self, client, test_course):
        """Test getting a single course by ID."""
        response = client.get(f"/courses/{test_course.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(test_course.id)
        assert data["title"] == test_course.title

    def test_get_course_by_id_not_found(self, client):
        """Test getting a non-existent course."""
        response = client.get("/courses/00000000-0000-0000-0000-000000000000")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestGetMyCourses:
    """Tests for GET /courses/my endpoint (mentor's courses)."""

    def test_get_my_courses_success(self, client, mentor_auth_headers, test_course):
        """Test mentor getting their own courses."""
        response = client.get("/courses/my", headers=mentor_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_my_courses_unauthenticated(self, client):
        """Test getting courses without authentication."""
        response = client.get("/courses/my")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_student_cannot_get_my_courses(self, client, student_auth_headers):
        """Test that students cannot access this endpoint."""
        response = client.get("/courses/my", headers=student_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCreateCourse:
    """Tests for POST /courses endpoint."""

    def test_create_course_success(self, client, mentor_auth_headers):
        """Test mentor creating a new course."""
        response = client.post(
            "/courses",
            headers=mentor_auth_headers,
            json={
                "title": "New Course",
                "description": "Course description",
                "level": "beginner",
                "is_gated": False,
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "New Course"
        assert data["status"] == "pending"

    def test_create_course_unauthenticated(self, client):
        """Test creating course without authentication."""
        response = client.post(
            "/courses",
            json={
                "title": "New Course",
                "level": "beginner",
            }
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_course_validation(self, client, mentor_auth_headers):
        """Test course creation validation."""
        # Test with missing required fields
        response = client.post(
            "/courses",
            headers=mentor_auth_headers,
            json={"level": "beginner"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestCourseLessons:
    """Tests for course lessons endpoints."""

    def test_get_course_lessons(self, client, mentor_auth_headers, test_course, test_lesson):
        """Test getting lessons for a course."""
        response = client.get(f"/courses/{test_course.id}/lessons", headers=mentor_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_add_lesson_to_course(self, client, mentor_auth_headers, test_course):
        """Test adding a lesson to a course."""
        response = client.post(
            f"/courses/{test_course.id}/lessons",
            headers=mentor_auth_headers,
            json={
                "title": "New Lesson",
                "description": "Lesson description",
                "youtube_url": "https://www.youtube.com/watch?v=test",
                "duration": 600,
                "order": 3,
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "New Lesson"


class TestPendingCourses:
    """Tests for pending courses endpoint (admin only)."""

    def test_get_pending_courses_admin(self, client, auth_headers):
        """Test admin getting pending courses."""
        response = client.get("/courses/pending", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_get_pending_courses_mentor_forbidden(self, client, mentor_auth_headers):
        """Test mentor cannot access pending courses."""
        response = client.get("/courses/pending", headers=mentor_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_pending_courses_student_forbidden(self, client, student_auth_headers):
        """Test student cannot access pending courses."""
        response = client.get("/courses/pending", headers=student_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCourseApproval:
    """Tests for course approval endpoint (admin only)."""

    def test_approve_course_admin(self, client, auth_headers, db, test_users):
        """Test admin approving a course."""
        from app.models.course import Course, CourseStatus, CourseLevel
        
        # Create a pending course
        course = Course(
            mentor_id=test_users["mentor"].id,
            title="Pending Course",
            status=CourseStatus.pending,
            level=CourseLevel.beginner,
        )
        db.add(course)
        db.commit()
        db.refresh(course)
        
        response = client.put(
            f"/courses/{course.id}/approve",
            headers=auth_headers,
            json={"status": "approved"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "approved"

    def test_approve_course_unauthorized(self, client, mentor_auth_headers, db, test_users):
        """Test mentor cannot approve courses."""
        from app.models.course import Course, CourseStatus, CourseLevel
        
        course = Course(
            mentor_id=test_users["mentor"].id,
            title="Course to Approve",
            status=CourseStatus.pending,
            level=CourseLevel.beginner,
        )
        db.add(course)
        db.commit()
        db.refresh(course)
        
        response = client.put(
            f"/courses/{course.id}/approve",
            headers=mentor_auth_headers,
            json={"status": "approved"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
