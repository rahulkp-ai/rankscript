"""
Tests for assignment service functions.
"""
import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from fastapi import HTTPException

from app.services.assignment_service import (
    create_assignment,
    get_assignments_for_course,
    get_assignment_by_id,
    submit_assignment,
    grade_submission,
    get_my_submission,
    get_all_submissions,
    get_course_submissions,
)
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.user import User, UserRole


# --- Helper data classes to simulate schema objects ---

class FakeAssignmentCreate:
    def __init__(self, title="Test Assignment", description=None, instructions=None,
                 max_score=100.0, passing_score=50.0, deadline=None,
                 late_penalty=10.0, allow_late=True):
        self.title = title
        self.description = description
        self.instructions = instructions
        self.max_score = max_score
        self.passing_score = passing_score
        self.deadline = deadline
        self.late_penalty = late_penalty
        self.allow_late = allow_late


class FakeSubmissionCreate:
    def __init__(self, content="My answer", file_url=None, file_name=None):
        self.content = content
        self.file_url = file_url
        self.file_name = file_name


class FakeSubmissionGrade:
    def __init__(self, score=85.0, feedback="Good work"):
        self.score = score
        self.feedback = feedback


# --- Tests ---

class TestCreateAssignment:
    """Tests for create_assignment function."""

    def test_create_assignment_success(self, db, test_users, test_course):
        """Test creating a new assignment."""
        data = FakeAssignmentCreate(
            title="Python Assignment",
            description="Write a program",
            instructions="Use Python 3",
            max_score=100.0,
            passing_score=50.0,
        )
        mentor = test_users["mentor"]
        assignment = create_assignment(db, test_course.id, data, mentor)

        assert assignment.title == "Python Assignment"
        assert assignment.description == "Write a program"
        assert assignment.instructions == "Use Python 3"
        assert assignment.max_score == 100.0
        assert assignment.passing_score == 50.0
        assert assignment.course_id == test_course.id
        assert assignment.mentor_id == mentor.id
        assert assignment.is_active is True

    def test_create_assignment_with_deadline(self, db, test_users, test_course):
        """Test creating an assignment with a deadline."""
        deadline = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)
        data = FakeAssignmentCreate(
            title="Timed Assignment",
            deadline=deadline,
            allow_late=True,
            late_penalty=15.0,
        )
        mentor = test_users["mentor"]
        assignment = create_assignment(db, test_course.id, data, mentor)

        assert assignment.deadline == deadline
        assert assignment.allow_late is True
        assert assignment.late_penalty == 15.0

    def test_create_assignment_minimal_fields(self, db, test_users, test_course):
        """Test creating assignment with only required fields."""
        data = FakeAssignmentCreate(title="Minimal Assignment")
        mentor = test_users["mentor"]
        assignment = create_assignment(db, test_course.id, data, mentor)

        assert assignment.title == "Minimal Assignment"
        assert assignment.description is None
        assert assignment.instructions is None


class TestGetAssignmentsForCourse:
    """Tests for get_assignments_for_course function."""

    def test_get_assignments_returns_active_only(self, db, test_users, test_course):
        """Test that only active assignments are returned."""
        mentor = test_users["mentor"]
        data = FakeAssignmentCreate(title="Active Assignment")
        create_assignment(db, test_course.id, data, mentor)

        # Create inactive assignment
        inactive = Assignment(
            course_id=test_course.id,
            mentor_id=mentor.id,
            title="Inactive Assignment",
            is_active=False,
        )
        db.add(inactive)
        db.commit()

        assignments = get_assignments_for_course(db, test_course.id)
        titles = [a.title for a in assignments]
        assert "Active Assignment" in titles
        assert "Inactive Assignment" not in titles

    def test_get_assignments_empty_course(self, db, test_course):
        """Test getting assignments for a course with no assignments."""
        assignments = get_assignments_for_course(db, test_course.id)
        assert assignments == []


class TestGetAssignmentById:
    """Tests for get_assignment_by_id function."""

    def test_get_assignment_success(self, db, test_users, test_course):
        """Test getting an assignment by ID."""
        mentor = test_users["mentor"]
        data = FakeAssignmentCreate(title="Find Me")
        created = create_assignment(db, test_course.id, data, mentor)

        found = get_assignment_by_id(db, created.id)
        assert found.id == created.id
        assert found.title == "Find Me"

    def test_get_assignment_not_found(self, db):
        """Test getting a non-existent assignment raises 404."""
        with pytest.raises(HTTPException) as exc_info:
            get_assignment_by_id(db, uuid4())
        assert exc_info.value.status_code == 404
        assert "Assignment not found" in exc_info.value.detail


class TestSubmitAssignment:
    """Tests for submit_assignment function."""

    def test_submit_assignment_success(self, db, test_users, test_course, test_enrollment):
        """Test successful assignment submission."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="Submit Me")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="Here is my answer")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        assert submission.assignment_id == assignment.id
        assert submission.student_id == student.id
        assert submission.content == "Here is my answer"
        assert submission.is_late is False
        assert submission.is_graded is False

    def test_submit_assignment_duplicate(self, db, test_users, test_course, test_enrollment):
        """Test that duplicate submissions are rejected."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="No Duplicates")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="First submission")
        submit_assignment(db, assignment.id, submission_data, student)

        with pytest.raises(HTTPException) as exc_info:
            submit_assignment(db, assignment.id, submission_data, student)
        assert exc_info.value.status_code == 400
        assert "Already submitted" in exc_info.value.detail

    def test_submit_assignment_late_with_penalty(self, db, test_users, test_course, test_enrollment):
        """Test late submission with penalty allowed."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        deadline = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)
        data = FakeAssignmentCreate(
            title="Late OK",
            deadline=deadline,
            allow_late=True,
            late_penalty=10.0,
        )
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="Late submission")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        assert submission.is_late is True
        assert submission.late_days > 0

    def test_submit_assignment_late_not_allowed(self, db, test_users, test_course, test_enrollment):
        """Test late submission when not allowed raises error."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        deadline = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1)
        data = FakeAssignmentCreate(
            title="No Late",
            deadline=deadline,
            allow_late=False,
        )
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="Too late")
        with pytest.raises(HTTPException) as exc_info:
            submit_assignment(db, assignment.id, submission_data, student)
        assert exc_info.value.status_code == 400
        assert "Deadline has passed" in exc_info.value.detail

    def test_submit_assignment_before_deadline(self, db, test_users, test_course, test_enrollment):
        """Test submission before deadline is not marked late."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        deadline = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)
        data = FakeAssignmentCreate(
            title="On Time",
            deadline=deadline,
            allow_late=True,
        )
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="On time submission")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        assert submission.is_late is False
        assert submission.late_days == 0.0

    def test_submit_assignment_with_file(self, db, test_users, test_course, test_enrollment):
        """Test submission with file attachment."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="File Upload")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(
            content=None,
            file_url="https://s3.amazonaws.com/bucket/file.pdf",
            file_name="homework.pdf",
        )
        submission = submit_assignment(db, assignment.id, submission_data, student)

        assert submission.file_url == "https://s3.amazonaws.com/bucket/file.pdf"
        assert submission.file_name == "homework.pdf"
        assert submission.content is None


class TestGradeSubmission:
    """Tests for grade_submission function."""

    def test_grade_submission_success(self, db, test_users, test_course, test_enrollment):
        """Test grading a submission."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="Grade Me")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="My work")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        grade_data = FakeSubmissionGrade(score=85.0, feedback="Well done")
        graded = grade_submission(db, submission.id, grade_data, mentor)

        assert graded.score == 85.0
        assert graded.feedback == "Well done"
        assert graded.is_graded is True
        assert graded.graded_at is not None

    def test_grade_submission_not_found(self, db, test_users):
        """Test grading a non-existent submission raises 404."""
        mentor = test_users["mentor"]
        grade_data = FakeSubmissionGrade(score=50.0)
        with pytest.raises(HTTPException) as exc_info:
            grade_submission(db, uuid4(), grade_data, mentor)
        assert exc_info.value.status_code == 404
        assert "Submission not found" in exc_info.value.detail

    def test_grade_submission_unauthorized_mentor(self, db, test_users, test_course, test_enrollment):
        """Test that another mentor cannot grade submissions."""
        mentor = test_users["mentor"]
        student = test_users["student"]

        # Create another mentor
        other_mentor = User(
            name="Other Mentor",
            email="other_mentor@test.com",
            password_hash="hash",
            role=UserRole.mentor,
            is_active=True,
        )
        db.add(other_mentor)
        db.commit()

        data = FakeAssignmentCreate(title="Not Yours")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="My work")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        grade_data = FakeSubmissionGrade(score=50.0)
        with pytest.raises(HTTPException) as exc_info:
            grade_submission(db, submission.id, grade_data, other_mentor)
        assert exc_info.value.status_code == 403
        assert "Not your assignment" in exc_info.value.detail

    def test_grade_submission_admin_can_grade(self, db, test_users, test_course, test_enrollment):
        """Test that admin can grade any submission."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        admin = test_users["admin"]

        data = FakeAssignmentCreate(title="Admin Graded")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="My work")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        grade_data = FakeSubmissionGrade(score=90.0, feedback="Excellent")
        graded = grade_submission(db, submission.id, grade_data, admin)

        assert graded.score == 90.0
        assert graded.is_graded is True

    def test_grade_submission_score_out_of_range_negative(self, db, test_users, test_course, test_enrollment):
        """Test that negative score is rejected."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="Score Check", max_score=100.0)
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="My work")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        grade_data = FakeSubmissionGrade(score=-10.0)
        with pytest.raises(HTTPException) as exc_info:
            grade_submission(db, submission.id, grade_data, mentor)
        assert exc_info.value.status_code == 400
        assert "Score must be between" in exc_info.value.detail

    def test_grade_submission_score_out_of_range_high(self, db, test_users, test_course, test_enrollment):
        """Test that score exceeding max is rejected."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="Score Check", max_score=100.0)
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="My work")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        grade_data = FakeSubmissionGrade(score=150.0)
        with pytest.raises(HTTPException) as exc_info:
            grade_submission(db, submission.id, grade_data, mentor)
        assert exc_info.value.status_code == 400
        assert "Score must be between" in exc_info.value.detail

    def test_grade_submission_with_late_penalty(self, db, test_users, test_course, test_enrollment):
        """Test that late penalty is applied to score."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        deadline = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)
        data = FakeAssignmentCreate(
            title="Penalty Test",
            deadline=deadline,
            allow_late=True,
            late_penalty=10.0,
        )
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="Late work")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        grade_data = FakeSubmissionGrade(score=100.0)
        graded = grade_submission(db, submission.id, grade_data, mentor)

        # Score should be reduced by late_penalty * late_days
        assert graded.score < 100.0
        assert graded.score >= 0

    def test_grade_submission_boundary_score_zero(self, db, test_users, test_course, test_enrollment):
        """Test grading with score of 0."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="Zero Score")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="My work")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        grade_data = FakeSubmissionGrade(score=0.0, feedback="Needs improvement")
        graded = grade_submission(db, submission.id, grade_data, mentor)

        assert graded.score == 0.0
        assert graded.is_graded is True

    def test_grade_submission_boundary_score_max(self, db, test_users, test_course, test_enrollment):
        """Test grading with max score."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="Max Score", max_score=200.0)
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="My work")
        submission = submit_assignment(db, assignment.id, submission_data, student)

        grade_data = FakeSubmissionGrade(score=200.0, feedback="Perfect")
        graded = grade_submission(db, submission.id, grade_data, mentor)

        assert graded.score == 200.0


class TestGetMySubmission:
    """Tests for get_my_submission function."""

    def test_get_my_submission_exists(self, db, test_users, test_course, test_enrollment):
        """Test getting an existing submission."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="Find Submission")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submission_data = FakeSubmissionCreate(content="My answer")
        submit_assignment(db, assignment.id, submission_data, student)

        found = get_my_submission(db, assignment.id, student.id)
        assert found is not None
        assert found.student_id == student.id
        assert found.assignment_id == assignment.id

    def test_get_my_submission_not_exists(self, db, test_users, test_course):
        """Test getting a non-existent submission returns None."""
        student = test_users["student"]
        found = get_my_submission(db, test_course.id, student.id)
        assert found is None


class TestGetAllSubmissions:
    """Tests for get_all_submissions function."""

    def test_get_all_submissions_multiple(self, db, test_users, test_course, test_enrollment):
        """Test getting all submissions for an assignment."""
        mentor = test_users["mentor"]
        student = test_users["student"]
        data = FakeAssignmentCreate(title="Multiple Submissions")
        assignment = create_assignment(db, test_course.id, data, mentor)

        # Create a second student
        student2 = User(
            name="Student 2",
            email="student2@test.com",
            password_hash="hash",
            role=UserRole.student,
            is_active=True,
        )
        db.add(student2)
        db.commit()

        # Enroll second student
        from app.models.enrollment import Enrollment
        enrollment2 = Enrollment(
            student_id=student2.id,
            course_id=test_course.id,
            is_approved=True,
        )
        db.add(enrollment2)
        db.commit()

        submit_assignment(db, assignment.id, FakeSubmissionCreate(content="Answer 1"), student)
        submit_assignment(db, assignment.id, FakeSubmissionCreate(content="Answer 2"), student2)

        submissions = get_all_submissions(db, assignment.id)
        assert len(submissions) == 2

    def test_get_all_submissions_empty(self, db, test_users, test_course):
        """Test getting submissions when none exist."""
        mentor = test_users["mentor"]
        data = FakeAssignmentCreate(title="No Submissions")
        assignment = create_assignment(db, test_course.id, data, mentor)

        submissions = get_all_submissions(db, assignment.id)
        assert submissions == []


class TestGetCourseSubmissions:
    """Tests for get_course_submissions function."""

    def test_get_course_submissions(self, db, test_users, test_course, test_enrollment):
        """Test getting all submissions for a course."""
        mentor = test_users["mentor"]
        student = test_users["student"]

        data1 = FakeAssignmentCreate(title="Assignment 1")
        data2 = FakeAssignmentCreate(title="Assignment 2")
        a1 = create_assignment(db, test_course.id, data1, mentor)
        a2 = create_assignment(db, test_course.id, data2, mentor)

        submit_assignment(db, a1.id, FakeSubmissionCreate(content="A1 sub"), student)
        submit_assignment(db, a2.id, FakeSubmissionCreate(content="A2 sub"), student)

        result = get_course_submissions(db, test_course.id)
        assert len(result) == 2
        assert all("submission" in r and "assignment" in r for r in result)

    def test_get_course_submissions_empty(self, db, test_course):
        """Test getting course submissions when none exist."""
        result = get_course_submissions(db, test_course.id)
        assert result == []
