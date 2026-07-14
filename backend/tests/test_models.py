"""
Tests for database models.
"""
import pytest
from datetime import datetime
from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus, CourseLevel
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.assignment import Assignment
from app.models.submission import Submission


class TestUserModel:
    """Tests for User model."""

    def test_create_user(self, db, test_users):
        """Test creating a user."""
        user = test_users["admin"]
        assert user.email == "admin@test.com"
        assert user.name == "Test Admin"
        assert user.role == UserRole.admin
        assert user.is_active is True

    def test_user_roles(self, db, test_users):
        """Test user role enum values."""
        admin = test_users["admin"]
        mentor = test_users["mentor"]
        student = test_users["student"]
        
        assert admin.role == UserRole.admin
        assert mentor.role == UserRole.mentor
        assert student.role == UserRole.student

    def test_user_default_values(self, db):
        """Test user model default values."""
        user = User(
            name="Default User",
            email="default@test.com",
            password_hash="hash",
            role=UserRole.student,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        assert user.is_active is True
        assert user.is_verified is False
        assert user.xp == 0.0
        assert user.rank_score == 0.0
        assert user.streak_days == 0
        assert user.country == "India"


class TestCourseModel:
    """Tests for Course model."""

    def test_create_course(self, db, test_users):
        """Test creating a course."""
        course = Course(
            mentor_id=test_users["mentor"].id,
            title="Python Basics",
            description="Learn Python from scratch",
            status=CourseStatus.draft,
            level=CourseLevel.beginner,
        )
        db.add(course)
        db.commit()
        db.refresh(course)
        
        assert course.title == "Python Basics"
        assert course.status == CourseStatus.draft
        assert course.level == CourseLevel.beginner
        assert course.total_lessons == 0
        assert course.total_enrolled == 0

    def test_course_status_enum(self, db, test_users):
        """Test course status enum values."""
        assert CourseStatus.draft.value == "draft"
        assert CourseStatus.pending.value == "pending"
        assert CourseStatus.approved.value == "approved"
        assert CourseStatus.rejected.value == "rejected"

    def test_course_level_enum(self, db, test_users):
        """Test course level enum values."""
        assert CourseLevel.beginner.value == "beginner"
        assert CourseLevel.intermediate.value == "intermediate"
        assert CourseLevel.advanced.value == "advanced"


class TestLessonModel:
    """Tests for Lesson model."""

    def test_create_lesson(self, db, test_users, test_course):
        """Test creating a lesson."""
        lesson = Lesson(
            course_id=test_course.id,
            title="Introduction",
            description="Welcome to the course",
            youtube_url="https://www.youtube.com/watch?v=test",
            youtube_id="test",
            duration=600,
            order=1,
            module="Module 1",
        )
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
        
        assert lesson.title == "Introduction"
        assert lesson.duration == 600
        assert lesson.order == 1

    def test_lesson_default_values(self, db, test_users, test_course):
        """Test lesson default values."""
        lesson = Lesson(
            course_id=test_course.id,
            title="Test Lesson",
            youtube_url="https://www.youtube.com/watch?v=test",
            youtube_id="test",
            duration=300,
            order=1,
        )
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
        
        assert lesson.is_free is False
        assert lesson.module is None


class TestEnrollmentModel:
    """Tests for Enrollment model."""

    def test_create_enrollment(self, db, test_users, test_course):
        """Test creating an enrollment."""
        enrollment = Enrollment(
            student_id=test_users["student"].id,
            course_id=test_course.id,
            progress=0.0,
            lessons_done=0,
            is_approved=False,
            is_completed=False,
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        assert enrollment.student_id == test_users["student"].id
        assert enrollment.course_id == test_course.id
        assert enrollment.progress == 0.0

    def test_enrollment_default_values(self, db, test_users, test_course):
        """Test enrollment default values."""
        enrollment = Enrollment(
            student_id=test_users["student"].id,
            course_id=test_course.id,
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        assert enrollment.progress == 0.0
        assert enrollment.lessons_done == 0
        assert enrollment.is_approved is False
        assert enrollment.is_completed is False


class TestQuizModel:
    """Tests for Quiz model."""

    def test_create_quiz(self, db, test_users, test_course):
        """Test creating a quiz."""
        quiz = Quiz(
            course_id=test_course.id,
            mentor_id=test_users["mentor"].id,
            title="Python Quiz",
            description="Test your Python knowledge",
            time_limit=1800,
            pass_score=60,
            max_attempts=3,
            is_active=True,
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        
        assert quiz.title == "Python Quiz"
        assert quiz.time_limit == 1800
        assert quiz.pass_score == 60
        assert quiz.is_active is True


class TestQuizAttemptModel:
    """Tests for QuizAttempt model."""

    def test_create_quiz_attempt(self, db, test_users, test_course):
        """Test creating a quiz attempt."""
        import json
        quiz = Quiz(
            course_id=test_course.id,
            mentor_id=test_users["mentor"].id,
            title="Test Quiz",
        )
        db.add(quiz)
        db.commit()
        
        attempt = QuizAttempt(
            quiz_id=quiz.id,
            student_id=test_users["student"].id,
            answers=json.dumps({"q1": "a", "q2": "b"}),
            score=100.0,
            total_points=2,
            earned_points=2,
            passed=True,
            time_taken=300,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        
        assert attempt.score == 100.0
        assert attempt.passed is True


class TestAssignmentModel:
    """Tests for Assignment model."""

    def test_create_assignment(self, db, test_users, test_course):
        """Test creating an assignment."""
        assignment = Assignment(
            course_id=test_course.id,
            mentor_id=test_users["mentor"].id,
            title="Python Assignment",
            description="Complete the Python exercises",
            instructions="Write a program to calculate factorial",
            max_score=100,
            passing_score=50,
            is_active=True,
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        
        assert assignment.title == "Python Assignment"
        assert assignment.max_score == 100
        assert assignment.passing_score == 50


class TestSubmissionModel:
    """Tests for Submission model."""

    def test_create_submission(self, db, test_users, test_course):
        """Test creating a submission."""
        assignment = Assignment(
            course_id=test_course.id,
            mentor_id=test_users["mentor"].id,
            title="Test Assignment",
        )
        db.add(assignment)
        db.commit()
        
        submission = Submission(
            assignment_id=assignment.id,
            student_id=test_users["student"].id,
            content="My submission content",
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
        
        assert submission.content == "My submission content"
        assert submission.score is None
        assert submission.is_graded is False


class TestModelRelationships:
    """Tests for model relationships."""

    def test_course_mentor_relationship(self, db, test_users, test_course):
        """Test course-mentor relationship."""
        mentor = db.query(User).filter(User.id == test_course.mentor_id).first()
        assert mentor is not None
        assert mentor.email == "mentor@test.com"

    def test_course_lessons_relationship(self, db, test_users, test_course, test_lesson):
        """Test course-lessons relationship."""
        course = db.query(Course).filter(Course.id == test_course.id).first()
        assert len(course.lessons) >= 2

    def test_enrollment_user_relationship(self, db, test_users, test_enrollment):
        """Test enrollment-user relationship."""
        student = db.query(User).filter(User.id == test_enrollment.student_id).first()
        assert student is not None
        assert student.email == "student@test.com"

    def test_enrollment_course_relationship(self, db, test_course, test_enrollment):
        """Test enrollment-course relationship."""
        course = db.query(Course).filter(Course.id == test_enrollment.course_id).first()
        assert course is not None
        assert course.title == "Test Course"
