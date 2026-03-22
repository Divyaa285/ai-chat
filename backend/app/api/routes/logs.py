from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.log import Log
from app.models.user import User
from app.api.dependencies import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/logs", tags=["Logs"])


class LogResponse(BaseModel):
    id:         str
    level:      str
    action:     str
    message:    Optional[str]
    user_id:    Optional[str]
    extra:      Optional[dict]
    traceback:  Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[LogResponse])
def get_logs(
    level:   Optional[str] = Query(None, description="Filter by level: INFO, WARNING, ERROR"),
    action:  Optional[str] = Query(None, description="Filter by action, e.g. gemini_error"),
    limit:   int           = Query(50,   ge=1, le=500),
    offset:  int           = Query(0,    ge=0),
    current_user: User     = Depends(get_current_user),
    db: Session            = Depends(get_db),
):
    """
    Query persisted application logs.
    Supports filtering by level and/or action.

    Example queries:
      GET /api/logs?level=ERROR
      GET /api/logs?action=gemini_error
      GET /api/logs?level=WARNING&limit=20
    """
    q = db.query(Log)

    if level:
        q = q.filter(Log.level == level.upper())
    if action:
        q = q.filter(Log.action == action)

    logs = q.order_by(Log.created_at.desc()).offset(offset).limit(limit).all()
    return logs
