import requests
from app.core.config import settings


def verify_google_token(token: str) -> dict | None:

    """
    Authenticate a user by verifying their Google OAuth2 access token.
    Verify Google OAuth access token by calling Google's userinfo endpoint
    Args:
        token (str): The Bearer access token provided by the Google Identity service.

    Returns:
        dict | None: A dictionary containing:
            - google_id (str): The unique Google subject identifier ('sub').
            - email (str): The user's primary Google email address.
            - name (str): The user's full name.
            - picture (str): URL to the user's Google profile image.
            Returns None if the token is invalid, expired, or the request fails.

    """
   
    try:
        response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200:
            return None
        data = response.json()
        return {
            "google_id": data.get("sub"),
            "email": data.get("email"),
            "name": data.get("name", ""),
            "picture": data.get("picture", "")
        }
    except Exception as e:
        print(f"Token verification error: {e}")
        return None
