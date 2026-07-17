"""
Tests for analytics API endpoints.
"""
import pytest
from fastapi import status


class TestMentorAnalytics:
    """Tests for GET /analytics/mentor/overview endpoint."""

    def test_mentor_analytics_success(self, client, mentor_auth_headers, test_users, test_course, test_lesson, test_enrollment):
        """Test getting mentor analytics successfully."""
        response = client.get("/analytics/mentor/overview", headers=mentor_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify response structure
        assert "total_courses" in data
        assert "total_students" in data
        assert "total_lessons" in data
        assert "total_quizzes" in data
        assert "total_assignments" in data
        assert "pending_submissions" in data
        assert "avg_completion_rate" in data
        assert "avg_quiz_score" in data
        assert "courses" in data

    def test_mentor_analytics_unauthenticated(self, client):
        """Test mentor analytics without authentication."""
        response = client.get("/analytics/mentor/overview")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mentor_analytics_student_forbidden(self, client, student_auth_headers):
        """Test mentor analytics as student - should be forbidden."""
        response = client.get("/analytics/mentor/overview", headers=student_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mentor_analytics_admin_allowed(self, client, auth_headers, test_users, test_course, test_lesson):
        """Test mentor analytics as admin - should be allowed."""
        response = client.get("/analytics/mentor/overview", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_courses"] >= 0

    def test_mentor_analytics_response_fields(self, client, mentor_auth_headers, test_users, test_course, test_lesson):
        """Test mentor analytics returns correct data types."""
        response = client.get("/analytics/mentor/overview", headers=mentor_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify data types
        assert isinstance(data["total_courses"], int)
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_lessons"], int)
        assert isinstance(data["avg_completion_rate"], (int, float))
        assert isinstance(data["avg_quiz_score"], (int, float))
        assert isinstance(data["courses"], list)


class TestStudentAnalytics:
    """Tests for GET /analytics/student/me endpoint."""

    def test_student_analytics_success(self, client, student_auth_headers, test_users, test_course, test_enrollment):
        """Test getting student analytics successfully."""
        response = client.get("/analytics/student/me", headers=student_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify response structure
        assert "total_enrolled" in data
        assert "total_completed" in data
        assert "avg_quiz_score" in data
        assert "total_assignments" in data
        assert "current_streak" in data
        assert "rank_score" in data

    def test_student_analytics_unauthenticated(self, client):
        """Test student analytics without authentication."""
        response = client.get("/analytics/student/me")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_student_analytics_mentor_forbidden(self, client, mentor_auth_headers):
        """Test student analytics as mentor - should be forbidden."""
        response = client.get("/analytics/student/me", headers=mentor_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_student_analytics_response_fields(self, client, student_auth_headers):
        """Test student analytics returns correct data types."""
        response = client.get("/analytics/student/me", headers=student_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify data types
        assert isinstance(data["total_enrolled"], int)
        assert isinstance(data["total_completed"], int)
        assert isinstance(data["avg_quiz_score"], (int, float))
        assert isinstance(data["current_streak"], int)
        assert isinstance(data["rank_score"], (int, float))

    def test_student_analytics_no_enrollments(self, client, student_auth_headers):
        """Test student analytics with no enrollments."""
        response = client.get("/analytics/student/me", headers=student_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_enrolled"] == 0
        assert data["total_completed"] == 0


class TestAdminAnalytics:
    """Tests for GET /analytics/admin/overview endpoint."""

    def test_admin_analytics_success(self, client, auth_headers, test_users):
        """Test getting admin analytics successfully."""
        response = client.get("/analytics/admin/overview", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify response structure
        assert "total_users" in data
        assert "total_students" in data
        assert "total_mentors" in data
        assert "total_admins" in data
        assert "total_courses" in data
        assert "approved_courses" in data
        assert "pending_courses" in data
        assert "total_enrollments" in data
        assert "platform_completion_rate" in data
        assert "top_students" in data

    def test_admin_analytics_unauthenticated(self, client):
        """Test admin analytics without authentication."""
        response = client.get("/analytics/admin/overview")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_analytics_mentor_forbidden(self, client, mentor_auth_headers):
        """Test admin analytics as mentor - should be forbidden."""
        response = client.get("/analytics/admin/overview", headers=mentor_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_analytics_student_forbidden(self, client, student_auth_headers):
        """Test admin analytics as student - should be forbidden."""
        response = client.get("/analytics/admin/overview", headers=student_auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_analytics_response_fields(self, client, auth_headers):
        """Test admin analytics returns correct data types."""
        response = client.get("/analytics/admin/overview", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify data types
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_mentors"], int)
        assert isinstance(data["total_courses"], int)
        assert isinstance(data["platform_completion_rate"], (int, float))
        assert isinstance(data["top_students"], list)

    def test_admin_analytics_top_students_structure(self, client, auth_headers):
        """Test admin analytics top_students field structure."""
        response = client.get("/analytics/admin/overview", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        if data["top_students"]:
            student = data["top_students"][0]
            assert "user_id" in student
            assert "name" in student
            assert "rank_score" in student
            assert "xp" in student
            assert "state" in student
            assert "district" in student


class TestAnalyticsAuthorization:
    """Tests for role-based access control on analytics endpoints."""

    def test_student_cannot_access_mentor_analytics(self, client, student_auth_headers):
        """Verify students cannot access mentor analytics."""
        response = client.get("/analytics/mentor/overview", headers=student_auth_headers)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_student_cannot_access_admin_analytics(self, client, student_auth_headers):
        """Verify students cannot access admin analytics."""
        response = client.get("/analytics/admin/overview", headers=student_auth_headers)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_mentor_cannot_access_admin_analytics(self, client, mentor_auth_headers):
        """Verify mentors cannot access admin analytics."""
        response = client.get("/analytics/admin/overview", headers=mentor_auth_headers)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]

    def test_admin_can_access_all_analytics(self, client, auth_headers):
        """Verify admins can access all analytics."""
        # Admin can access mentor analytics
        response = client.get("/analytics/mentor/overview", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        # Admin can access student analytics
        response = client.get("/analytics/student/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        # Admin can access admin analytics
        response = client.get("/analytics/admin/overview", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
