from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey, String, func, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class RankEntry(Base):
    __tablename__ = "rank_entries"

    id           = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id      = Column(Uuid, ForeignKey("users.id"), unique=True, nullable=False)

    # Component scores (0-100 each)
    quiz_score        = Column(Float, default=0.0)
    assignment_score  = Column(Float, default=0.0)
    exam_score        = Column(Float, default=0.0)
    completion_score  = Column(Float, default=0.0)
    streak_score      = Column(Float, default=0.0)

    # Final weighted rank score
    rank_score   = Column(Float, default=0.0)
    xp           = Column(Float, default=0.0)
    streak_days  = Column(Integer, default=0)
    last_active  = Column(DateTime(timezone=True), nullable=True)

    # Location for filtered leaderboards
    country      = Column(String(100), default="India")
    state        = Column(String(100), nullable=True)
    district     = Column(String(100), nullable=True)

    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user         = relationship("User", backref="rank_entry")

    def __repr__(self):
        return f"<RankEntry user={self.user_id} score={self.rank_score}>"