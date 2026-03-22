from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.user import User
from app.schemas.message import MessageRequest, MessageResponse, SendMessageResponse
from app.api.dependencies import get_current_user
from app.services import chat_service

router = APIRouter(prefix="/api/chats", tags=["Messages"])

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
def get_messages(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve chronological message history for a specific chat session.
    - **Security**: Ensures `current_user` owns the chat before returning history.
    - **Ordering**: Returns messages from oldest to newest.
    """

    return chat_service.get_chat_messages(db, chat_id, current_user)


@router.post("/{chat_id}/messages", response_model=SendMessageResponse)
def send_message(
    chat_id: str,
    body: MessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process a user message and trigger an AI (Gemini) response.
    - **Persistence**: Saves both the user's prompt and the AI's response to the DB.
    - **Context**: The service layer handles context-window management for the AI.
    - **Authorization**: Fails if the `chat_id` does not belong to the user.
    """
  
    return chat_service.send_message_to_chat(db, chat_id, current_user, body)



@router.delete("/{chat_id}/messages")
def clear_messages(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Wipe all messages within a session without deleting the session itself.
    - **Use Case**: Resetting a conversation while keeping the same Title/ID.
    - **Data Integrity**: Cascades through the message table for the given `chat_id`.
    """
   
    chat_service.clear_chat_messages(db, chat_id, current_user)
    return {"message": "Chat cleared"}
