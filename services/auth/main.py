"""
LearnFlow Auth Service
======================
Handles:
  - Local signup / login  (bcrypt passwords, PostgreSQL)
  - Google OAuth 2.0      (authlib + PKCE-safe state)
  - GitHub OAuth 2.0      (authlib)
  - JWT issuance          (python-jose)

All routes are prefixed /auth so the Next.js proxy can forward
  /api/svc/auth/* → http://auth:8000/*
"""

import logging
import os
import secrets
from datetime import datetime, timezone, timedelta

import asyncpg
import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse, RedirectResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from pydantic_settings import BaseSettings
from starlette.middleware.sessions import SessionMiddleware

# ── Settings ──────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    database_url:         str = ""
    jwt_secret:           str = "change-me-in-production"
    jwt_algorithm:        str = "HS256"
    jwt_expire_minutes:   int = 60 * 24 * 7   # 7 days

    google_client_id:     str = ""
    google_client_secret: str = ""
    github_client_id:     str = ""
    github_client_secret: str = ""

    # Must match what you register in Google / GitHub consoles
    frontend_url:         str = "http://localhost:3000"
    # Callback URLs hit by OAuth providers — must go through the auth service
    google_redirect_uri:  str = "http://localhost:8006/auth/google/callback"
    github_redirect_uri:  str = "http://localhost:8006/auth/github/callback"

    session_secret:       str = "session-secret-change-in-prod"

    class Config:
        env_file = ".env"

settings = Settings()

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("auth")

# ── FastAPI + Session middleware ───────────────────────────────────────────────

app = FastAPI(title="auth", version="1.0.0")

# SessionMiddleware is required by authlib for storing OAuth state
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    https_only=False,   # set True in production behind HTTPS
    same_site="lax",
)

# ── Password hashing ──────────────────────────────────────────────────────────

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_jwt(user_id: str, email: str, name: str, avatar: str | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub":    user_id,
        "email":  email,
        "name":   name,
        "avatar": avatar,
        "exp":    expire,
        "iat":    datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

# ── Database ──────────────────────────────────────────────────────────────────

_pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
    return _pool

async def init_db() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                email           TEXT UNIQUE NOT NULL,
                password_hash   TEXT,                    -- NULL for OAuth users
                provider        TEXT NOT NULL DEFAULT 'local',
                avatar_url      TEXT,
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                updated_at      TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        """)
    log.info("Database initialised")

@app.on_event("startup")
async def startup():
    if settings.database_url:
        await init_db()
    else:
        log.warning("DATABASE_URL not set — running without persistence (dev mode)")

@app.on_event("shutdown")
async def shutdown():
    if _pool:
        await _pool.close()

# ── DB helpers ────────────────────────────────────────────────────────────────

async def find_user_by_email(email: str) -> dict | None:
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM users WHERE email = $1", email)
    return dict(row) if row else None

async def find_user_by_id(user_id: str) -> dict | None:
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    return dict(row) if row else None

async def upsert_oauth_user(
    name: str, email: str, provider: str, avatar_url: str | None
) -> dict:
    """Insert new OAuth user or update name/avatar if already exists."""
    pool = await get_pool()
    user_id = f"{provider}-{secrets.token_hex(8)}"
    row = await pool.fetchrow("""
        INSERT INTO users (id, name, email, provider, avatar_url)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE
            SET name       = EXCLUDED.name,
                avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
                updated_at = NOW()
        RETURNING *
    """, user_id, name, email, provider, avatar_url)
    return dict(row)

async def create_local_user(name: str, email: str, password_hash: str) -> dict:
    pool = await get_pool()
    user_id = f"local-{secrets.token_hex(8)}"
    try:
        row = await pool.fetchrow("""
            INSERT INTO users (id, name, email, password_hash, provider)
            VALUES ($1, $2, $3, $4, 'local')
            RETURNING *
        """, user_id, name, email, password_hash)
        return dict(row)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Email already registered")

# ── Authlib OAuth clients ──────────────────────────────────────────────────────

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="github",
    client_id=settings.github_client_id,
    client_secret=settings.github_client_secret,
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "read:user user:email"},
)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "auth"}

# ── Local signup ──────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name:  str
    email: EmailStr
    password: str

@app.post("/auth/signup")
async def signup(req: SignupRequest):
    # Validation
    if len(req.password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")
    if not any(c.isalpha() for c in req.password):
        raise HTTPException(422, "Password must include letters")
    if not any(c.isdigit() for c in req.password):
        raise HTTPException(422, "Password must include numbers")

    password_hash = pwd_ctx.hash(req.password)

    if settings.database_url:
        user = await create_local_user(req.name.strip(), req.email.lower(), password_hash)
    else:
        # Dev fallback — no DB
        user = {
            "id": f"local-{secrets.token_hex(8)}",
            "name": req.name.strip(),
            "email": req.email.lower(),
            "provider": "local",
            "avatar_url": None,
        }

    token = create_jwt(user["id"], user["email"], user["name"], user.get("avatar_url"))
    return {
        "token": token,
        "user": {
            "id":        user["id"],
            "name":      user["name"],
            "email":     user["email"],
            "avatarUrl": user.get("avatar_url"),
            "provider":  user.get("provider", "local"),
        },
    }

# ── Local login ───────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

@app.post("/auth/login")
async def login(req: LoginRequest):
    if not settings.database_url:
        # Dev fallback — accept any credentials and synthesise user
        name = req.email.split("@")[0].replace(".", " ").title()
        user_id = f"local-dev-{secrets.token_hex(4)}"
        token = create_jwt(user_id, req.email.lower(), name)
        return {
            "token": token,
            "user": {"id": user_id, "name": name, "email": req.email.lower(),
                     "avatarUrl": None, "provider": "local"},
        }

    user = await find_user_by_email(req.email.lower())
    if not user or not user.get("password_hash"):
        raise HTTPException(401, "Invalid email or password")
    if not pwd_ctx.verify(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_jwt(user["id"], user["email"], user["name"], user.get("avatar_url"))
    return {
        "token": token,
        "user": {
            "id":        user["id"],
            "name":      user["name"],
            "email":     user["email"],
            "avatarUrl": user.get("avatar_url"),
            "provider":  user.get("provider", "local"),
        },
    }

# ── Verify JWT (used by other services) ──────────────────────────────────────

@app.get("/auth/verify")
async def verify(request: Request):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_jwt(token)
    return {"valid": True, "user": payload}

# ── Google OAuth ──────────────────────────────────────────────────────────────

@app.get("/auth/google")
async def google_login(request: Request):
    """Redirect browser to Google consent screen."""
    if not settings.google_client_id:
        raise HTTPException(501, "Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)

@app.get("/auth/google/callback")
async def google_callback(request: Request):
    """Google redirects back here after user grants access."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        log.error("Google OAuth error: %s", exc)
        return RedirectResponse(f"{settings.frontend_url}/login?error=google_auth_failed")

    user_info = token.get("userinfo") or {}
    email     = user_info.get("email", "").lower()
    name      = user_info.get("name") or email.split("@")[0].title()
    avatar    = user_info.get("picture")

    if not email:
        return RedirectResponse(f"{settings.frontend_url}/login?error=no_email")

    is_new = False
    if settings.database_url:
        existing = await find_user_by_email(email)
        user = await upsert_oauth_user(name, email, "google", avatar)
        user_id = user["id"]
        is_new = existing is None
    else:
        user_id = f"google-{secrets.token_hex(6)}"
        is_new = True

    jwt_token = create_jwt(user_id, email, name, avatar)

    return RedirectResponse(
        f"{settings.frontend_url}/auth/callback?token={jwt_token}&provider=google&new={'1' if is_new else '0'}"
    )

# ── GitHub OAuth ──────────────────────────────────────────────────────────────

@app.get("/auth/github")
async def github_login(request: Request):
    """Redirect browser to GitHub consent screen."""
    if not settings.github_client_id:
        raise HTTPException(501, "GitHub OAuth not configured — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET")
    return await oauth.github.authorize_redirect(request, settings.github_redirect_uri)

@app.get("/auth/github/callback")
async def github_callback(request: Request):
    """GitHub redirects back here after user grants access."""
    try:
        token = await oauth.github.authorize_access_token(request)
    except Exception as exc:
        log.error("GitHub OAuth error: %s", exc)
        return RedirectResponse(f"{settings.frontend_url}/login?error=github_auth_failed")

    # Fetch user profile
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Accept": "application/vnd.github+json",
        }
        profile_res = await client.get("https://api.github.com/user", headers=headers)
        profile = profile_res.json()

        # GitHub may hide email — fetch explicitly
        email = profile.get("email") or ""
        if not email:
            email_res = await client.get("https://api.github.com/user/emails", headers=headers)
            emails = email_res.json()
            primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
            email = (primary or {}).get("email", "")

    email  = email.lower()
    name   = profile.get("name") or profile.get("login", "GitHub User")
    avatar = profile.get("avatar_url")

    if not email:
        return RedirectResponse(f"{settings.frontend_url}/login?error=no_email")

    is_new = False
    if settings.database_url:
        existing = await find_user_by_email(email)
        user = await upsert_oauth_user(name, email, "github", avatar)
        user_id = user["id"]
        is_new = existing is None
    else:
        user_id = f"github-{secrets.token_hex(6)}"
        is_new = True

    jwt_token = create_jwt(user_id, email, name, avatar)

    return RedirectResponse(
        f"{settings.frontend_url}/auth/callback?token={jwt_token}&provider=github&new={'1' if is_new else '0'}"
    )

# ── Delete account ────────────────────────────────────────────────────────────

class DeleteAccountRequest(BaseModel):
    reason: str = ""

async def _get_current_user(request: Request) -> dict:
    """Extract and validate JWT from Authorization header."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_jwt(token)
    return payload

@app.delete("/auth/delete-account")
async def delete_account(req: DeleteAccountRequest, request: Request):
    """
    Permanently delete the authenticated user's account and all related data.
    Requires a valid Bearer JWT.
    """
    if not settings.database_url:
        raise HTTPException(501, "Account deletion requires database connection")

    payload = await _get_current_user(request)
    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(401, "Invalid token — no user ID")

    pool = await get_pool()
    async with pool.acquire() as conn:
        # Verify the user actually exists
        user = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")

        # Delete all related data across both databases.
        # Progress data lives in the progress service's DB (same Neon instance).
        await conn.execute(
            "DELETE FROM concept_events WHERE user_id = $1", user_id
        )
        await conn.execute(
            "DELETE FROM exercise_completions WHERE user_id = $1", user_id
        )
        # Delete the user record itself
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)

    log.info("Account deleted user_id=%s reason=%r", user_id, req.reason)
    return {"status": "deleted", "message": "Your account has been permanently deleted"}
