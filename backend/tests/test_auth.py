"""
Tests for authentication endpoints.
"""
import pytest
from fastapi import status


class TestAuthLogin:
    """Tests for POST /auth/login endpoint."""

    def test_login_success_admin(self, client, test_users):
        """Test successful login with admin credentials."""
        response = client.post(
            "/auth/login",
            json={"email": "admin@test.com", "password": "password"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_success_mentor(self, client, test_users):
        """Test successful login with mentor credentials."""
        response = client.post(
            "/auth/login",
            json={"email": "mentor@test.com", "password": "password"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_success_student(self, client, test_users):
        """Test successful login with student credentials."""
        response = client.post(
            "/auth/login",
            json={"email": "student@test.com", "password": "password"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_invalid_email(self, client, test_users):
        """Test login with non-existent email."""
        response = client.post(
            "/auth/login",
            json={"email": "nonexistent@test.com", "password": "password"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid email or password" in response.json()["detail"]

    def test_login_invalid_password(self, client, test_users):
        """Test login with wrong password."""
        response = client.post(
            "/auth/login",
            json={"email": "admin@test.com", "password": "wrongpassword"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid email or password" in response.json()["detail"]

    def test_login_inactive_user(self, client, db, test_users):
        """Test login with inactive user account."""
        # Deactivate the user
        test_users["admin"].is_active = False
        db.commit()

        response = client.post(
            "/auth/login",
            json={"email": "admin@test.com", "password": "password"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Account is disabled" in response.json()["detail"]


class TestAuthRegister:
    """Tests for POST /auth/register endpoint."""

    def test_register_success(self, client):
        """Test successful user registration."""
        response = client.post(
            "/auth/register",
            json={
                "name": "New User",
                "email": "newuser@test.com",
                "password": "password123",
                "role": "student",
                "state": "Test State",
                "district": "Test District"
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "newuser@test.com"
        assert data["name"] == "New User"
        assert data["role"] == "student"

    def test_register_duplicate_email(self, client, test_users):
        """Test registration with duplicate email."""
        response = client.post(
            "/auth/register",
            json={
                "name": "Duplicate User",
                "email": "admin@test.com",
                "password": "password123",
                "role": "student"
            }
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in response.json()["detail"]

    def test_register_invalid_email(self, client):
        """Test registration with invalid email format."""
        response = client.post(
            "/auth/register",
            json={
                "name": "Invalid User",
                "email": "not-an-email",
                "password": "password123",
                "role": "student"
            }
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_short_password(self, client):
        """Test registration with short password."""
        response = client.post(
            "/auth/register",
            json={
                "name": "Short Password User",
                "email": "shortpass@test.com",
                "password": "123",
                "role": "student"
            }
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestUserMe:
    """Tests for GET /users/me endpoint."""

    def test_get_me_admin(self, client, auth_headers):
        """Test getting current user info as admin."""
        response = client.get("/users/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "admin@test.com"
        assert data["role"] == "admin"

    def test_get_me_mentor(self, client, mentor_auth_headers):
        """Test getting current user info as mentor."""
        response = client.get("/users/me", headers=mentor_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "mentor@test.com"
        assert data["role"] == "mentor"

    def test_get_me_student(self, client, student_auth_headers):
        """Test getting current user info as student."""
        response = client.get("/users/me", headers=student_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "student@test.com"
        assert data["role"] == "student"

    def test_get_me_unauthenticated(self, client):
        """Test getting user info without authentication."""
        response = client.get("/users/me")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_me_invalid_token(self, client):
        """Test getting user info with invalid token."""
        response = client.get(
            "/users/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
