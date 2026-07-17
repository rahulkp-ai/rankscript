from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id              = Column(Uuid, primary_key=True, default=uuid.uuid4)
    admin_id        = Column(Uuid, ForeignKey("users.id"), nullable=False)
    action          = Column(String(50), nullable=False)  # e.g., "remove_student", "remove_mentor"
    target_user_id  = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_name     = Column(String(100), nullable=True)
    target_email    = Column(String(255), nullable=True)
    target_role     = Column(String(20), nullable=True)
    details         = Column(Text, nullable=True)  # JSON string with extra info
    reference_id    = Column(String(50), nullable=False)  # Unique audit reference number
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    admin           = relationship("User", foreign_keys=[admin_id])

    def __repr__(self):
        return f"<AuditLog {self.action} by={self.admin_id} ref={self.reference_id}>"
