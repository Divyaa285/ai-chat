from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.services.auth_service import verify_google_token


"""
    Validate the Bearer token and retrieve the authenticated user.

    This dependency extracts the Google OAuth2 token from the 'Authorization' header,
    verifies it against Google's services, and checks the local database to
    ensure the user exists.

    Args:
        authorization (str): The 'Authorization' header containing the Bearer token.
        db (Session): Database session injected via FastAPI Depends.

    Returns:
        User: The SQLAlchemy User model instance if authentication is successful.

    Raises:
        HTTPException: 
            - 401: If the header format is incorrect (missing 'Bearer ').
            - 401: If the Google token is invalid or expired.
            - 401: If the user information exists in the token but not in the database.
    """

def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
) -> User:
    """Dependency: extract and validate Bearer token, return the current User."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")

    token = authorization.split(" ")[1]
    user_info = verify_google_token(token)

    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.google_id == user_info["google_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
