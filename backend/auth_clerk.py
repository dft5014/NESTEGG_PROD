import os
import time
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List

import requests
from sqlalchemy.exc import IntegrityError

import jwt  # HS256 for app token (your app's JWT)
from jose import jwt as jose_jwt  # RS256 for Clerk token

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

# ---- logging ----
logger = logging.getLogger("auth_clerk")

# ---- import the ONE shared DB + tables ----
from backend.core_db import database, users  # single source of truth

# ---------- Env & shared constants ----------
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_ISSUER = os.getenv("CLERK_ISSUER")
CLERK_AUDIENCE = os.getenv("CLERK_AUDIENCE")
DEFAULT_PLAN = os.getenv("DEFAULT_PLAN", "basic")

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")  # required for Admin API fallback
CLERK_API_URL = os.getenv("CLERK_API_URL", "https://api.clerk.com")

# ---------- Token helpers ----------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token

# ---------- JWKS cache & verify ----------
_jwks_cache = None
_jwks_fetched_at = 0

def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if _jwks_cache and (now - _jwks_fetched_at) < 3600:
        return _jwks_cache
    if not CLERK_JWKS_URL:
        logger.error("CLERK_JWKS_URL not configured")
        raise HTTPException(status_code=500, detail="CLERK_JWKS_URL not configured")
    try:
        resp = requests.get(CLERK_JWKS_URL, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
        logger.debug("jwks.fetch.success")
        return _jwks_cache
    except Exception as e:
        logger.exception("jwks.fetch.failed")
        raise HTTPException(status_code=500, detail=f"Failed to fetch JWKS: {e}")

def verify_clerk_jwt(token: str) -> dict:
    global _jwks_cache  # so we can invalidate on rotation
    jwks = _get_jwks()
    headers = jose_jwt.get_unverified_header(token)
    kid = headers.get("kid")
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        # refresh once in case of rotation
        _jwks_cache = None
        jwks = _get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            logger.error("jwks.key_not_found", extra={"kid": kid})
            raise HTTPException(status_code=401, detail="No matching JWKS key")
    options = {"verify_aud": bool(CLERK_AUDIENCE), "verify_iss": bool(CLERK_ISSUER)}
    try:
        claims = jose_jwt.decode(
            token,
            key,
            algorithms=[headers.get("alg", "RS256")],
            audience=CLERK_AUDIENCE if CLERK_AUDIENCE else None,
            issuer=CLERK_ISSUER if CLERK_ISSUER else None,
            options=options,
        )
        return claims
    except Exception as e:
        logger.exception("clerk.jwt.verify_failed")
        raise HTTPException(status_code=401, detail=f"Invalid Clerk token: {e}")

def _fetch_email_from_clerk_api(clerk_id: str) -> Optional[str]:
    """
    Fallback: use Clerk Admin API to get the primary email when it's not in the JWT.
    """
    if not (CLERK_SECRET_KEY and clerk_id):
        logger.info("clerk.api.skip", extra={"has_secret": bool(CLERK_SECRET_KEY), "has_id": bool(clerk_id)})
        return None
    try:
        url = f"{CLERK_API_URL}/v1/users/{clerk_id}"
        resp = requests.get(url, headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"}, timeout=5)
        if resp.status_code != 200:
            logger.warning("clerk.api.user_fetch.non_200", extra={"status": resp.status_code})
            return None
        data = resp.json()
        primary_id = data.get("primary_email_address_id")
        emails = data.get("email_addresses") or []
        if primary_id:
            for e in emails:
                if e.get("id") == primary_id and e.get("email_address"):
                    email = e["email_address"].strip().lower()
                    logger.info("clerk.api.user_fetch.primary_email", extra={"email": email})
                    return email
        for e in emails:
            if e.get("email_address"):
                email = e["email_address"].strip().lower()
                logger.info("clerk.api.user_fetch.first_email", extra={"email": email})
                return email
    except Exception:
        logger.exception("clerk.api.user_fetch.error")
    return None

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
            logger.warning("auth.current_user.not_found")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user
    except jwt.ExpiredSignatureError:
        logger.info("auth.current_user.expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError as e:
        logger.exception("auth.current_user.decode_failed")
        raise HTTPException(status_code=401, detail=f"Invalid credentials: {e}")

# ---------- Upsert/link Clerk user ----------
async def _link_or_create_user_from_clerk(claims: dict, plan_hint: Optional[str]) -> tuple[str, str]:
    # Normalize email from various Clerk token shapes
    email = (claims.get("email") or claims.get("primary_email_address") or "").strip().lower()
    if not email:
        emails = claims.get("email_addresses") or []
        if isinstance(emails, list):
            for e in emails:
                if e and isinstance(e, dict) and e.get("email_address"):
                    email = e["email_address"].strip().lower()
                    logger.info("clerk.link.email_from_array", extra={"email": email})
                    break
    clerk_id = (claims.get("sub") or "").strip()

    # Final fallback: fetch from Clerk Admin API by id
    if not email and clerk_id:
        logger.info("clerk.link.fetch_email_fallback", extra={"sub": clerk_id})
        email = _fetch_email_from_clerk_api(clerk_id)

    if not email:
        logger.error("clerk.link.no_email", extra={"sub": clerk_id})
        raise HTTPException(status_code=400, detail="No email in Clerk token")

    plan = (
        plan_hint
        or (claims.get("public_metadata", {}) or {}).get("plan")
        or (claims.get("unsafe_metadata", {}) or {}).get("plan")
        or DEFAULT_PLAN
    )

    logger.info("clerk.link.lookup", extra={"email": email, "sub": clerk_id})

    # 1) Lookup by clerk_id or email
    existing = await database.fetch_one(
        users.select().where((users.c.clerk_id == clerk_id) | (users.c.email == email))
    )

    if existing:
        logger.info("clerk.link.existing_user", extra={"user_id": existing["id"], "had_clerk_id": bool(existing["clerk_id"])})
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
        logger.info("clerk.link.created_user", extra={"user_id": new_id, "email": email, "plan": plan})
        return new_id, plan or DEFAULT_PLAN
    except IntegrityError:
        logger.warning("clerk.link.integrity_race", extra={"email": email})
        row = await database.fetch_one(users.select().where(users.c.email == email))
        if not row:
            logger.error("clerk.link.race_no_row")
            raise HTTPException(status_code=500, detail="Race during user upsert")
        if clerk_id and not row["clerk_id"]:
            await database.execute(
                users.update().where(users.c.id == row["id"]).values(clerk_id=clerk_id, auth_provider="clerk")
            )
        logger.info("clerk.link.race_linked", extra={"user_id": row["id"]})
        return row["id"], row["subscription_plan"] or (plan or DEFAULT_PLAN)

# ---------- Router & endpoints ----------
router = APIRouter()

@router.post("/auth/exchange")
async def exchange_clerk_token(payload: ClerkExchangeRequest):
    """
    Accept a Clerk session JWT, verify it, upsert/link user in our DB,
    and return a NestEgg JWT compatible with existing clients.
    """
    logger.info("clerk.exchange.start", extra={"has_token": bool(payload.clerk_jwt)})

    if not payload.clerk_jwt:
        logger.error("clerk.exchange.missing_token")
        raise HTTPException(status_code=400, detail="clerk_jwt is required")

    try:
        claims = verify_clerk_jwt(payload.clerk_jwt)
    except HTTPException:
        # verify_clerk_jwt already logged the reason
        raise
    except Exception as e:
        logger.exception("clerk.exchange.verify_unexpected")
        raise HTTPException(status_code=401, detail=f"Invalid Clerk token: {e}")

    logger.info("clerk.exchange.verified", extra={
        "sub": claims.get("sub"),
        "iss": claims.get("iss"),
        "aud": claims.get("aud"),
        "has_email": bool(claims.get("email") or claims.get("primary_email_address")),
        "has_email_addresses": bool(claims.get("email_addresses")),
    })

    # choose plan/features (payload > Clerk public/unsafe metadata > default)
    plan = payload.plan or (claims.get("public_metadata", {}) or {}).get("plan") \
           or (claims.get("unsafe_metadata", {}) or {}).get("plan") \
           or DEFAULT_PLAN
    features = payload.features or (claims.get("public_metadata", {}) or {}).get("features") \
               or (claims.get("unsafe_metadata", {}) or {}).get("features") \
               or []
    if not isinstance(features, list):
        features = []

    logger.info("clerk.exchange.upsert_attempt", extra={"sub": claims.get("sub"), "plan": plan})

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

    logger.info("clerk.exchange.success", extra={
        "user_id": supa_user_id,
        "plan": plan,
        "features_len": len(features),
        "has_app_token": bool(access_token),
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
        logger.info("onboard.noop", extra={"user_id": user_id})
        return {"ok": True}

    # Only update columns that exist on `users`. If you have a profile table, write there instead.
    existing_cols = set(users.c.keys())
    allowed = {"first_name", "last_name", "phone", "occupation", "date_of_birth", "subscription_plan"}
    writable = existing_cols & allowed
    update_values = {k: v for k, v in values.items() if k in writable}

    if update_values:
        await database.execute(users.update().where(users.c.id == user_id).values(**update_values))
        logger.info("onboard.updated", extra={"user_id": user_id, "fields": list(update_values.keys())})
    else:
        logger.info("onboard.skipped_no_columns", extra={"user_id": user_id})

    return {"ok": True}
