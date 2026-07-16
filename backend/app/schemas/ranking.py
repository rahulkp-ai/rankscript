from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class RankEntryResponse(BaseModel):
    user_id:          UUID
    rank_score:       float
    quiz_score:       float
    assignment_score: float
    completion_score: float
    streak_score:     float
    xp:               float
    streak_days:      int
    state:            Optional[str]
    district:         Optional[str]
    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank:       int
    user_id:    UUID
    name:       str
    rank_score: float
    xp:         float
    state:      Optional[str]
    district:   Optional[str]
    is_me:      bool = False
    model_config = {"from_attributes": True}


class LeaderboardResponse(BaseModel):
    entries:    List[LeaderboardEntry]
    total:      int
    my_rank:    Optional[int]
    my_score:   Optional[float]


class MyRankResponse(BaseModel):
    indian_rank:   Optional[int]
    state_rank:    Optional[int]
    district_rank: Optional[int]
    rank_score:    float
    quiz_score:    float
    assignment_score: float
    completion_score: float
    streak_score:  float
    xp:            float
    streak_days:   int