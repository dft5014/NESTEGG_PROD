# backend/auth_clerk.py
import os, time, uuid
from datetime import datetime, timedelta
from typing import Optional, List

import requests
from sqlalchemy.exc import IntegrityError

import jwt  # HS256 for app token (your app's JWT)
from jose import jwt as jose_jwt  # RS256 for Clerk token

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

# ---- import the ONE shared DB + tables ----
from backend.core_db import database, users  # <- single source of truth

# ---------- Env & shared constants ----------
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
DEFAULT_PLAN = os.getenv("DEFAULT_PLAN", "basic")

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_ISSUER = os.getenv("CLERK_ISSUER")
CLERK_AUDIENCE = os.getenv("CLERK_AUDIENCE")

# ---------- Token helpers ----------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ---------- JWKS cache & verify ----------
_jwks_cache = None
_jwks_fetched_at = 0

def _get_jwks():
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if _jwks_cache and (now - _jwks_fetched_at) < 3600:
        return _jwks_cache
    if not CLERK_JWKS_URL:
        raise HTTPException(status_code=500, detail="CLERK_JWKS_URL not configured")
    resp = requests.get(CLERK_JWKS_URL, timeout=5)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_fetched_at = now
    return _jwks_cache

def verify_clerk_jwt(token: str) -> dict:
    jwks = _get_jwks()
    headers = jose_jwt.get_unverified_header(token)
    kid = headers.get("kid")
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        # refresh once in case of rotation
        _jwks_cache = None  # invalidate cache
        jwks = _get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="No matching JWKS key")
    options = {"verify_aud": bool(CLERK_AUDIENCE), "verify_iss": bool(CLERK_ISSUER)}
    return jose_jwt.decode(
        token,
        key,
        algorithms=[headers.get("alg", "RS256")],
        audience=CLERK_AUDIENCE if CLERK_AUDIENCE else None,
        issuer=CLERK_ISSUER if CLERK_ISSUER else None,
        options=options,
    )

# ---------- Models ----------
class ClerkExchangeRequest(BaseModel):
    clerk_jwt: str
    plan: Optional[str] = None
    features: Optional[List[str]] = None

class OnboardProfile(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    date_of_birth: Optional[str] = None  # yyyy-mm-dd

# ---------- Current user (supports legacy sub=email or explicit user_id) ----------
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = None
        user_id = payload.get("user_id")
        if user_id:
            user = await database.fetch_one(users.select().where(users.c.id == user_id))
        else:
            sub_email = (payload.get("sub") or "").strip().lower()
            if sub_email:
                user = await database.fetch_one(users.select().where(users.c.email == sub_email))
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid credentials: {e}")

# ---------- Upsert/link Clerk user ----------
async def _link_or_create_user_from_clerk(claims: dict, plan_hint: Optional[str]) -> tuple[str, str]:
    # Normalize email from various Clerk token shapes
    email = (claims.get("email") or claims.get("primary_email_address") or "").strip().lower()
    if not email:
        emails = claims.get("email_addresses") or []
        if isinstance(emails, list) and emails:
            email = (emails[0].get("email_address") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email in Clerk token")

    clerk_id = (claims.get("sub") or "").strip()
    plan = (
        plan_hint
        or (claims.get("public_metadata", {}) or {}).get("plan")
        or (claims.get("unsafe_metadata", {}) or {}).get("plan")
        or DEFAULT_PLAN
    )

    # 1) Lookup by clerk_id or email
    existing = await database.fetch_one(
        users.select().where((users.c.clerk_id == clerk_id) | (users.c.email == email))
    )
    if existing:
        await database.execute(
            users.update()
            .where(users.c.id == existing["id"])
            .values(
                clerk_id=existing["clerk_id"] or (clerk_id or None),
                auth_provider="clerk",
                subscription_plan=plan or existing["subscription_plan"] or DEFAULT_PLAN,
            )
        )
        return existing["id"], plan or existing["subscription_plan"] or DEFAULT_PLAN

    # 2) Create new user (race-safe)
    new_id = str(uuid.uuid4())
    try:
        await database.execute(
            users.insert().values(
                id=new_id,
                email=email,
                password_hash=None,    # NULL for Clerk users
                clerk_id=(clerk_id or None),
                auth_provider="clerk",
                subscription_plan=plan or DEFAULT_PLAN,
            )
        )
        return new_id, plan or DEFAULT_PLAN
    except IntegrityError:
        row = await database.fetch_one(users.select().where(users.c.email == email))
        if not row:
            raise HTTPException(status_code=500, detail="Race during user upsert")
        if clerk_id and not row["clerk_id"]:
            await database.execute(
                users.update().where(users.c.id == row["id"]).values(clerk_id=clerk_id, auth_provider="clerk")
            )
        return row["id"], row["subscription_plan"] or (plan or DEFAULT_PLAN)

# ---------- Router & endpoints ----------
router = APIRouter()

@router.post("/auth/exchange")
async def exchange_clerk_token(payload: ClerkExchangeRequest):
    """
    Accept a Clerk session JWT, verify it, upsert/link user in our DB,
    and return a NestEgg JWT compatible with existing clients.
    """
    if not payload.clerk_jwt:
        raise HTTPException(status_code=400, detail="clerk_jwt is required")

    try:
        claims = verify_clerk_jwt(payload.clerk_jwt)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Clerk token: {e}")

    # choose plan/features (payload > Clerk public/unsafe metadata > default)
    plan = payload.plan or (claims.get("public_metadata", {}) or {}).get("plan") \
           or (claims.get("unsafe_metadata", {}) or {}).get("plan") \
           or DEFAULT_PLAN
    features = payload.features or (claims.get("public_metadata", {}) or {}).get("features") \
               or (claims.get("unsafe_metadata", {}) or {}).get("features") \
               or []
    if not isinstance(features, list):
        features = []

    # link/create user row and set clerk_id/auth_provider
    supa_user_id, plan = await _link_or_create_user_from_clerk(claims, plan)

    # Existing clients expect {"sub": email}; keep it, add user_id/plan
    email_for_sub = (claims.get("email") or claims.get("primary_email_address") or "").strip().lower()
    if not email_for_sub:
        row = await database.fetch_one(users.select().where(users.c.id == supa_user_id))
        email_for_sub = (row["email"] or "").strip().lower() if row else ""

    access_token = create_access_token({
        "sub": email_for_sub,
        "user_id": supa_user_id,
        "plan": plan,
        "features": features,
        "auth": "clerk",
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": supa_user_id,
        "plan": plan,
        "features": features,
    }

@router.post("/me/onboard")
async def save_onboard_profile(payload: OnboardProfile, current_user=Depends(get_current_user)):
    """
    Saves basic profile fields for the logged-in user.
    If you later add a separate user_profiles table, upsert there instead.
    """
    user_id = current_user["id"]
    values = {k: v for k, v in payload.dict().items() if v not in (None, "")}
    if not values:
        return {"ok": True}

    # Only update columns that exist on `users`. If you have a profile table, write there instead.
    existing_cols = set(users.c.keys())
    allowed = {"first_name", "last_name", "phone", "occupation", "date_of_birth", "subscription_plan"}
    writable = existing_cols & allowed
    update_values = {k: v for k, v in values.items() if k in writable}


    if update_values:
        await database.execute(users.update().where(users.c.id == user_id).values(**update_values))

    return {"ok": True}
