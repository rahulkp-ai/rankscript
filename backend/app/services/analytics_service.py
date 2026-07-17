from sqlalchemy.orm import Session
from uuid import UUID

from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment
from app.models.quiz_attempt import QuizAttempt
from app.models.submission import Submission
from app.models.assignment import Assignment
from app.models.quiz import Quiz
from app.models.lesson import Lesson
from app.models.ranking import RankEntry
from app.services.ranking_service import get_my_ranks


def get_student_analytics(db: Session, user: User) -> dict:
    # Enrollments
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == user.id
    ).all()
    total_enrolled   = len(enrollments)
    total_completed  = sum(1 for e in enrollments if e.is_completed)

    # Quiz attempts
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == user.id
    ).all()
    total_attempts = len(attempts)
    passed_quizzes = sum(1 for a in attempts if a.passed)
    avg_quiz_score = (
        sum(a.score for a in attempts) / total_attempts
        if total_attempts > 0 else 0.0
    )

    # Assignments
    course_ids = [e.course_id for e in enrollments]
    all_assignments = []
    if course_ids:
        all_assignments = db.query(Assignment).filter(
            Assignment.course_id.in_(course_ids)
        ).all()

    submissions = db.query(Submission).filter(
        Submission.student_id == user.id
    ).all()
    graded = [s for s in submissions if s.is_graded]
    avg_assignment_score = (
        sum(s.score for s in graded if s.score) / len(graded)
        if graded else 0.0
    )

    # Ranking
    ranks = get_my_ranks(db, user)

    # Streak
    entry = db.query(RankEntry).filter(RankEntry.user_id == user.id).first()
    streak = entry.streak_days if entry else 0

    return {
        "total_enrolled":        total_enrolled,
        "total_completed":       total_completed,
        "avg_quiz_score":        round(avg_quiz_score, 1),
        "total_assignments":     len(all_assignments),
        "submitted_assignments": len(submissions),
        "graded_assignments":    len(graded),
        "avg_assignment_score":  round(avg_assignment_score, 1),
        "total_quiz_attempts":   total_attempts,
        "passed_quizzes":        passed_quizzes,
        "current_streak":        streak,
        "rank_score":            ranks["rank_score"],
        "indian_rank":           ranks["indian_rank"],
        "state_rank":            ranks["state_rank"],
    }


def get_mentor_analytics(db: Session, mentor: User) -> dict:
    courses = db.query(Course).filter(Course.mentor_id == mentor.id).all()

    total_students      = 0
    total_lessons_count = 0
    total_quizzes_count = 0
    total_assignments_count = 0
    pending_submissions_count = 0
    completion_rates    = []
    quiz_scores         = []
    course_stats        = []

    for course in courses:
        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course.id
        ).all()
        enrolled   = len(enrollments)
        completed  = sum(1 for e in enrollments if e.is_completed)
        comp_rate  = (completed / enrolled * 100) if enrolled > 0 else 0.0
        completion_rates.append(comp_rate)
        total_students += enrolled

        lessons     = db.query(Lesson).filter(Lesson.course_id == course.id).count()
        quizzes     = db.query(Quiz).filter(Quiz.course_id == course.id).all()
        assignments = db.query(Assignment).filter(Assignment.course_id == course.id).all()

        total_lessons_count     += lessons
        total_quizzes_count     += len(quizzes)
        total_assignments_count += len(assignments)

        # Quiz scores for this course
        for quiz in quizzes:
            attempts = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == quiz.id
            ).all()
            if attempts:
                quiz_scores.append(sum(a.score for a in attempts) / len(attempts))

        # Pending submissions
        pending = 0
        for assignment in assignments:
            pending += db.query(Submission).filter(
                Submission.assignment_id == assignment.id,
                Submission.is_graded == False,
            ).count()
        pending_submissions_count += pending

        course_stats.append({
            "course_id":          str(course.id),
            "course_title":       course.title,
            "total_enrolled":     enrolled,
            "total_completed":    completed,
            "completion_rate":    round(comp_rate, 1),
            "avg_quiz_score":     round(sum(quiz_scores[-len(quizzes):]) / len(quizzes), 1) if quizzes and quiz_scores else 0.0,
            "total_lessons":      lessons,
            "total_quizzes":      len(quizzes),
            "total_assignments":  len(assignments),
            "pending_submissions": pending,
        })

    return {
        "total_courses":       len(courses),
        "total_students":      total_students,
        "total_lessons":       total_lessons_count,
        "total_quizzes":       total_quizzes_count,
        "total_assignments":   total_assignments_count,
        "pending_submissions": pending_submissions_count,
        "avg_completion_rate": round(sum(completion_rates) / len(completion_rates), 1) if completion_rates else 0.0,
        "avg_quiz_score":      round(sum(quiz_scores) / len(quiz_scores), 1) if quiz_scores else 0.0,
        "courses":             course_stats,
    }


def get_admin_analytics(db: Session) -> dict:
    total_users    = db.query(User).count()
    total_students = db.query(User).filter(User.role == UserRole.student).count()
    total_mentors  = db.query(User).filter(User.role == UserRole.mentor).count()
    total_admins   = db.query(User).filter(User.role == UserRole.admin).count()

    total_courses   = db.query(Course).count()
    approved        = db.query(Course).filter(Course.status == CourseStatus.approved).count()
    pending         = db.query(Course).filter(Course.status == CourseStatus.pending).count()

    total_enrollments  = db.query(Enrollment).count()
    completed_enr      = db.query(Enrollment).filter(Enrollment.is_completed == True).count()
    platform_completion = (completed_enr / total_enrollments * 100) if total_enrollments > 0 else 0.0

    total_attempts    = db.query(QuizAttempt).count()
    total_submissions = db.query(Submission).count()

    # Top 10 students by rank score
    top_entries = (
        db.query(RankEntry)
        .order_by(RankEntry.rank_score.desc())
        .limit(10)
        .all()
    )
    top_students = []
    for entry in top_entries:
        user = entry.user
        if user:
            top_students.append({
                "user_id":    str(entry.user_id),
                "name":       user.name,
                "rank_score": entry.rank_score,
                "xp":         entry.xp,
                "state":      user.state,
                "district":   user.district,
            })

    return {
        "total_users":            total_users,
        "total_students":         total_students,
        "total_mentors":          total_mentors,
        "total_admins":           total_admins,
        "total_courses":          total_courses,
        "approved_courses":       approved,
        "pending_courses":        pending,
        "total_enrollments":      total_enrollments,
        "total_quiz_attempts":    total_attempts,
        "total_submissions":      total_submissions,
        "platform_completion_rate": round(platform_completion, 1),
        "top_students":           top_students,
    }