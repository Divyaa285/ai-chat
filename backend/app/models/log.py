from sqlalchemy import Column, String, Text, DateTime, JSON
from datetime import datetime
import uuid
from app.database.base import Base


class Log(Base):
    __tablename__ = "logs"

    id          = Column(String,   primary_key=True, default=lambda: str(uuid.uuid4()))
    level       = Column(String,   nullable=False)          # INFO | WARNING | ERROR
    action      = Column(String,   nullable=False)          # e.g. "auth_success", "gemini_error"
    message     = Column(Text,     nullable=True)           # human-readable description
    user_id     = Column(String,   nullable=True)           # who triggered it (if known)
    extra       = Column(JSON,     nullable=True)           # any extra structured data
    traceback   = Column(Text,     nullable=True)           # full traceback for errors
    created_at  = Column(DateTime, default=datetime.utcnow)
