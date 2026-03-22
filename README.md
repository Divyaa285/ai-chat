# AI Chat Backend

A FastAPI-based REST API backend for an AI-powered chat application. It integrates **Google OAuth2** for authentication, **Google Gemini** as the AI engine, and **PostgreSQL** for persistent storage. Application events and errors are automatically logged to a dedicated logs table.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| AI Model | Google Gemini (2.5 Flash → 2.0 Flash → 1.5 Flash) |
| Auth | Google OAuth2 (ID token verification) |
| Runtime | Python 3.13 / Uvicorn |

---

## Project Structure

```
backend/
├── main.py                   # App entry point, middleware, router registration
├── requirements.txt
├── .env.example                      # Environment variables 
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/             # Database migration files
└── app/
    ├── core/
    │   └── config.py         # Pydantic settings loaded from .env
    ├── database/
    │   ├── base.py           # SQLAlchemy declarative base
    │   └── session.py        # Engine & session factory
    ├── models/
    │   ├── user.py           # User model
    │   ├── chat.py           # ChatSession model
    │   ├── message.py        # Message model
    │   └── log.py            # Log model
    ├── schemas/
    │   ├── auth.py           # Auth request/response schemas
    │   ├── chat.py           # Chat schemas
    │   └── message.py        # Message schemas (includes FileAttachment)
    ├── api/
    │   ├── dependencies.py   # get_current_user dependency
    │   └── routes/
    │       ├── auth.py       # /api/auth
    │       ├── chats.py      # /api/chats
    │       ├── messages.py   # /api/chats/{id}/messages
    │       └── logs.py       # /api/logs
    └── services/
        ├── auth_service.py   # Google token verification
        ├── chat_service.py   # Chat & message business logic
        ├── gemini_service.py # Gemini AI integration
        └── logger_service.py # Structured logging to DB
```

---

## Prerequisites

- Python 3.11+
- PostgreSQL running locally (or remotely)
- A Google Cloud project with OAuth2 credentials and Gemini API access

---

## Setup & Installation

### 1. Clone and enter the directory

```bash
git clone <your-repo-url>
cd backend
```

### 2. Create and activate a virtual environment(optional if required ,direct go with step 3)

```bash
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Replace a `.env.example` file in the `backend/` root to `.env`:

```env
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/<dbname>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GEMINI_API_KEY=<your-gemini-api-key>
```


### 5. Start the server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | OAuth2 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret |
| `GEMINI_API_KEY` | API key for Google Gemini |
| `ALLOWED_ORIGINS` | CORS allowed origins (default: `http://localhost:3000`) |

---

## API Reference

### Authentication

All endpoints except `/api/auth/google` require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <google_id_token>
```

---

### Auth Routes — `/api/auth`

#### `POST /api/auth/google`
Authenticate with a Google ID token. Returns the user profile and echoes back the token for use in subsequent requests.

**Request body:**
```json
{ "token": "<google_id_token>" }
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "picture": "https://...",
  "token": "<google_id_token>"
}
```

---

### Chat Routes — `/api/chats`

#### `GET /api/chats`
List all chat sessions belonging to the authenticated user.

#### `POST /api/chats`
Create a new chat session.

**Request body:**
```json
{ "title": "My Chat" }
```

#### `PATCH /api/chats/{chat_id}`
Rename an existing chat session.

**Request body:**
```json
{ "title": "New Title" }
```

#### `DELETE /api/chats/{chat_id}`
Permanently delete a chat session and all its messages.

---

### Message Routes — `/api/chats/{chat_id}/messages`

#### `GET /api/chats/{chat_id}/messages`
Retrieve the full message history for a chat session, ordered oldest to newest.

#### `POST /api/chats/{chat_id}/messages`
Send a message (with optional file attachments). The API saves the user's message, calls Gemini, saves the AI reply, and returns both.

**Request body:**
```json
{
  "message": "Explain this code",
  "files": [
    {
      "name": "main.py",
      "type": "text",
      "content": "print('hello')"
    }
  ]
}
```

Supported file types in `files[]`: `image` (with `data` as base64), `pdf` (with `data` as base64), `text` (with `content` as string).

#### `DELETE /api/chats/{chat_id}/messages`
Clear all messages in a session without deleting the session itself.

---

### Logs Routes — `/api/logs`

#### `GET /api/logs`
Query persisted application logs. Supports filtering and pagination.

| Query param | Type | Description |
|---|---|---|
| `level` | string | Filter by `INFO`, `WARNING`, or `ERROR` |
| `action` | string | Filter by action name (e.g. `gemini_error`) |
| `limit` | int | Max results (1–500, default 50) |
| `offset` | int | Pagination offset (default 0) |

---

## AI Model Fallback

The Gemini service attempts models in this order, automatically falling back on quota/rate-limit errors:

1. `gemini-2.5-flash`
2. `gemini-2.0-flash`
3. `gemini-1.5-flash`

If all models are exhausted, the API returns `HTTP 429`.

---

## Database Schema

```
users
  id (PK), google_id, email, name, picture, created_at

chat_sessions
  id (PK), user_id (FK → users), title, created_at

messages
  id (PK), chat_id (FK → chat_sessions), role, message, created_at

logs
  id (PK), level, action, message, user_id, extra (JSON), traceback, created_at
```

Cascade deletes are set up: deleting a user removes their chat sessions; deleting a chat session removes its messages.

---

## Error Handling

A global middleware catches any unhandled exception, persists it to the `logs` table with full traceback, and returns a generic `HTTP 500` response to the client.

---

## Development Notes

- Interactive API docs are available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.
- The server auto-creates all database tables on startup via `Base.metadata.create_all()`. Use Alembic for schema migrations in production.
- CORS is pre-configured for `http://localhost:3000` (typical React dev server). Update `ALLOWED_ORIGINS` in `.env` for other origins.
