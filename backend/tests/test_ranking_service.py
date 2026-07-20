"""
Tests for ranking service functions.
"""
import pytest
import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.services.ranking_service import (
    get_or_create_rank_entry,
    calculate_quiz_score,
    calculate_assignment_score,
    calculate_completion_score,
    calculate_streak_score,
    compute_rank_score,
    update_user_ranking,
    update_streak,
    get_indian_leaderboard,
    get_state_leaderboard,
    get_district_leaderboard,
    get_my_ranks,
    WEIGHTS,
)
from app.models.ranking import RankEntry
from app.models.quiz_attempt import QuizAttempt
from app.models.submission import Submission
from app.models.enrollment import Enrollment
from app.models.user import User, UserRole


# --- Tests ---

class TestGetOrCreateRankEntry:
    """Tests for get_or_create_rank_entry function."""

    def test_creates_new_entry(self, db, test_users):
        """Test creating a new rank entry for a student."""
        student = test_users["student"]
        entry = get_or_create_rank_entry(db, student)

        assert entry.user_id == student.id
        assert entry.state == student.state
        assert entry.district == student.district
        assert entry.rank_score == 0.0
        assert entry.xp == 0.0
        assert entry.streak_days == 0

    def test_returns_existing_entry(self, db, test_users):
        """Test returning existing rank entry."""
        student = test_users["student"]
        entry1 = get_or_create_rank_entry(db, student)
        entry2 = get_or_create_rank_entry(db, student)

        assert entry1.id == entry2.id

    def test_creates_with_default_country(self, db):
        """Test that default country is India."""
        user = User(
            name="No Country",
            email="nocountry@test.com",
            password_hash="hash",
            role=UserRole.student,
            is_active=True,
        )
        db.add(user)
        db.commit()

        entry = get_or_create_rank_entry(db, user)
        assert entry.country == "India"


class TestCalculateQuizScore:
    """Tests for calculate_quiz_score function."""

    def test_no_attempts_returns_zero(self, db, test_users):
        """Test that no quiz attempts returns 0."""
        student = test_users["student"]
        score = calculate_quiz_score(db, student.id)
        assert score == 0.0

    def test_single_quiz_single_attempt(self, db, test_users, test_course):
        """Test quiz score with single attempt."""
        student = test_users["student"]
        mentor = test_users["mentor"]

        from app.models.quiz import Quiz
        quiz = Quiz(course_id=test_course.id, mentor_id=mentor.id, title="Quiz")
        db.add(quiz)
        db.commit()

        attempt = QuizAttempt(
            quiz_id=quiz.id,
            student_id=student.id,
            answers=json.dumps({}),
            score=80.0,
            total_points=10,
            earned_points=8,
            passed=True,
        )
        db.add(attempt)
        db.commit()

        score = calculate_quiz_score(db, student.id)
        assert score == 80.0

    def test_multiple_quizzes_best_scores(self, db, test_users, test_course):
        """Test that quiz score uses best attempt per quiz."""
        student = test_users["student"]
        mentor = test_users["mentor"]

        from app.models.quiz import Quiz
        quiz1 = Quiz(course_id=test_course.id, mentor_id=mentor.id, title="Quiz 1")
        quiz2 = Quiz(course_id=test_course.id, mentor_id=mentor.id, title="Quiz 2")
        db.add(quiz1)
        db.add(quiz2)
        db.commit()

        # Quiz 1: attempts 60, 90 (best = 90)
        for score in [60.0, 90.0]:
            db.add(QuizAttempt(
                quiz_id=quiz1.id, student_id=student.id,
                answers=json.dumps({}), score=score,
                total_points=10, earned_points=int(score/10), passed=True,
            ))

        # Quiz 2: attempt 70
        db.add(QuizAttempt(
            quiz_id=quiz2.id, student_id=student.id,
            answers=json.dumps({}), score=70.0,
            total_points=10, earned_points=7, passed=True,
        ))
        db.commit()

        score = calculate_quiz_score(db, student.id)
        # Average of best scores: (90 + 70) / 2 = 80.0
        assert score == 80.0


class TestCalculateAssignmentScore:
    """Tests for calculate_assignment_score function."""

    def test_no_submissions_returns_zero(self, db, test_users):
        """Test that no submissions returns 0."""
        student = test_users["student"]
        score = calculate_assignment_score(db, student.id)
        assert score == 0.0

    def test_ungraded_submissions_ignored(self, db, test_users, test_course):
        """Test that ungraded submissions are ignored."""
        student = test_users["student"]
        mentor = test_users["mentor"]

        from app.models.assignment import Assignment
        assignment = Assignment(
            course_id=test_course.id, mentor_id=mentor.id,
            title="Assignment", max_score=100.0,
        )
        db.add(assignment)
        db.commit()

        sub = Submission(
            assignment_id=assignment.id, student_id=student.id,
            content="answer", is_graded=False, score=None,
        )
        db.add(sub)
        db.commit()

        score = calculate_assignment_score(db, student.id)
        assert score == 0.0

    def test_graded_submissions_average(self, db, test_users, test_course):
        """Test average of graded submission scores."""
        student = test_users["student"]
        mentor = test_users["mentor"]

        from app.models.assignment import Assignment
        assignment = Assignment(
            course_id=test_course.id, mentor_id=mentor.id,
            title="Assignment", max_score=100.0,
        )
        db.add(assignment)
        db.commit()

        for score_val in [80.0, 90.0, 100.0]:
            sub = Submission(
                assignment_id=assignment.id, student_id=student.id,
                content="answer", is_graded=True, score=score_val,
            )
            db.add(sub)
        db.commit()

        score = calculate_assignment_score(db, student.id)
        assert score == pytest.approx(90.0, rel=1e-2)


class TestCalculateCompletionScore:
    """Tests for calculate_completion_score function."""

    def test_no_enrollments_returns_zero(self, db, test_users):
        """Test that no enrollments returns 0."""
        student = test_users["student"]
        score = calculate_completion_score(db, student.id)
        assert score == 0.0

    def test_unapproved_enrollments_ignored(self, db, test_users, test_course):
        """Test that unapproved enrollments are ignored."""
        student = test_users["student"]
        enrollment = Enrollment(
            student_id=student.id, course_id=test_course.id,
            progress=50.0, is_approved=False,
        )
        db.add(enrollment)
        db.commit()

        score = calculate_completion_score(db, student.id)
        assert score == 0.0

    def test_average_completion(self, db, test_users, test_course):
        """Test average completion across approved enrollments."""
        student = test_users["student"]
        mentor = test_users["mentor"]

        from app.models.course import Course, CourseStatus, CourseLevel
        course2 = Course(
            mentor_id=mentor.id, title="Course 2",
            status=CourseStatus.approved, level=CourseLevel.beginner,
        )
        db.add(course2)
        db.commit()

        for course, progress in [(test_course, 25.0), (course2, 75.0)]:
            enrollment = Enrollment(
                student_id=student.id, course_id=course.id,
                progress=progress, is_approved=True,
            )
            db.add(enrollment)
        db.commit()

        score = calculate_completion_score(db, student.id)
        assert score == pytest.approx(50.0, rel=1e-2)


class TestCalculateStreakScore:
    """Tests for calculate_streak_score function."""

    def test_zero_streak(self):
        """Test streak score for 0 days."""
        assert calculate_streak_score(0) == 0.0

    def test_half_streak(self):
        """Test streak score for 15 days (half of cap)."""
        score = calculate_streak_score(15)
        assert score == pytest.approx(50.0, rel=1e-2)

    def test_max_streak(self):
        """Test streak score caps at 30 days."""
        score = calculate_streak_score(30)
        assert score == 100.0

    def test_over_max_streak(self):
        """Test streak score stays at 100 for >30 days."""
        score = calculate_streak_score(100)
        assert score == 100.0

    def test_one_day(self):
        """Test streak score for 1 day."""
        score = calculate_streak_score(1)
        assert score == pytest.approx(100.0 / 30, rel=1e-2)


class TestComputeRankScore:
    """Tests for compute_rank_score function."""

    def test_all_zeros(self):
        """Test rank score with all zeros."""
        score = compute_rank_score(0, 0, 0, 0, 0)
        assert score == 0.0

    def test_all_max(self):
        """Test rank score with all 100s."""
        score = compute_rank_score(100, 100, 100, 100, 100)
        assert score == 100.0


class TestUpdateUserRanking:
    """Tests for update_user_ranking function."""

    def test_updates_rank_for_student(self, db, test_users):
        """Test updating ranking for a student."""
        student = test_users["student"]
        entry = update_user_ranking(db, student)

        assert entry.user_id == student.id
        assert entry.rank_score >= 0.0
        assert entry.xp >= 0.0

    def test_raises_for_non_student(self, db, test_users):
        """Test that non-student users raise ValueError."""
        admin = test_users["admin"]
        with pytest.raises(ValueError, match="only available for students"):
            update_user_ranking(db, admin)

    def test_raises_for_mentor(self, db, test_users):
        """Test that mentor raises ValueError."""
        mentor = test_users["mentor"]
        with pytest.raises(ValueError, match="only available for students"):
            update_user_ranking(db, mentor)

    def test_updates_user_fields(self, db, test_users):
        """Test that user rank_score and xp are updated."""
        student = test_users["student"]
        update_user_ranking(db, student)

        db.refresh(student)
        assert student.rank_score >= 0.0
        assert student.xp >= 0.0


class TestUpdateStreak:
    """Tests for update_streak function."""

    def test_first_activity_sets_streak_to_one(self, db, test_users):
        """Test first activity sets streak to 1."""
        student = test_users["student"]
        entry = update_streak(db, student)
        assert entry.streak_days == 1

    def test_consecutive_day_increments(self, db, test_users):
        """Test consecutive day increments streak."""
        student = test_users["student"]
        entry = get_or_create_rank_entry(db, student)
        entry.streak_days = 1  # User already has a 1-day streak
        entry.last_active = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1)
        db.commit()

        entry = update_streak(db, student)
        assert entry.streak_days == 2

    def test_gap_resets_streak(self, db, test_users):
        """Test gap > 1 day resets streak."""
        student = test_users["student"]
        entry = get_or_create_rank_entry(db, student)
        entry.streak_days = 10
        entry.last_active = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=5)
        db.commit()

        entry = update_streak(db, student)
        assert entry.streak_days == 1

    def test_same_day_does_not_increment(self, db, test_users):
        """Test same-day activity does not increment streak."""
        student = test_users["student"]
        entry = get_or_create_rank_entry(db, student)
        entry.streak_days = 5
        entry.last_active = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()

        entry = update_streak(db, student)
        assert entry.streak_days == 5


class TestGetGlobalLeaderboard:
    """Tests for get_indian_leaderboard function."""

    def test_empty_leaderboard(self, db):
        """Test leaderboard with no entries."""
        entries, total = get_indian_leaderboard(db)
        assert entries == []
        assert total == 0

    def test_excludes_non_students(self, db, test_users):
        """Test that non-students are excluded from leaderboard."""
        admin = test_users["admin"]
        get_or_create_rank_entry(db, admin)

        entries, total = get_indian_leaderboard(db)
        user_ids = [e.user_id for e in entries]
        assert admin.id not in user_ids

    def test_pagination(self, db, test_users):
        """Test leaderboard pagination."""
        student = test_users["student"]
        entry = get_or_create_rank_entry(db, student)
        entry.rank_score = 50.0
        db.commit()

        # Create more students
        for i in range(5):
            u = User(
                name=f"Student {i}",
                email=f"student{i}@test.com",
                password_hash="hash",
                role=UserRole.student,
                is_active=True,
            )
            db.add(u)
            db.commit()
            re = get_or_create_rank_entry(db, u)
            re.rank_score = float(i)
            db.commit()

        entries_page1, total = get_indian_leaderboard(db, skip=0, limit=3)
        assert len(entries_page1) == 3
        assert total == 6  # 5 + original student

        entries_page2, _ = get_indian_leaderboard(db, skip=3, limit=3)
        assert len(entries_page2) == 3

    def test_sorted_by_rank_score(self, db, test_users):
        """Test that leaderboard is sorted by rank_score descending."""
        student = test_users["student"]
        e1 = get_or_create_rank_entry(db, student)
        e1.rank_score = 10.0
        db.commit()

        u2 = User(name="S2", email="s2@test.com", password_hash="hash", role=UserRole.student, is_active=True)
        db.add(u2)
        db.commit()
        e2 = get_or_create_rank_entry(db, u2)
        e2.rank_score = 90.0
        db.commit()

        entries, _ = get_indian_leaderboard(db)
        assert entries[0].rank_score >= entries[1].rank_score


class TestGetStateLeaderboard:
    """Tests for get_state_leaderboard function."""

    def test_filters_by_state(self, db, test_users):
        """Test state leaderboard filters by state."""
        student = test_users["student"]
        entry = get_or_create_rank_entry(db, student)
        entry.state = "Kerala"
        entry.rank_score = 50.0
        db.commit()

        entries, total = get_state_leaderboard(db, "Kerala")
        assert total >= 1
        for e in entries:
            assert e.state == "Kerala"

    def test_empty_state(self, db):
        """Test state leaderboard with no entries."""
        entries, total = get_state_leaderboard(db, "NonExistentState")
        assert entries == []
        assert total == 0


class TestGetDistrictLeaderboard:
    """Tests for get_district_leaderboard function."""

    def test_filters_by_district(self, db, test_users):
        """Test district leaderboard filters by district."""
        student = test_users["student"]
        entry = get_or_create_rank_entry(db, student)
        entry.district = "Thiruvananthapuram"
        entry.rank_score = 50.0
        db.commit()

        entries, total = get_district_leaderboard(db, "Thiruvananthapuram")
        assert total >= 1
        for e in entries:
            assert e.district == "Thiruvananthapuram"

    def test_empty_district(self, db):
        """Test district leaderboard with no entries."""
        entries, total = get_district_leaderboard(db, "NonExistentDistrict")
        assert entries == []
        assert total == 0


class TestGetMyRanks:
    """Tests for get_my_ranks function."""

    def test_returns_all_fields(self, db, test_users):
        """Test that all rank fields are returned."""
        student = test_users["student"]
        result = get_my_ranks(db, student)

        assert "indian_rank" in result
        assert "state_rank" in result
        assert "district_rank" in result
        assert "rank_score" in result
        assert "quiz_score" in result
        assert "assignment_score" in result
        assert "completion_score" in result
        assert "streak_score" in result
        assert "xp" in result
        assert "streak_days" in result

    def test_single_student_is_rank_one(self, db, test_users):
        """Test that sole student is rank 1."""
        student = test_users["student"]
        result = get_my_ranks(db, student)
        assert result["indian_rank"] == 1

    def test_rank_relative_to_others(self, db, test_users):
        """Test rank calculation relative to other students."""
        student = test_users["student"]
        entry = get_or_create_rank_entry(db, student)
        entry.rank_score = 50.0
        db.commit()

        # Create a student with higher score
        u2 = User(name="Better", email="better@test.com", password_hash="hash", role=UserRole.student, is_active=True)
        db.add(u2)
        db.commit()
        e2 = get_or_create_rank_entry(db, u2)
        e2.rank_score = 80.0
        db.commit()

        result = get_my_ranks(db, student)
        assert result["indian_rank"] == 2

    def test_state_and_district_rank_with_location(self, db, test_users):
        """Test state/district rank when user has location."""
        student = test_users["student"]
        result = get_my_ranks(db, student)

        if student.state:
            assert result["state_rank"] is not None
        if student.district:
            assert result["district_rank"] is not None

    def test_no_location_gives_none_ranks(self, db):
        """Test that user without location has None state/district rank."""
        user = User(
            name="No Location",
            email="noloc@test.com",
            password_hash="hash",
            role=UserRole.student,
            state=None,
            district=None,
            is_active=True,
        )
        db.add(user)
        db.commit()

        result = get_my_ranks(db, user)
        assert result["state_rank"] is None
        assert result["district_rank"] is None
