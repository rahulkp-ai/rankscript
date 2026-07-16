from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, get_admin
from app.models.user import User
from app.schemas.ranking import LeaderboardResponse, LeaderboardEntry, MyRankResponse
from app.services.ranking_service import (
    get_indian_leaderboard,
    get_state_leaderboard,
    get_district_leaderboard,
    get_my_ranks,
    update_user_ranking,
)

router = APIRouter(prefix="/rankings", tags=["Rankings"])


def build_leaderboard(entries, total, current_user_id=None, skip=0):
    result = []
    for i, entry in enumerate(entries):
        user = entry.user
        result.append(LeaderboardEntry(
            rank=skip + i + 1,
            user_id=entry.user_id,
            name=user.name if user else "Unknown",
            rank_score=entry.rank_score,
            xp=entry.xp,
            state=entry.state,
            district=entry.district,
            is_me=str(entry.user_id) == str(current_user_id) if current_user_id else False,
        ))
    return result


@router.get("/global", response_model=LeaderboardResponse)
def indian_leaderboard(
    skip:  int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
    db:    Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top students across India."""
    entries, total = get_indian_leaderboard(db, skip=skip, limit=limit)
    my_data = get_my_ranks(db, current_user)
    return LeaderboardResponse(
        entries=build_leaderboard(entries, total, current_user.id, skip),
        total=total,
        my_rank=my_data["indian_rank"],
        my_score=my_data["rank_score"],
    )


@router.get("/state/{state}", response_model=LeaderboardResponse)
def state_leaderboard(
    state: str,
    skip:  int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
    db:    Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top students in a state."""
    entries, total = get_state_leaderboard(db, state=state, skip=skip, limit=limit)
    my_data = get_my_ranks(db, current_user)
    return LeaderboardResponse(
        entries=build_leaderboard(entries, total, current_user.id, skip),
        total=total,
        my_rank=my_data["state_rank"],
        my_score=my_data["rank_score"],
    )


@router.get("/district/{district}", response_model=LeaderboardResponse)
def district_leaderboard(
    district: str,
    skip:  int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
    db:    Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top students in a district."""
    entries, total = get_district_leaderboard(db, district=district, skip=skip, limit=limit)
    my_data = get_my_ranks(db, current_user)
    return LeaderboardResponse(
        entries=build_leaderboard(entries, total, current_user.id, skip),
        total=total,
        my_rank=my_data["district_rank"],
        my_score=my_data["rank_score"],
    )


@router.get("/me", response_model=MyRankResponse)
def my_rank(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's rank across all levels."""
    return get_my_ranks(db, current_user)


@router.post("/recalculate")
def recalculate_my_rank(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger rank recalculation for current user."""
    try:
        entry = update_user_ranking(db, current_user)
        return {"message": "Rank recalculated", "rank_score": entry.rank_score}
    except ValueError as e:
        # Sanitize error message to avoid exposing internal details
        error_msg = str(e).lower()
        if "ranking is only available for students" in error_msg:
            raise HTTPException(status_code=400, detail="Ranking is only available for students")
        raise HTTPException(status_code=400, detail="Unable to calculate rank")


@router.post("/recalculate/{user_id}")
def recalculate_user_rank(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin),
):
    """Admin: recalculate rank for any user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        entry = update_user_ranking(db, user)
        return {"message": "Rank recalculated", "rank_score": entry.rank_score}
    except ValueError as e:
        # Sanitize error message to avoid exposing internal details
        error_msg = str(e).lower()
        if "ranking is only available for students" in error_msg:
            raise HTTPException(status_code=400, detail="Ranking is only available for students")
        raise HTTPException(status_code=400, detail="Unable to calculate rank")