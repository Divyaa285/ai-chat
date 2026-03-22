from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.user import User
from app.schemas.chat import ChatSessionCreate, ChatSessionUpdate, ChatSessionResponse
from app.api.dependencies import get_current_user
from app.services import chat_service

router = APIRouter(prefix="/api/chats", tags=["Chats"])

@router.get("", response_model=List[ChatSessionResponse])
def get_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all chat sessions for the authenticated user.
    - **Authentication**: Required via Bearer Token.
    - **Scope**: Returns only sessions belonging to `current_user`.
    """
    
    return chat_service.get_user_chats(db, current_user)


@router.post("", response_model=ChatSessionResponse)
def create_chat(
    body: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initialize a new chat session.
    - **Validation**: Title is required in the request body.
    - **Ownership**: The session is automatically linked to the `current_user.id`.
    """
  
    return chat_service.create_chat_session(db, current_user, body.title)


@router.patch("/{chat_id}", response_model=ChatSessionResponse)
def rename_chat(
    chat_id: str,
    body: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a chat session's title.
    - **Permissions**: service layer verifies `current_user` is the owner.
    - **Errors**: Returns 404 if chat_id doesn't exist, 403 if unauthorized.
    """
    
    return chat_service.rename_chat_session(db, chat_id, current_user, body.title)


@router.delete("/{chat_id}")
def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    """
    Hard delete a chat session and all linked messages.
    - **Warning**: This action is irreversible.
    - **Ownership**: Strictly enforced by the service layer.
    """
   
    chat_service.delete_chat_session(db, chat_id, current_user)
    return {"message": "Chat deleted"}
