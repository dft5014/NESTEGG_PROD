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

# ---- organize data from clerk to supabase ----

def _profile_from_claims(claims: dict) -> dict:
    """
    Build a flat profile dict from Clerk JWT claims (and public/unsafe metadata).
    Only primitive values; date_of_birth will be parsed by the API consumer later.
    """
    pm = (claims.get("public_metadata") or {}) or {}
    um = (claims.get("unsafe_metadata") or {}) or {}
    out = {
        "first_name": claims.get("first_name"),
        "last_name": claims.get("last_name"),
        "image_url": claims.get("image_url"),
        # optional metadata we’ve been using in onboarding
        "phone": um.get("phone") or pm.get("phone"),
        "occupation": um.get("occupation") or pm.get("occupation"),
        "date_of_birth": um.get("date_of_birth") or pm.get("date_of_birth"),
        # subscription plan (also handled separately)
        "subscription_plan": um.get("plan") or pm.get("plan"),
    }
    # normalize blanks to None
    return {k: (v if (v is not None and str(v).strip() != "") else None) for k, v in out.items()}

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

def _profile_from_claims(claims: dict) -> dict:
    """
    Extracts profile-ish fields from Clerk claims defensively.
    Only returns keys when there is a non-empty value.
    """
    unsafe = (claims.get("unsafe_metadata") or {}) if isinstance(claims.get("unsafe_metadata"), dict) else {}
    out = {}

    # Names & avatar
    for k_src, k_dst in (("first_name", "first_name"), ("last_name", "last_name"), ("image_url", "image_url")):
        v = claims.get(k_src)
        if v:
            out[k_dst] = v

    # Optional fields we store in our users table (if columns exist)
    for k in ("phone", "occupation", "date_of_birth"):
        v = unsafe.get(k)
        if v not in (None, "", []):
            # Normalize date if Clerk sent a full ISO timestamp; Postgres DATE accepts YYYY-MM-DD
            if k == "date_of_birth" and isinstance(v, str) and len(v) >= 10:
                out[k] = v[:10]
            else:
                out[k] = v

    # Plan can be signaled in public or unsafe metadata
    pm = claims.get("public_metadata") or {}
    if isinstance(pm, dict) and pm.get("plan"):
        out["subscription_plan"] = pm["plan"]
    elif unsafe.get("plan"):
        out["subscription_plan"] = unsafe["plan"]

    return out


# ---------- Upsert/link Clerk user ----------
async def _link_or_create_user_from_clerk(claims: dict, plan_hint: Optional[str]) -> tuple[str, str]:
    # 1) Normalize email from various Clerk token shapes
    email = (claims.get("email") or claims.get("primary_email_address") or "").strip().lower()

    # If not present, consult the array
    if not email:
        emails = claims.get("email_addresses") or []
        if isinstance(emails, list):
            # Prefer the one that matches primary_email_address_id, else first verified, else first any.
            primary_id = claims.get("primary_email_address_id")
            chosen = None
            if primary_id:
                chosen = next((e for e in emails if isinstance(e, dict) and e.get("id") == primary_id and e.get("email_address")), None)
            if not chosen:
                chosen = next((e for e in emails if isinstance(e, dict) and e.get("verification") and e["verification"].get("status") == "verified" and e.get("email_address")), None)
            if not chosen:
                chosen = next((e for e in emails if isinstance(e, dict) and e.get("email_address")), None)
            if chosen:
                email = (chosen.get("email_address") or "").strip().lower()

    clerk_id = (claims.get("sub") or "").strip()

    # Final fallback: call Clerk Admin API to resolve email by id
    if not email and clerk_id:
        logger.info("clerk.link.fetch_email_fallback", extra={"sub": clerk_id})
        email = _fetch_email_from_clerk_api(clerk_id)

    if not email:
        logger.error("clerk.link.no_email", extra={"sub": clerk_id})
        raise HTTPException(status_code=400, detail="No email in Clerk token")

    # 2) Determine plan WITHOUT overriding a stronger value already in DB
    profile = _profile_from_claims(claims)
    plan_from_meta = profile.get("subscription_plan")
    plan = plan_hint or plan_from_meta or DEFAULT_PLAN

    logger.info("clerk.link.lookup", extra={"email": email, "sub": clerk_id})

    # 3) Lookup existing by clerk_id OR email
    existing = await database.fetch_one(
        users.select().where((users.c.clerk_id == clerk_id) | (users.c.email == email))
    )
    existing_cols = set(users.c.keys())

    if existing:
        # Build update set without overwriting good data with None/empty
        update_values = {
            "clerk_id": existing["clerk_id"] or (clerk_id or None),
            "auth_provider": "clerk",
            # Keep existing subscription if it's more authoritative (e.g., set by webhook):
            "subscription_plan": plan or existing["subscription_plan"] or DEFAULT_PLAN,
        }

        # Only set columns that exist and have a non-empty value coming in
        field_candidates = ("first_name", "last_name", "phone", "occupation", "date_of_birth", "image_url")
        for col in field_candidates:
            if col in existing_cols:
                incoming = profile.get(col)
                if incoming not in (None, "", []):
                    # Avoid write if value is identical (minor perf/log noise reduction)
                    if existing.get(col) != incoming:
                        update_values[col] = incoming

        # Log intent (which keys are changing)
        intent_keys = [k for k in update_values.keys() if k not in ("auth_provider",)]
        logger.info("clerk.link.existing_user", extra={
            "user_id": str(existing["id"]),
            "had_clerk_id": bool(existing["clerk_id"]),
            "update_keys": intent_keys
        })

        if len(update_values) > 0:
            await database.execute(users.update().where(users.c.id == existing["id"]).values(**update_values))

        # If DB already had a plan and no new plan came in, keep DB’s plan
        final_plan = update_values.get("subscription_plan") or existing["subscription_plan"] or DEFAULT_PLAN
        return str(existing["id"]), final_plan

    # 4) Create new (race-safe)
    new_id = str(uuid.uuid4())
    try:
        insert_values = {
            "id": new_id,
            "email": email,
            "password_hash": None,          # NULL for Clerk users
            "clerk_id": (clerk_id or None),
            "auth_provider": "clerk",
            "subscription_plan": profile.get("subscription_plan") or plan or DEFAULT_PLAN,
        }

        for col in ("first_name", "last_name", "phone", "occupation", "date_of_birth", "image_url"):
            if col in existing_cols and profile.get(col) not in (None, "", []):
                insert_values[col] = profile[col]

        await database.execute(users.insert().values(**insert_values))
        logger.info("clerk.link.created_user", extra={
            "user_id": new_id, "email": email, "plan": insert_values["subscription_plan"]
        })
        return new_id, insert_values["subscription_plan"]

    except IntegrityError:
        # Classic race on email uniqueness—re-link to clerk_id if needed
        logger.warning("clerk.link.integrity_race", extra={"email": email})
        row = await database.fetch_one(users.select().where(users.c.email == email))
        if not row:
            logger.error("clerk.link.race_no_row")
            raise HTTPException(status_code=500, detail="Race during user upsert")

        if clerk_id and not row["clerk_id"]:
            await database.execute(
                users.update().where(users.c.id == row["id"]).values(clerk_id=clerk_id, auth_provider="clerk")
            )
            logger.info("clerk.link.race_linked", extra={"user_id": str(row["id"])})

        final_plan = row["subscription_plan"] or (plan or DEFAULT_PLAN)
        return str(row["id"]), final_plan

# ---------- Router & endpoints ----------
router = APIRouter()

@router.post("/auth/exchange")
async def exchange_clerk_token(payload: ClerkExchangeRequest):
    """
    Accept a Clerk session JWT, verify it, upsert/link user in our DB,
    and return a NestEgg JWT compatible with existing clients.
    """
    logger.info("clerk.exchange.start", extra={"has_token": bool(payload.clerk_jwt)})
    logger.info("clerk.exchange.config", extra={
    "has_secret": bool(CLERK_SECRET_KEY),
    "has_issuer": bool(CLERK_ISSUER),
    "has_aud": bool(CLERK_AUDIENCE),
    })

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

    # Ensure serializable primitives only
    supa_user_id = str(supa_user_id) if supa_user_id is not None else ""
    plan = str(plan) if plan is not None else DEFAULT_PLAN
    if not isinstance(features, list):
        features = []
    else:
        # make sure everything in features is JSON-serializable (stringify UUIDs etc.)
        features = [str(x) if not isinstance(x, (str, int, float, bool, type(None))) else x for x in features]

    access_token = create_access_token({
        "sub": (email_for_sub or "").strip().lower(),
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
