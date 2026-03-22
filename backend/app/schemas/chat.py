from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ChatSessionUpdate(BaseModel):
    title: str


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True
