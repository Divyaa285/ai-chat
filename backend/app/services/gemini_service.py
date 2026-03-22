import google.generativeai as genai
from app.core.config import settings
from app.schemas.message import FileAttachment
from typing import List
from fastapi import HTTPException

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

# Models to rotate when quota exceeded
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
]


def build_file_parts(files: List[FileAttachment]) -> list:
    """Convert file attachments into Gemini-compatible content parts."""
    parts = []

    for file in files:

        # Image file
        if file.type == "image" and file.data:
            parts.append({
                "inline_data": {
                    "mime_type": file.mimeType,
                    "data": file.data
                }
            })

        # PDF file
        elif file.type == "pdf" and file.data:
            parts.append({
                "inline_data": {
                    "mime_type": "application/pdf",
                    "data": file.data
                }
            })

        # Text/code file
        elif file.type == "text" and file.content:
            lang = file.name.rsplit(".", 1)[-1] if "." in file.name else ""
            parts.append({
                "text": f"[File: {file.name}]\n```{lang}\n{file.content}\n```"
            })

    return parts


def get_ai_reply(history: list, files: List[FileAttachment], user_message: str) -> str:
    """
    Send conversation history + message + files to Gemini.
    Automatically switches models if quota exceeded.
    """

    gemini_history = [
        {"role": "user" if msg["role"] == "user" else "model", "parts": [msg["message"]]}
        for msg in history
    ]

    current_parts = []

    # Attach files
    if files:
        current_parts.extend(build_file_parts(files))

    # Add user message
    if user_message.strip():
        current_parts.append({"text": user_message})

    elif not current_parts:
        current_parts.append({"text": "Please describe what you see in this file."})

    last_error = None

    # Try models one by one
    for model_name in GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(model_name)

            chat_session = model.start_chat(history=gemini_history)

            response = chat_session.send_message(current_parts)

            if response and response.text:
                return response.text

        except Exception as e:
            last_error = e
            error_message = str(e).lower()

            # If quota exceeded → switch model
            if "quota" in error_message or "429" in error_message:
                print(f"⚠️ Quota exceeded for {model_name}, switching model...")
                continue

            raise HTTPException(
                status_code=500,
                detail=f"Gemini API error: {str(e)}"
            )

    # If all models fail
    raise HTTPException(
        status_code=429,
        detail=f"All Gemini models exhausted. Last error: {last_error}"
    )