"""
Tests for enrollment service functions.
"""
import pytest
from uuid import uuid4
from fastapi import HTTPException

from app.services.enrollment_service import (
    enroll_student,
    get_my_enrollments,
    update_progress,
)
from app.models.enrollment import Enrollment
from app.models.course import Course, CourseStatus, CourseLevel
from app.models.user import User, UserRole


# --- Helper data classes ---

class FakeEnrollRequest:
    def __init__(self, course_id):
        self.course_id = course_id


class FakeProgressUpdate:
    def __init__(self, lesson_id="lesson-1", progress=50.0, lessons_done=1):
        self.lesson_id = lesson_id
        self.progress = progress
        self.lessons_done = lessons_done


# --- Tests ---

class TestEnrollStudent:
    """Tests for enroll_student function."""

    def test_enroll_student_success(self, db, test_users, test_course):
        """Test successful enrollment."""
        student = test_users["student"]
        data = FakeEnrollRequest(course_id=test_course.id)
        enrollment = enroll_student(db, data, student)

        assert enrollment.student_id == student.id
        assert enrollment.course_id == test_course.id
        assert enrollment.progress == 0.0
        assert enrollment.lessons_done == 0
        assert enrollment.is_completed is False

    def test_enroll_student_auto_approve_non_gated(self, db, test_users):
        """Test auto-approval for non-gated courses."""
        student = test_users["student"]
        mentor = test_users["mentor"]
        course = Course(
            mentor_id=mentor.id,
            title="Open Course",
            status=CourseStatus.approved,
            level=CourseLevel.beginner,
            is_gated=False,
        )
        db.add(course)
        db.commit()
        db.refresh(course)

        data = FakeEnrollRequest(course_id=course.id)
        enrollment = enroll_student(db, data, student)

        assert enrollment.is_approved is True

    def test_enroll_student_gated_course(self, db, test_users):
        """Test enrollment in gated course requires approval."""
        student = test_users["student"]
        mentor = test_users["mentor"]
        course = Course(
            mentor_id=mentor.id,
            title="Gated Course",
            status=CourseStatus.approved,
            level=CourseLevel.beginner,
            is_gated=True,
        )
        db.add(course)
        db.commit()
        db.refresh(course)

        data = FakeEnrollRequest(course_id=course.id)
        enrollment = enroll_student(db, data, student)

        assert enrollment.is_approved is False

    def test_enroll_student_course_not_found(self, db, test_users):
        """Test enrollment in non-existent course raises 404."""
        student = test_users["student"]
        data = FakeEnrollRequest(course_id=uuid4())

        with pytest.raises(HTTPException) as exc_info:
            enroll_student(db, data, student)
        assert exc_info.value.status_code == 404
        assert "Course not found" in exc_info.value.detail

    def test_enroll_student_course_not_approved(self, db, test_users):
        """Test enrollment in non-approved course raises 400."""
        student = test_users["student"]
        mentor = test_users["mentor"]
        course = Course(
            mentor_id=mentor.id,
            title="Draft Course",
            status=CourseStatus.draft,
            level=CourseLevel.beginner,
        )
        db.add(course)
        db.commit()
        db.refresh(course)

        data = FakeEnrollRequest(course_id=course.id)
        with pytest.raises(HTTPException) as exc_info:
            enroll_student(db, data, student)
        assert exc_info.value.status_code == 400
        assert "not available for enrollment" in exc_info.value.detail

    def test_enroll_student_duplicate(self, db, test_users, test_course):
        """Test duplicate enrollment raises 400."""
        student = test_users["student"]
        data = FakeEnrollRequest(course_id=test_course.id)

        enroll_student(db, data, student)

        with pytest.raises(HTTPException) as exc_info:
            enroll_student(db, data, student)
        assert exc_info.value.status_code == 400
        assert "Already enrolled" in exc_info.value.detail


class TestGetMyEnrollments:
    """Tests for get_my_enrollments function."""

    def test_get_my_enrollments_returns_all(self, db, test_users, test_course):
        """Test getting all enrollments for a student."""
        student = test_users["student"]
        mentor = test_users["mentor"]

        # Create second course
        course2 = Course(
            mentor_id=mentor.id,
            title="Course 2",
            status=CourseStatus.approved,
            level=CourseLevel.beginner,
        )
        db.add(course2)
        db.commit()

        for course in [test_course, course2]:
            enrollment = Enrollment(
                student_id=student.id,
                course_id=course.id,
            )
            db.add(enrollment)
        db.commit()

        enrollments = get_my_enrollments(db, student.id)
        assert len(enrollments) == 2

    def test_get_my_enrollments_empty(self, db, test_users):
        """Test getting enrollments when none exist."""
        student = test_users["student"]
        enrollments = get_my_enrollments(db, student.id)
        assert enrollments == []


class TestUpdateProgress:
    """Tests for update_progress function."""

    def test_update_progress_success(self, db, test_users, test_course, test_enrollment):
        """Test updating enrollment progress."""
        student = test_users["student"]
        data = FakeProgressUpdate(lesson_id="lesson-1", progress=50.0, lessons_done=1)

        enrollment = update_progress(db, test_enrollment.id, data, student)

        assert enrollment.progress == 50.0
        assert enrollment.lessons_done == 1
        assert enrollment.last_lesson_id == "lesson-1"

    def test_update_progress_completion(self, db, test_users, test_course, test_enrollment):
        """Test marking enrollment as completed at 100% progress."""
        student = test_users["student"]
        data = FakeProgressUpdate(lesson_id="lesson-2", progress=100.0, lessons_done=2)

        enrollment = update_progress(db, test_enrollment.id, data, student)

        assert enrollment.progress == 100.0
        assert enrollment.is_completed is True
        assert enrollment.completed_at is not None

    def test_update_progress_not_found(self, db, test_users):
        """Test updating non-existent enrollment raises 404."""
        student = test_users["student"]
        data = FakeProgressUpdate()

        with pytest.raises(HTTPException) as exc_info:
            update_progress(db, uuid4(), data, student)
        assert exc_info.value.status_code == 404
        assert "Enrollment not found" in exc_info.value.detail

    def test_update_progress_wrong_student(self, db, test_users, test_course, test_enrollment):
        """Test that another student cannot update enrollment."""
        other_student = User(
            name="Other Student",
            email="other_student@test.com",
            password_hash="hash",
            role=UserRole.student,
            is_active=True,
        )
        db.add(other_student)
        db.commit()

        data = FakeProgressUpdate()
        with pytest.raises(HTTPException) as exc_info:
            update_progress(db, test_enrollment.id, data, other_student)
        assert exc_info.value.status_code == 403
        assert "Not your enrollment" in exc_info.value.detail

    def test_update_progress_exceeds_total_lessons(self, db, test_users, test_course, test_enrollment):
        """Test that lessons_done exceeding total raises error."""
        student = test_users["student"]
        # test_course has total_lessons=2
        data = FakeProgressUpdate(lessons_done=999, progress=100.0)

        with pytest.raises(HTTPException) as exc_info:
            update_progress(db, test_enrollment.id, data, student)
        assert exc_info.value.status_code == 400
        assert "exceeds total lessons" in exc_info.value.detail

    def test_update_progress_at_boundary(self, db, test_users, test_course, test_enrollment):
        """Test progress update at exactly total_lessons."""
        student = test_users["student"]
        data = FakeProgressUpdate(lessons_done=2, progress=100.0)

        enrollment = update_progress(db, test_enrollment.id, data, student)

        assert enrollment.lessons_done == 2
        assert enrollment.is_completed is True

    def test_update_progress_already_completed(self, db, test_users, test_course):
        """Test updating progress on already completed enrollment."""
        student = test_users["student"]
        enrollment = Enrollment(
            id=uuid4(),
            student_id=student.id,
            course_id=test_course.id,
            progress=100.0,
            is_completed=True,
        )
        db.add(enrollment)
        db.commit()

        data = FakeProgressUpdate(progress=100.0, lessons_done=2)
        result = update_progress(db, enrollment.id, data, student)

        assert result.is_completed is True
