import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL    = os.getenv("DATABASE_URL", "")
JWT_SECRET      = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM   = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MIN  = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24 * 7)))

SESSION_SECRET  = os.getenv("SESSION_SECRET", "session-secret-change-in-prod")

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:10000/auth/google/callback")

GITHUB_CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI  = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:10000/auth/github/callback")

FRONTEND_URL    = os.getenv("FRONTEND_URL", "http://localhost:3000")

GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL    = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
STREAM_TIMEOUT  = int(os.getenv("STREAM_TIMEOUT", "20"))

PUBSUB_NAME     = os.getenv("PUBSUB_NAME", "kafka-pubsub")
PROGRESS_URL    = os.getenv("PROGRESS_URL", "http://localhost:10000")
