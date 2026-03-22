from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class FileAttachment(BaseModel):
    name: str
    type: str
    mimeType: str
    size: int
    data: Optional[str] = None
    content: Optional[str] = None


class MessageRequest(BaseModel):
    message: str
    files: Optional[List[FileAttachment]] = []


class MessageResponse(BaseModel):
    id: str
    role: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageResponse(BaseModel):
    reply: str
    chat_title: str
