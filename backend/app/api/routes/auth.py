from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import GoogleLoginRequest, UserResponse
from app.services.auth_service import verify_google_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/google", response_model=UserResponse)
def google_login(body: GoogleLoginRequest, db: Session = Depends(get_db)):

    """
    Authenticate a user using a Google OAuth2 ID token.

    **Args:**
        body (GoogleLoginRequest): Contains the `token` string from Google.
        db (Session): Database session dependency.

    **Returns:**
        UserResponse: The user's profile information and session context.

    **Raises:**
        HTTPException: 401 error if the token is invalid or expired.
    """
    # 1. Verify token integrity with Google's API
    user_info = verify_google_token(body.token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    # 2. Upsert logic: Fetch existing user or register new user
    user = db.query(User).filter(User.google_id == user_info["google_id"]).first()
    if not user:
        user = User(**user_info)
        db.add(user)
        db.commit()
        db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        token=body.token,
    )
