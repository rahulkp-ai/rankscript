from sqlalchemy import Column, Text, Integer, Float, Boolean, DateTime, ForeignKey, func, JSON, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id            = Column(Uuid, primary_key=True, default=uuid.uuid4)
    quiz_id       = Column(Uuid, ForeignKey("quizzes.id"), nullable=False)
    student_id    = Column(Uuid, ForeignKey("users.id"), nullable=False)

    answers       = Column(JSON, nullable=False)   # JSON: {"question_id": "a", ...}
    score         = Column(Float, default=0.0)      # percentage 0-100
    total_points  = Column(Integer, default=0)
    earned_points = Column(Integer, default=0)
    passed        = Column(Boolean, default=False)
    time_taken    = Column(Integer, default=0)      # seconds

    started_at    = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at  = Column(DateTime(timezone=True), nullable=True)

    quiz    = relationship("Quiz", back_populates="attempts")
    student = relationship("User", backref="quiz_attempts")

    def __repr__(self):
        return f"<QuizAttempt student={self.student_id} score={self.score}>"