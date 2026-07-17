"""
Tests for rankings API endpoints.
"""
import pytest
from fastapi import status


class TestGlobalLeaderboard:
    """Tests for GET /rankings/global endpoint."""

    def test_global_leaderboard_success(self, client, student_auth_headers):
        """Test getting global leaderboard."""
        response = client.get("/rankings/global", headers=student_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "entries" in data
        assert "total" in data
        assert "my_rank" in data
        assert "my_score" in data
        assert isinstance(data["entries"], list)

    def test_global_leaderboard_unauthenticated(self, client):
        """Test global leaderboard without auth."""
        response = client.get("/rankings/global")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_global_leaderboard_pagination(self, client, student_auth_headers):
        """Test leaderboard pagination."""
        response = client.get(
            "/rankings/global?skip=0&limit=10",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["entries"]) <= 10

    def test_global_leaderboard_entry_structure(self, client, student_auth_headers):
        """Test leaderboard entry structure."""
        response = client.get("/rankings/global", headers=student_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        if data["entries"]:
            entry = data["entries"][0]
            assert "rank" in entry
            assert "user_id" in entry
            assert "name" in entry
            assert "rank_score" in entry
            assert "xp" in entry
            assert "is_me" in entry


class TestStateLeaderboard:
    """Tests for GET /rankings/state/{state} endpoint."""

    def test_state_leaderboard_success(self, client, student_auth_headers):
        """Test getting state leaderboard."""
        response = client.get(
            "/rankings/state/Test State",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "entries" in data
        assert "total" in data
        assert isinstance(data["entries"], list)

    def test_state_leaderboard_unauthenticated(self, client):
        """Test state leaderboard without auth."""
        response = client.get("/rankings/state/Kerala")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_state_leaderboard_empty(self, client, student_auth_headers):
        """Test state leaderboard for non-existent state."""
        response = client.get(
            "/rankings/state/NonExistentState",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["entries"] == []
        assert data["total"] == 0


class TestDistrictLeaderboard:
    """Tests for GET /rankings/district/{district} endpoint."""

    def test_district_leaderboard_success(self, client, student_auth_headers):
        """Test getting district leaderboard."""
        response = client.get(
            "/rankings/district/Test District",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "entries" in data
        assert "total" in data

    def test_district_leaderboard_unauthenticated(self, client):
        """Test district leaderboard without auth."""
        response = client.get("/rankings/district/Thiruvananthapuram")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_district_leaderboard_empty(self, client, student_auth_headers):
        """Test district leaderboard for non-existent district."""
        response = client.get(
            "/rankings/district/NonExistentDistrict",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["entries"] == []


class TestMyRank:
    """Tests for GET /rankings/me endpoint."""

    def test_my_rank_success(self, client, student_auth_headers):
        """Test getting own rank."""
        response = client.get("/rankings/me", headers=student_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "indian_rank" in data
        assert "rank_score" in data
        assert "quiz_score" in data
        assert "assignment_score" in data
        assert "completion_score" in data
        assert "streak_score" in data
        assert "xp" in data
        assert "streak_days" in data

    def test_my_rank_unauthenticated(self, client):
        """Test getting rank without auth."""
        response = client.get("/rankings/me")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_my_rank_data_types(self, client, student_auth_headers):
        """Test that rank data has correct types."""
        response = client.get("/rankings/me", headers=student_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data["rank_score"], (int, float))
        assert isinstance(data["quiz_score"], (int, float))
        assert isinstance(data["assignment_score"], (int, float))
        assert isinstance(data["xp"], (int, float))
        assert isinstance(data["streak_days"], int)


class TestRecalculateRank:
    """Tests for POST /rankings/recalculate endpoint."""

    def test_recalculate_success(self, client, student_auth_headers):
        """Test recalculating own rank."""
        response = client.post(
            "/rankings/recalculate",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        assert "rank_score" in data

    def test_recalculate_unauthenticated(self, client):
        """Test recalculating without auth."""
        response = client.post("/rankings/recalculate")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_recalculate_mentor_fails(self, client, mentor_auth_headers):
        """Test that mentors cannot recalculate rank."""
        response = client.post(
            "/rankings/recalculate",
            headers=mentor_auth_headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "students" in data["detail"].lower()


class TestRecalculateUserRank:
    """Tests for POST /rankings/recalculate/{user_id} endpoint."""

    def test_admin_recalculate_success(self, client, auth_headers, student_auth_headers):
        """Test admin recalculating another user's rank."""
        # First get the student's user info
        me_resp = client.get("/users/me", headers=student_auth_headers)
        student_id = me_resp.json()["id"]

        response = client.post(
            f"/rankings/recalculate/{student_id}",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "rank_score" in data

    def test_admin_recalculate_non_student(self, client, auth_headers, mentor_auth_headers):
        """Test admin recalculating mentor rank fails."""
        me_resp = client.get("/users/me", headers=mentor_auth_headers)
        mentor_id = me_resp.json()["id"]

        response = client.post(
            f"/rankings/recalculate/{mentor_id}",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_recalculate_not_found(self, client, auth_headers):
        """Test admin recalculating non-existent user."""
        response = client.post(
            "/rankings/recalculate/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mentor_cannot_recalculate_others(self, client, mentor_auth_headers):
        """Test that mentors cannot recalculate other users' ranks."""
        response = client.post(
            "/rankings/recalculate/fake-id",
            headers=mentor_auth_headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_student_cannot_recalculate_others(self, client, student_auth_headers):
        """Test that students cannot recalculate other users' ranks."""
        response = client.post(
            "/rankings/recalculate/fake-id",
            headers=student_auth_headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
