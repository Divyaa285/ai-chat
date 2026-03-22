from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.chat import ChatSession
from app.models.message import Message
from app.models.user import User
from app.schemas.message import FileAttachment, MessageRequest
from app.services.gemini_service import get_ai_reply
from typing import List


# ── Chat Session Operations ────────────────────────────────────────────────────

def get_user_chats(db: Session, user: User) -> List[ChatSession]:

    """
    Retrieve all chat sessions belonging to a specific user.
   
    """
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


def create_chat_session(db: Session, user: User, title: str = "New Chat") -> ChatSession:

    """
    Initialize a new conversation record in the database.

    """
    chat = ChatSession(user_id=user.id, title=title)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def get_chat_or_404(db: Session, chat_id: str, user: User) -> ChatSession:

    """
    Fetch a chat session while enforcing strict user ownership.

    """
    chat = (
        db.query(ChatSession)
        .filter(ChatSession.id == chat_id, ChatSession.user_id == user.id)
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


def rename_chat_session(db: Session, chat_id: str, user: User, new_title: str) -> ChatSession:

    """
    Update the display title of a specific chat session.

    """
    chat = get_chat_or_404(db, chat_id, user)
    chat.title = new_title[:100]
    db.commit()
    return chat


def delete_chat_session(db: Session, chat_id: str, user: User) -> None:
    chat = get_chat_or_404(db, chat_id, user)
    db.delete(chat)
    db.commit()


# ── Message Operations ─────────────────────────────────────────────────────────

def get_chat_messages(db: Session, chat_id: str, user: User) -> List[Message]:
    """
    Permanently delete a chat session and all cascading message history.

    """
    get_chat_or_404(db, chat_id, user)  # Validates ownership
    return (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at)
        .all()
    )


def send_message_to_chat(
    db: Session,
    chat_id: str,
    user: User,
    body: MessageRequest
) -> dict:
    if not body.message.strip() and not body.files:
        raise HTTPException(status_code=400, detail="Message or file required")

    chat = get_chat_or_404(db, chat_id, user)

    # Save user message
    display_message = body.message or f"[Sent {len(body.files)} file(s)]"
    user_msg = Message(chat_id=chat_id, role="user", message=display_message)
    db.add(user_msg)
    db.commit()

    # Auto-update chat title on first message
    if chat.title == "New Chat":
        chat.title = (body.message or body.files[0].name)[:50]
        db.commit()

    # Build history (exclude the message we just saved)
    history = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at)
        .all()
    )
    history_data = [{"role": m.role, "message": m.message} for m in history[:-1]]

    # Call Gemini
    try:
        ai_reply = get_ai_reply(history_data, body.files or [], body.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

    # Save AI response
    ai_msg = Message(chat_id=chat_id, role="assistant", message=ai_reply)
    db.add(ai_msg)
    db.commit()

    return {"reply": ai_reply, "chat_title": chat.title}


def clear_chat_messages(db: Session, chat_id: str, user: User) -> None:
    get_chat_or_404(db, chat_id, user)
    db.query(Message).filter(Message.chat_id == chat_id).delete()
    db.commit()
