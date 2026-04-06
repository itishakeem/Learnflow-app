import logging
import secrets
from datetime import datetime, timezone, timedelta

import asyncpg
import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from core.config import (
    DATABASE_URL, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MIN,
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI,
    FRONTEND_URL,
)
from core.database import get_pool

router = APIRouter()
log = logging.getLogger("auth")

# ── Password hashing ──────────────────────────────────────────────────────────

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_jwt(user_id: str, email: str, name: str, avatar: str | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MIN)
    payload = {
        "sub":    user_id,
        "email":  email,
        "name":   name,
        "avatar": avatar,
        "exp":    expire,
        "iat":    datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

# ── OAuth clients ─────────────────────────────────────────────────────────────

oauth = OAuth()

oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="github",
    client_id=GITHUB_CLIENT_ID,
    client_secret=GITHUB_CLIENT_SECRET,
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "read:user user:email"},
)

# ── DB helpers ────────────────────────────────────────────────────────────────

async def find_user_by_email(email: str) -> dict | None:
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM users WHERE email = $1", email)
    return dict(row) if row else None


async def find_user_by_id(user_id: str) -> dict | None:
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    return dict(row) if row else None


async def upsert_oauth_user(name: str, email: str, provider: str, avatar_url: str | None) -> dict:
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

# ── Helper ────────────────────────────────────────────────────────────────────

async def _get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    token = auth_header.removeprefix("Bearer ").strip()
    return decode_jwt(token)

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    return {"status": "ok", "service": "auth"}


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(req: SignupRequest):
    if len(req.password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")
    if not any(c.isalpha() for c in req.password):
        raise HTTPException(422, "Password must include letters")
    if not any(c.isdigit() for c in req.password):
        raise HTTPException(422, "Password must include numbers")

    password_hash = pwd_ctx.hash(req.password)

    if DATABASE_URL:
        user = await create_local_user(req.name.strip(), req.email.lower(), password_hash)
    else:
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


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
async def login(req: LoginRequest):
    if not DATABASE_URL:
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


@router.get("/verify")
async def verify(request: Request):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_jwt(token)
    return {"valid": True, "user": payload}


@router.get("/google")
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(501, "Google OAuth not configured")
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        log.error("Google OAuth error: %s", exc)
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_auth_failed")

    user_info = token.get("userinfo") or {}
    email  = user_info.get("email", "").lower()
    name   = user_info.get("name") or email.split("@")[0].title()
    avatar = user_info.get("picture")

    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=no_email")

    is_new = False
    if DATABASE_URL:
        existing = await find_user_by_email(email)
        user = await upsert_oauth_user(name, email, "google", avatar)
        user_id = user["id"]
        is_new = existing is None
    else:
        user_id = f"google-{secrets.token_hex(6)}"
        is_new = True

    jwt_token = create_jwt(user_id, email, name, avatar)
    return RedirectResponse(
        f"{FRONTEND_URL}/auth/callback?token={jwt_token}&provider=google&new={'1' if is_new else '0'}"
    )


@router.get("/github")
async def github_login(request: Request):
    if not GITHUB_CLIENT_ID:
        raise HTTPException(501, "GitHub OAuth not configured")
    return await oauth.github.authorize_redirect(request, GITHUB_REDIRECT_URI)


@router.get("/github/callback")
async def github_callback(request: Request):
    try:
        token = await oauth.github.authorize_access_token(request)
    except Exception as exc:
        log.error("GitHub OAuth error: %s", exc)
        return RedirectResponse(f"{FRONTEND_URL}/login?error=github_auth_failed")

    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Accept": "application/vnd.github+json",
        }
        profile_res = await client.get("https://api.github.com/user", headers=headers)
        profile = profile_res.json()

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
        return RedirectResponse(f"{FRONTEND_URL}/login?error=no_email")

    is_new = False
    if DATABASE_URL:
        existing = await find_user_by_email(email)
        user = await upsert_oauth_user(name, email, "github", avatar)
        user_id = user["id"]
        is_new = existing is None
    else:
        user_id = f"github-{secrets.token_hex(6)}"
        is_new = True

    jwt_token = create_jwt(user_id, email, name, avatar)
    return RedirectResponse(
        f"{FRONTEND_URL}/auth/callback?token={jwt_token}&provider=github&new={'1' if is_new else '0'}"
    )


class DeleteAccountRequest(BaseModel):
    reason: str = ""


@router.delete("/delete-account")
async def delete_account(req: DeleteAccountRequest, request: Request):
    if not DATABASE_URL:
        raise HTTPException(501, "Account deletion requires database connection")

    payload = await _get_current_user(request)
    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(401, "Invalid token — no user ID")

    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")
        await conn.execute("DELETE FROM concept_events WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM exercise_completions WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)

    log.info("Account deleted user_id=%s reason=%r", user_id, req.reason)
    return {"status": "deleted", "message": "Your account has been permanently deleted"}
