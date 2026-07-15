import uuid  # Fixed: was missing the actual import statement
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, desc, cast, String  # Added: cast and String
from typing import Optional

from app.db.session import get_db
from app.api.deps import get_admin, get_current_user
from app.core.security import verify_password
from app.models.user import User, UserRole
from app.models.ranking import RankEntry
from app.models.enrollment import Enrollment
from app.models.quiz_attempt import QuizAttempt
from app.models.submission import Submission
from app.models.course import Course
from app.models.quiz import Quiz
from app.models.assignment import Assignment
from app.models.audit_log import AuditLog
from app.schemas.admin import (
    AdminUserEntry,
    AdminLeaderboardResponse,
    GeographicStats,
    GeographicFilters,
    StateDistrictOption,
    UserDetailResponse,
    RemoveStudentRequest,
    RemoveMentorRequest,
    AuditLogEntry,
    AuditLogResponse,
    MentorOption,
    RemoveResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin Management"])


def generate_reference_id() -> str:
    """Generate a unique audit reference ID."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    short_uuid = uuid.uuid4().hex[:8].upper()
    return f"AUD-{ts}-{short_uuid}"


@router.get("/leaderboard", response_model=AdminLeaderboardResponse)
def get_admin_leaderboard(
    role: str = Query(default="student", pattern="^(student|mentor)$"),
    search: Optional[str] = Query(default=None, max_length=100),
    state: Optional[str] = Query(default=None, max_length=100),
    district: Optional[str] = Query(default=None, max_length=100),
    sort_by: str = Query(default="rank_score", pattern="^(rank_score|xp|name|created_at|streak_days)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Get paginated leaderboard for students or mentors with filters."""
    user_role = UserRole.student if role == "student" else UserRole.mentor
    query = db.query(User).filter(User.role == user_role)

    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(User.name).like(search_term),
                func.lower(User.email).like(search_term),
                # FIX: Explicitly use cast() function to avoid TypeEngine errors
                cast(User.id, String).ilike(search_term),
            )
        )

    if state:
        query = query.filter(User.state == state)
    if district:
        query = query.filter(User.district == district)

    total = query.count()

    sort_column = getattr(User, sort_by, User.rank_score)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    offset = (page - 1) * per_page
    users = query.offset(offset).limit(per_page).all()

    entries = []
    for u in users:
        entries.append(AdminUserEntry(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role.value if hasattr(u.role, 'value') else str(u.role),
            country=u.country,
            state=u.state,
            district=u.district,
            xp=u.xp,
            rank_score=u.rank_score,
            streak_days=u.streak_days,
            is_active=u.is_active,
            is_verified=u.is_verified,
            avatar_url=u.avatar_url,
            bio=u.bio,
            created_at=u.created_at,
            last_login=u.last_login,
        ))

    total_pages = max(1, (total + per_page - 1) // per_page)

    return AdminLeaderboardResponse(
        entries=entries,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/search", response_model=list[AdminUserEntry])
def search_users(
    q: str = Query(..., min_length=1, max_length=100),
    role: Optional[str] = Query(default=None, pattern="^(student|mentor)$"),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Real-time search for users by name, email, or ID."""
    search_term = f"%{q.lower()}%"
    # FIX: Explicitly use cast() function to avoid TypeEngine errors
    query = db.query(User).filter(
        or_(
            func.lower(User.name).like(search_term),
            func.lower(User.email).like(search_term),
            cast(User.id, String).ilike(search_term),
        )
    )
    if role:
        user_role = UserRole.student if role == "student" else UserRole.mentor
        query = query.filter(User.role == user_role)

    users = query.order_by(User.name).limit(limit).all()
    return [
        AdminUserEntry(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role.value if hasattr(u.role, 'value') else str(u.role),
            country=u.country,
            state=u.state,
            district=u.district,
            xp=u.xp,
            rank_score=u.rank_score,
            streak_days=u.streak_days,
            is_active=u.is_active,
            is_verified=u.is_verified,
            avatar_url=u.avatar_url,
            bio=u.bio,
            created_at=u.created_at,
            last_login=u.last_login,
        )
        for u in users
    ]


@router.get("/geographic-filters", response_model=GeographicFilters)
def get_geographic_filters(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Get available states and districts with user counts."""
    state_rows = (
        db.query(User.state, func.count(User.id).label("count"))
        .filter(User.state.isnot(None), User.state != "")
        .group_by(User.state)
        .order_by(User.state)
        .all()
    )
    district_rows = (
        db.query(User.district, func.count(User.id).label("count"))
        .filter(User.district.isnot(None), User.district != "")
        .group_by(User.district)
        .order_by(User.district)
        .all()
    )

    return GeographicFilters(
        states=[StateDistrictOption(name=r[0], count=r[1]) for r in state_rows],
        districts=[StateDistrictOption(name=r[0], count=r[1]) for r in district_rows],
    )


@router.get("/districts-for-state")
def get_districts_for_state(
    state: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Get districts for a specific state with user counts."""
    rows = (
        db.query(User.district, func.count(User.id).label("count"))
        .filter(User.state == state, User.district.isnot(None), User.district != "")
        .group_by(User.district)
        .order_by(User.district)
        .all()
    )
    return [StateDistrictOption(name=r[0], count=r[1]) for r in rows]


@router.get("/geographic-stats", response_model=GeographicStats)
def get_geographic_stats(
    role: str = Query(default="student", pattern="^(student|mentor)$"),
    state: Optional[str] = Query(default=None),
    district: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Get aggregate statistics for a geographic filter."""
    user_role = UserRole.student if role == "student" else UserRole.mentor
    query = db.query(User).filter(User.role == user_role)

    if state:
        query = query.filter(User.state == state)
    if district:
        query = query.filter(User.district == district)

    total_users = query.count()
    avg_score = query.with_entities(func.avg(User.rank_score)).scalar() or 0.0

    top_user = query.order_by(desc(User.rank_score)).first()
    top_name = top_user.name if top_user else None
    top_score = top_user.rank_score if top_user else 0.0

    return GeographicStats(
        total_users=total_users,
        average_score=round(float(avg_score), 2),
        top_performer=top_name,
        top_score=round(float(top_score), 2),
    )


@router.get("/user/{user_id}", response_model=UserDetailResponse)
def get_user_detail(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Get detailed user profile for admin view."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = user.role.value if hasattr(user.role, 'value') else str(user.role)

    enrollments = []
    quiz_attempts_count = 0
    submissions_count = 0
    assigned_mentor = None
    courses_count = 0
    assigned_students = []

    if role == "student":
        enrolls = (
            db.query(Enrollment)
            .options(joinedload(Enrollment.course))
            .filter(Enrollment.student_id == user.id)
            .all()
        )
        for e in enrolls:
            course = e.course
            enrollments.append({
                "id": str(e.id),
                "course_id": str(e.course_id),
                "course_title": course.title if course else "Unknown",
                "progress": e.progress,
                "is_approved": e.is_approved,
                "is_completed": e.is_completed,
                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            })
        quiz_attempts_count = db.query(QuizAttempt).filter(QuizAttempt.student_id == user.id).count()
        submissions_count = db.query(Submission).filter(Submission.student_id == user.id).count()

    elif role == "mentor":
        courses_count = db.query(Course).filter(Course.mentor_id == user.id).count()
        mentor_courses = db.query(Course).filter(Course.mentor_id == user.id).all()
        course_ids = [c.id for c in mentor_courses]
        if course_ids:
            student_ids = (
                db.query(Enrollment.student_id)
                .filter(Enrollment.course_id.in_(course_ids))
                .distinct()
                .all()
            )
            for sid in student_ids:
                student = db.query(User).filter(User.id == sid[0]).first()
                if student:
                    assigned_students.append({
                        "id": str(student.id),
                        "name": student.name,
                        "email": student.email,
                    })

    return UserDetailResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=role,
        country=user.country,
        state=user.state,
        district=user.district,
        xp=user.xp,
        rank_score=user.rank_score,
        streak_days=user.streak_days,
        is_active=user.is_active,
        is_verified=user.is_verified,
        avatar_url=user.avatar_url,
        bio=user.bio,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login,
        enrollments=enrollments,
        quiz_attempts_count=quiz_attempts_count,
        submissions_count=submissions_count,
        assigned_mentor=assigned_mentor,
        courses_count=courses_count,
        assigned_students=assigned_students,
    )


@router.delete("/remove-student/{user_id}", response_model=RemoveResponse)
def remove_student(
    user_id: uuid.UUID,
    body: RemoveStudentRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin),
):
    """Permanently remove a student and all associated data."""
    student = db.query(User).filter(User.id == user_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.name.lower() != body.confirmation_name.strip().lower():
        raise HTTPException(status_code=400, detail="Student name does not match")

    if not verify_password(body.admin_password, admin.password_hash):
        raise HTTPException(status_code=403, detail="Invalid admin password")

    student_name = student.name
    student_email = student.email
    reference_id = generate_reference_id()

    try:
        db.query(QuizAttempt).filter(QuizAttempt.student_id == user_id).delete()
        db.query(Submission).filter(Submission.student_id == user_id).delete()
        db.query(Enrollment).filter(Enrollment.student_id == user_id).delete()
        db.query(RankEntry).filter(RankEntry.user_id == user_id).delete()

        audit = AuditLog(
            admin_id=admin.id,
            action="remove_student",
            target_user_id=None,
            target_name=student_name,
            target_email=student_email,
            target_role="student",
            details=json.dumps({
                "reason": "Admin-initiated removal",
                "removed_user_id": str(user_id),
                "enrollments_deleted": True,
                "quiz_attempts_deleted": True,
                "submissions_deleted": True,
                "rank_entry_deleted": True,
            }),
            reference_id=reference_id,
        )
        db.add(audit)
        db.delete(student)
        db.commit()

        return RemoveResponse(
            success=True,
            message=f"Student '{student_name}' has been permanently removed.",
            reference_id=reference_id,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove student: {str(e)}")


@router.get("/mentors-for-reassignment", response_model=list[MentorOption])
def get_mentors_for_reassignment(
    exclude_id: Optional[uuid.UUID] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Get list of mentors available for student reassignment."""
    query = db.query(User).filter(User.role == UserRole.mentor, User.is_active == True)
    if exclude_id:
        query = query.filter(User.id != exclude_id)
    mentors = query.order_by(User.name).all()
    return [MentorOption(id=m.id, name=m.name, email=m.email) for m in mentors]


@router.delete("/remove-mentor/{user_id}", response_model=RemoveResponse)
def remove_mentor(
    user_id: uuid.UUID,
    body: RemoveMentorRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin),
):
    """Permanently remove a mentor and all associated data, with optional student reassignment."""
    mentor = db.query(User).filter(User.id == user_id, User.role == UserRole.mentor).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    if mentor.name.lower() != body.confirmation_name.strip().lower():
        raise HTTPException(status_code=400, detail="Mentor name does not match")

    if not verify_password(body.admin_password, admin.password_hash):
        raise HTTPException(status_code=403, detail="Invalid admin password")

    mentor_name = mentor.name
    mentor_email = mentor.email
    reference_id = generate_reference_id()

    if body.reassign_to:
        new_mentor = db.query(User).filter(
            User.id == body.reassign_to,
            User.role == UserRole.mentor,
            User.is_active == True,
        ).first()
        if not new_mentor:
            raise HTTPException(status_code=400, detail="Target mentor not found or inactive")

    try:
        mentor_courses = db.query(Course).filter(Course.mentor_id == user_id).all()
        course_ids = [c.id for c in mentor_courses]
        reassignment_count = 0

        if body.reassign_to and course_ids:
            db.query(Course).filter(Course.mentor_id == user_id).update(
                {"mentor_id": body.reassign_to}, synchronize_session=False
            )
            for cid in course_ids:
                enrolled = db.query(Enrollment).filter(Enrollment.course_id == cid).count()
                reassignment_count += enrolled
        else:
            for course in mentor_courses:
                db.query(Enrollment).filter(Enrollment.course_id == course.id).delete()
                db.query(QuizAttempt).filter(
                    QuizAttempt.quiz_id.in_(
                        db.query(Quiz.id).filter(Quiz.course_id == course.id)
                    )
                ).delete(synchronize_session=False)
                for assignment in db.query(Assignment).filter(Assignment.course_id == course.id).all():
                    db.query(Submission).filter(Submission.assignment_id == assignment.id).delete()
                db.query(Assignment).filter(Assignment.course_id == course.id).delete()
                db.query(Quiz).filter(Quiz.course_id == course.id).delete()
                db.query(Course).filter(Course.id == course.id).delete()

        audit = AuditLog(
            admin_id=admin.id,
            action="remove_mentor",
            target_user_id=None,
            target_name=mentor_name,
            target_email=mentor_email,
            target_role="mentor",
            details=json.dumps({
                "reason": "Admin-initiated removal",
                "removed_user_id": str(user_id),
                "courses_deleted": len(mentor_courses) if not body.reassign_to else 0,
                "courses_reassigned": len(mentor_courses) if body.reassign_to else 0,
                "reassigned_to": str(body.reassign_to) if body.reassign_to else None,
                "students_reassigned": reassignment_count,
            }),
            reference_id=reference_id,
        )
        db.add(audit)
        db.delete(mentor)
        db.commit()

        msg = f"Mentor '{mentor_name}' has been permanently removed."
        if body.reassign_to:
            msg += f" {len(mentor_courses)} course(s) and {reassignment_count} student(s) reassigned."

        return RemoveResponse(
            success=True,
            message=msg,
            reference_id=reference_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove mentor: {str(e)}")


@router.get("/audit-log", response_model=AuditLogResponse)
def get_audit_log(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    action: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Get paginated audit log of admin actions."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)

    total = query.count()
    offset = (page - 1) * per_page
    entries = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(per_page).all()

    return AuditLogResponse(
        entries=[
            AuditLogEntry(
                id=e.id,
                admin_id=e.admin_id,
                action=e.action,
                target_user_id=e.target_user_id,
                target_name=e.target_name,
                target_email=e.target_email,
                target_role=e.target_role,
                details=e.details,
                reference_id=e.reference_id,
                created_at=e.created_at,
            )
            for e in entries
        ],
        total=total,
    )