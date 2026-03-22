import traceback
from fastapi import FastAPI, Request
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.database.session import engine, SessionLocal
from app.database.base import Base
from app.api.routes import auth, chats, messages, logs

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Chat API")

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error logging middleware ───────────────────────────────────────────
@app.middleware("http")
async def log_unhandled_errors(request: Request, call_next):
    """Catch any unhandled exception, persist it to the logs table, then re-raise as 500."""
    try:
        return await call_next(request)
    except Exception as exc:
        db = SessionLocal()
        try:
            from app.services import logger_service as logger
            logger.log_error(
                db,
                action  = "unhandled_exception",
                message = f"{request.method} {request.url.path} → {type(exc).__name__}: {exc}",
                extra   = {
                    "method": request.method,
                    "path":   request.url.path,
                    "error":  str(exc),
                },
                exc = exc,
            )
        finally:
            db.close()
        return JSONResponse(
            status_code = 500,
            content     = {"detail": "Internal server error"},
        )


# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(chats.router)
app.include_router(messages.router)
app.include_router(logs.router)


# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "AI Chat API is running!"}
