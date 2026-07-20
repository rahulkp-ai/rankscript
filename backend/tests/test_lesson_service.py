"""
Tests for lesson service functions.
"""
import pytest
from uuid import uuid4
from fastapi import HTTPException

from app.services.lesson_service import add_lesson, get_lessons, delete_lesson


class FakeLessonCreate:
    """Helper class to simulate LessonCreate schema."""
    def __init__(self, title="Test Lesson", description="Desc",
                 youtube_url="https://www.youtube.com/watch?v=abc123",
                 duration=600, order=1, module="Module 1", is_free=False):
        self.title = title
        self.description = description
        self.youtube_url = youtube_url
        self.duration = duration
        self.order = order
        self.module = module
        self.is_free = is_free


class TestAddLesson:
    """Tests for add_lesson function."""

    def test_add_lesson_success(self, db, test_users, test_course):
        """Test successfully adding a lesson to a course."""
        mentor = test_users["mentor"]
        data = FakeLessonCreate(title="New Lesson", order=3)
        lesson = add_lesson(db, test_course.id, data, mentor)

        assert lesson.title == "New Lesson"
        assert lesson.course_id == test_course.id
        assert lesson.order == 3

    def test_add_lesson_course_not_found(self, db, test_users):
        """Test adding lesson to non-existent course raises 404."""
        mentor = test_users["mentor"]
        fake_course_id = uuid4()
        data = FakeLessonCreate()

        with pytest.raises(HTTPException) as exc_info:
            add_lesson(db, fake_course_id, data, mentor)
        assert exc_info.value.status_code == 404

    def test_add_lesson_unauthorized_mentor(self, db, test_users, test_course):
        """Test that a student cannot add lessons."""
        student = test_users["student"]
        data = FakeLessonCreate()

        with pytest.raises(HTTPException) as exc_info:
            add_lesson(db, test_course.id, data, student)
        assert exc_info.value.status_code == 403

    def test_add_lesson_admin_can_add(self, db, test_users, test_course):
        """Test that admin can add lessons to any course."""
        admin = test_users["admin"]
        data = FakeLessonCreate(title="Admin Lesson", order=3)
        lesson = add_lesson(db, test_course.id, data, admin)
        assert lesson.title == "Admin Lesson"

    def test_add_lesson_with_youtube_id_extraction(self, db, test_users, test_course):
        """Test that youtube_id is extracted from youtube_url."""
        mentor = test_users["mentor"]
        data = FakeLessonCreate(youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        lesson = add_lesson(db, test_course.id, data, mentor)
        assert lesson.youtube_id == "dQw4w9WgXcQ"


class TestGetLessons:
    """Tests for get_lessons function."""

    def test_get_lessons_returns_all(self, db, test_users, test_course, test_lesson):
        """Test getting all lessons for a course."""
        lessons = get_lessons(db, test_course.id)
        assert len(lessons) == 2

    def test_get_lessons_empty_course(self, db, test_users, test_course):
        """Test getting lessons for course with no lessons."""
        lessons = get_lessons(db, test_course.id)
        assert lessons == []

    def test_get_lessons_ordered(self, db, test_users, test_course):
        """Test that lessons are returned in order."""
        mentor = test_users["mentor"]
        data1 = FakeLessonCreate(title="Third", order=3)
        data2 = FakeLessonCreate(title="First", order=1)
        add_lesson(db, test_course.id, data1, mentor)
        add_lesson(db, test_course.id, data2, mentor)

        lessons = get_lessons(db, test_course.id)
        orders = [l.order for l in lessons]
        assert orders == sorted(orders)


class TestDeleteLesson:
    """Tests for delete_lesson function."""

    def test_delete_lesson_not_found(self, db, test_users):
        """Test deleting non-existent lesson raises 404."""
        mentor = test_users["mentor"]
        fake_id = uuid4()

        with pytest.raises(HTTPException) as exc_info:
            delete_lesson(db, fake_id, mentor)
        assert exc_info.value.status_code == 404

    def test_delete_lesson_unauthorized_mentor(self, db, test_users, test_course, test_lesson):
        """Test that a different mentor cannot delete lessons."""
        other_user = test_users["student"]

        with pytest.raises(HTTPException) as exc_info:
            delete_lesson(db, test_lesson[0].id, other_user)
        assert exc_info.value.status_code == 403

    def test_delete_lesson_admin_can_delete(self, db, test_users, test_course, test_lesson):
        """Test that admin can delete any lesson."""
        admin = test_users["admin"]
        delete_lesson(db, test_lesson[0].id, admin)
        remaining = get_lessons(db, test_course.id)
        assert len(remaining) == 1

    def test_delete_lesson_does_not_go_negative(self, db, test_users, test_course):
        """Test that total_lessons doesn't go below 0."""
        mentor = test_users["mentor"]
        data = FakeLessonCreate(order=99)
        lesson = add_lesson(db, test_course.id, data, mentor)
        
        # Set total_lessons to 0 to test boundary
        test_course.total_lessons = 0
        db.commit()
        
        delete_lesson(db, lesson.id, mentor)
        db.refresh(test_course)
        assert test_course.total_lessons == 0
