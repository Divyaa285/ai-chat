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



# AI Chat Frontend

A production-ready React application providing a modern chat interface with AI-powered responses, Google OAuth authentication, and rich Markdown rendering.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Backend Integration](#backend-integration)
- [Google OAuth Setup](#google-oauth-setup)
- [Available Scripts](#available-scripts)
- [How It Works](#how-it-works)


---

## Features

- **Interactive Chat UI** — Smooth, responsive chat interface optimized for real-time conversation
- **AI-Generated Responses** — Integrated with a backend AI model via REST API
- **Google OAuth Authentication** — Secure, one-click login via Google Identity
- **Markdown Rendering** — Full Markdown support for formatted AI responses (code blocks, tables, lists)
- **Session Management** — Persistent chat session handling across page interactions
- **File Attachments** — Support for file uploads within conversations *(in development)*

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| React Router DOM | latest | Client-side routing |
| Axios | latest | HTTP client |
| React Markdown | latest | Markdown rendering |
| @react-oauth/google | latest | Google OAuth integration |

---

## Project Structure

```
frontend/
├── public/                 # Static assets
└── src/
    ├── components/         # Reusable UI components
    ├── pages/              # Route-level page components
    ├── styles/             # Global and component styles
    ├── App.js              # Root application component
    └── index.js            # Application entry point
```

---

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm v8 or higher

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root (see [Environment Variables](#environment-variables)).

### 4. Start the Development Server

```bash
npm start
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

Replace `.env.example ` to `.env` file in the project root with the following variables:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Backend Integration

This frontend expects a backend API running at the URL defined in `REACT_APP_BACKEND_URL`.

Ensure the backend server is running before starting the frontend:

```
http://localhost:8000
```

Refer to the backend repository for setup instructions.

---

## Google OAuth Setup

1. Visit the [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services → Credentials**
4. Create an **OAuth 2.0 Client ID** (Web Application)
5. Add `http://localhost:3000` as an authorized JavaScript origin
6. Copy the generated Client ID into your `.env` file as `REACT_APP_GOOGLE_CLIENT_ID`

---

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the development server at `http://localhost:3000` |
| `npm run build` | Create an optimized production build in the `/build` directory |

---

## How It Works

1. **Authentication** — The user signs in via Google OAuth
2. **Message Input** — The user types a message in the chat interface
3. **API Request** — The message is sent to the backend via Axios
4. **AI Processing** — The backend processes the input through the AI model
5. **Response Rendering** — The response is streamed back and rendered with Markdown formatting

---



