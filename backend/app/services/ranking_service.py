from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.ranking import RankEntry
from app.models.user import User, UserRole
from app.models.quiz_attempt import QuizAttempt
from app.models.submission import Submission
from app.models.enrollment import Enrollment

WEIGHTS = {
    "quiz":       0.40,
    "assignment": 0.30,
    "completion": 0.15,
    "streak":     0.15,
}

def get_or_create_rank_entry(db: Session, user: User) -> RankEntry:
    """Get existing rank entry or create new one for user.
    
    Args:
        db: Database session
        user: User to get/create entry for
        
    Returns:
        RankEntry: Existing or new rank entry
    """
    entry = db.query(RankEntry).filter(RankEntry.user_id == user.id).first()
    if not entry:
        entry = RankEntry(
            user_id=user.id,
            state=user.state,
            district=user.district,
            country=user.country or "India",
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
    return entry

def calculate_quiz_score(db: Session, user_id: UUID) -> float:
    """Calculate average best score across all quizzes attempted.
    
    Args:
        db: Database session
        user_id: UUID of the user
        
    Returns:
        float: Average of best scores (0-100)
    """
    attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == user_id).all()
    if not attempts:
        return 0.0
    quiz_ids = set(str(a.quiz_id) for a in attempts)
    best_scores = [max(a.score for a in attempts if str(a.quiz_id) == qid) for qid in quiz_ids]
    if not best_scores:
        return 0.0
    return sum(best_scores) / len(best_scores)

def calculate_assignment_score(db: Session, user_id: UUID) -> float:
    """Calculate average score across all graded submissions.
    
    Args:
        db: Database session
        user_id: UUID of the user
        
    Returns:
        float: Average submission score (0-100)
    """
    submissions = db.query(Submission).filter(
        Submission.student_id == user_id, Submission.is_graded == True,
    ).all()
    scores = [s.score for s in submissions if s.score is not None]
    return sum(scores) / len(scores) if scores else 0.0

def calculate_completion_score(db: Session, user_id: UUID) -> float:
    """Calculate average completion percentage across all enrolled courses.
    
    Args:
        db: Database session
        user_id: UUID of the user
        
    Returns:
        float: Average completion percentage (0-100)
    """
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == user_id, Enrollment.is_approved == True,
    ).all()
    if not enrollments:
        return 0.0
    return sum(e.progress for e in enrollments) / len(enrollments)

def calculate_streak_score(streak_days: int) -> float:
    """Convert streak days to a 0-100 score (caps at 30 days).
    
    Args:
        streak_days: Number of consecutive days user has been active
        
    Returns:
        float: Streak score (0-100)
    """
    return min(streak_days / 30 * 100, 100.0)

def compute_rank_score(quiz: float, assignment: float, completion: float, streak: float) -> float:
    """Calculate overall rank score using weighted formula.
    
    Rank Score = (Quiz × 0.4) + (Assignment × 0.3)
               + (Completion × 0.15) + (Streak × 0.15)
    
    Args:
        quiz: Quiz score (0-100)
        assignment: Assignment score (0-100)
        completion: Course completion score (0-100)
        streak: Streak score (0-100)
        
    Returns:
        float: Weighted rank score (rounded to 2 decimal places)
    """
    return round(
        quiz * WEIGHTS["quiz"] + assignment * WEIGHTS["assignment"] +
        completion * WEIGHTS["completion"] + streak * WEIGHTS["streak"], 2
    )

def update_user_ranking(db: Session, user: User) -> RankEntry:
    """Recalculate and save rank score for a user.
    
    Args:
        db: Database session
        user: User to update ranking for
        
    Returns:
        RankEntry: The updated ranking entry
        
    Raises:
        ValueError: If user is not a student
    """
    # Skip ranking for non-student roles
    if user.role != UserRole.student:
        raise ValueError("Ranking is only available for students")

    entry = get_or_create_rank_entry(db, user)
    quiz_score       = calculate_quiz_score(db, user.id)
    assignment_score = calculate_assignment_score(db, user.id)
    completion_score = calculate_completion_score(db, user.id)
    streak_score     = calculate_streak_score(entry.streak_days)
    rank_score       = compute_rank_score(quiz_score, assignment_score, completion_score, streak_score)

    entry.quiz_score       = round(quiz_score, 2)
    entry.assignment_score = round(assignment_score, 2)
    entry.completion_score = round(completion_score, 2)
    entry.streak_score     = round(streak_score, 2)
    entry.rank_score       = rank_score
    entry.last_active      = datetime.now(timezone.utc).replace(tzinfo=None)
    entry.xp               = round(rank_score * 10, 1)

    user.rank_score = rank_score
    user.xp = entry.xp
    db.commit()
    db.refresh(entry)
    return entry

def update_streak(db: Session, user: User) -> RankEntry:
    """Update daily streak for a user and recalculate ranking.
    Only applies to students — silently skips other roles.
    """
    # Skip streak/ranking for non-student roles
    if user.role != UserRole.student:
        return None

    entry = get_or_create_rank_entry(db, user)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if entry.last_active:
        last_date = entry.last_active.date()
        today = now.date()
        delta_days = (today - last_date).days
        if delta_days == 1:
            entry.streak_days += 1
        elif delta_days > 1:
            entry.streak_days = 1
    else:
        entry.streak_days = 1
    db.commit()
    return update_user_ranking(db, user)

def get_indian_leaderboard(db: Session, skip: int = 0, limit: int = 50):
    """Get top users by rank score across India.
    
    Args:
        db: Database session
        skip: Number of entries to skip (pagination)
        limit: Maximum number of entries to return
        
    Returns:
        Tuple: (list of RankEntry, total count)
    """
    # Only students in leaderboard
    entries = (
        db.query(RankEntry)
        .join(User, RankEntry.user_id == User.id)
        .filter(User.role == UserRole.student)
        .order_by(RankEntry.rank_score.desc())
        .offset(skip).limit(limit).all()
    )
    total = db.query(RankEntry).join(User).filter(User.role == UserRole.student).count()
    return entries, total

def get_state_leaderboard(db: Session, state: str, skip: int = 0, limit: int = 50):
    """Get top users by rank score within a specific state.
    
    Args:
        db: Database session
        state: State to filter by
        skip: Number of entries to skip (pagination)
        limit: Maximum number of entries to return
        
    Returns:
        Tuple: (list of RankEntry, total count)
    """
    entries = (
        db.query(RankEntry)
        .join(User, RankEntry.user_id == User.id)
        .filter(User.role == UserRole.student, RankEntry.state == state)
        .order_by(RankEntry.rank_score.desc())
        .offset(skip).limit(limit).all()
    )
    total = db.query(RankEntry).join(User).filter(User.role == UserRole.student, RankEntry.state == state).count()
    return entries, total

def get_district_leaderboard(db: Session, district: str, skip: int = 0, limit: int = 50):
    """Get top users by rank score within a specific district.
    
    Args:
        db: Database session
        district: District to filter by
        skip: Number of entries to skip (pagination)
        limit: Maximum number of entries to return
        
    Returns:
        Tuple: (list of RankEntry, total count)
    """
    entries = (
        db.query(RankEntry)
        .join(User, RankEntry.user_id == User.id)
        .filter(User.role == UserRole.student, RankEntry.district == district)
        .order_by(RankEntry.rank_score.desc())
        .offset(skip).limit(limit).all()
    )
    total = db.query(RankEntry).join(User).filter(User.role == UserRole.student, RankEntry.district == district).count()
    return entries, total

def get_my_ranks(db: Session, user: User) -> dict:
    """Get rank positions for the current user at all levels.
    
    Args:
        db: Database session
        user: Current user
        
    Returns:
        dict: Dictionary containing indian_rank, state_rank, district_rank, rank_score, etc.
    """
    entry = get_or_create_rank_entry(db, user)
    indian_rank = (
        db.query(RankEntry).join(User)
        .filter(User.role == UserRole.student, RankEntry.rank_score > entry.rank_score)
        .count()
    ) + 1
    state_rank = None
    if user.state:
        state_rank = (
            db.query(RankEntry).join(User)
            .filter(User.role == UserRole.student, RankEntry.state == user.state, RankEntry.rank_score > entry.rank_score)
            .count()
        ) + 1
    district_rank = None
    if user.district:
        district_rank = (
            db.query(RankEntry).join(User)
            .filter(User.role == UserRole.student, RankEntry.district == user.district, RankEntry.rank_score > entry.rank_score)
            .count()
        ) + 1
    return {
        "indian_rank": indian_rank, "state_rank": state_rank, "district_rank": district_rank,
        "rank_score": entry.rank_score, "quiz_score": entry.quiz_score,
        "assignment_score": entry.assignment_score, "completion_score": entry.completion_score,
        "streak_score": entry.streak_score, "xp": entry.xp, "streak_days": entry.streak_days,
    }