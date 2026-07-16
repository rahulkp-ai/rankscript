from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, func, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id           = Column(Uuid, primary_key=True, default=uuid.uuid4)
    course_id    = Column(Uuid, ForeignKey("courses.id"), nullable=False)
    mentor_id    = Column(Uuid, ForeignKey("users.id"), nullable=False)

    title        = Column(String(200), nullable=False)
    description  = Column(Text, nullable=True)
    time_limit   = Column(Integer, default=0)
    pass_score   = Column(Float, default=50.0)
    max_attempts = Column(Integer, default=3)
    is_active    = Column(Boolean, default=True)
    randomize    = Column(Boolean, default=False)

    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    course    = relationship("Course", back_populates="quizzes")
    mentor    = relationship("User", foreign_keys=[mentor_id], backref="quizzes_created")
    questions = relationship("Question", back_populates="quiz",
                             cascade="all, delete-orphan", order_by="Question.order")
    attempts  = relationship("QuizAttempt", back_populates="quiz",
                             cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Quiz {self.title}>"