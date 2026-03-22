from pydantic import BaseModel


class GoogleLoginRequest(BaseModel):
    token: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None
    picture: str | None
    token: str
