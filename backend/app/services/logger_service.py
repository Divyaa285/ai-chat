import traceback as tb
from sqlalchemy.orm import Session
from app.models.log import Log


# ── Log level constants ────────────────────────────────────────────────────────

INFO    = "INFO"
WARNING = "WARNING"
ERROR   = "ERROR"


# ── Core writer ────────────────────────────────────────────────────────────────

def log_event(
    db:        Session,
    level:     str,
    action:    str,
    message:   str  = None,
    user_id:   str  = None,
    extra:     dict = None,
    exc:       Exception = None,
) -> Log:
    """
    Persist a log entry to the database.

    Args:
        db       : Active SQLAlchemy session
        level    : INFO | WARNING | ERROR
        action   : Short snake_case event name, e.g. "auth_success"
        message  : Human-readable description (optional)
        user_id  : ID of the user who triggered this event (optional)
        extra    : Any additional JSON-serialisable metadata (optional)
        exc      : Exception object — traceback will be captured automatically

    Returns:
        The saved Log ORM instance
    """
    traceback_str = None
    if exc is not None:
        traceback_str = "".join(tb.format_exception(type(exc), exc, exc.__traceback__))

    entry = Log(
        level      = level,
        action     = action,
        message    = message,
        user_id    = user_id,
        extra      = extra,
        traceback  = traceback_str,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ── Convenience helpers ────────────────────────────────────────────────────────

def log_info(db: Session, action: str, message: str = None, user_id: str = None, extra: dict = None) -> Log:
    return log_event(db, INFO, action, message, user_id, extra)


def log_warning(db: Session, action: str, message: str = None, user_id: str = None, extra: dict = None) -> Log:
    return log_event(db, WARNING, action, message, user_id, extra)


def log_error(db: Session, action: str, message: str = None, user_id: str = None, extra: dict = None, exc: Exception = None) -> Log:
    return log_event(db, ERROR, action, message, user_id, extra, exc)
