# backend/webhooks_clerk.py
import os
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request, HTTPException
from svix.webhooks import Webhook, WebhookVerificationError  # pip install svix

from backend.core_db import database, users  # single source of truth

logger = logging.getLogger("clerk_webhooks")

# ---- ENV ----
CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")  # Clerk dashboard → Webhooks → Signing secret


# ---- Router ----
router = APIRouter(tags=["clerk-webhooks"])


# ---- Helpers -----------------------------------------------------------------

def _verify_clerk_signature(headers: dict, body: bytes) -> None:
    """
    Verify the Svix signature on the raw request body.
    Raises HTTPException(400/500) if missing or invalid.
    """
    if not CLERK_WEBHOOK_SECRET:
        logger.error("clerk.webhook.missing_secret_env")
        raise HTTPException(status_code=500, detail="CLERK_WEBHOOK_SECRET not configured")

    svix_headers = {
        "svix-id": headers.get("svix-id"),
        "svix-timestamp": headers.get("svix-timestamp"),
        "svix-signature": headers.get("svix-signature"),
    }
    if not all(svix_headers.values()):
        logger.warning("clerk.webhook.missing_headers", extra={"have": {k: bool(v) for k, v in svix_headers.items()}})
        raise HTTPException(status_code=400, detail="Missing signature headers")

    try:
        wh = Webhook(CLERK_WEBHOOK_SECRET)
        # Verify signature (raises if invalid). We don't need the return value.
        wh.verify(body, svix_headers)
    except WebhookVerificationError as e:
        logger.warning("clerk.webhook.verify_failed", extra={"error": str(e)})
        raise HTTPException(status_code=400, detail="Invalid signature")


def _extract_primary_email_from_user(user: Dict[str, Any]) -> Optional[str]:
    """
    From a Clerk 'user' object (event.data), return the primary email string.
    """
    primary_id = user.get("primary_email_address_id")
    for e in user.get("email_addresses") or []:
        if (primary_id and e.get("id") == primary_id) or (not primary_id and e.get("email_address")):
            addr = (e.get("email_address") or "").strip().lower()
            if addr:
                return addr
    return None


async def _upsert_user_from_clerk_user(user: Dict[str, Any]) -> None:
    """
    Map Clerk user payload → your `users` table.
    Creates or updates by (clerk_id) or (email).
    Only writes columns that actually exist on your table.
    """
    clerk_id: Optional[str] = user.get("id")
    email: Optional[str] = _extract_primary_email_from_user(user)

    if not (clerk_id or email):
        logger.info("clerk.webhook.user.skip_no_keys")
        return

    # Metadata and profile
    first_name = user.get("first_name")
    last_name = user.get("last_name")
    image_url = user.get("image_url")

    public_meta = user.get("public_metadata") or {}
    unsafe_meta = user.get("unsafe_metadata") or {}

    plan = public_meta.get("plan") or unsafe_meta.get("plan") or None
    phone = unsafe_meta.get("phone")
    occupation = unsafe_meta.get("occupation")
    date_of_birth = unsafe_meta.get("date_of_birth")

    # Determine which columns exist (your Supabase schema)
    existing_cols = set(users.c.keys())

    # Build values to upsert
    values: Dict[str, Any] = {}
    if "email" in existing_cols and email:
        values["email"] = email
    if "first_name" in existing_cols and first_name is not None:
        values["first_name"] = first_name
    if "last_name" in existing_cols and last_name is not None:
        values["last_name"] = last_name
    if "image_url" in existing_cols and image_url is not None:
        values["image_url"] = image_url
    if "phone" in existing_cols and phone is not None:
        values["phone"] = phone
    if "occupation" in existing_cols and occupation is not None:
        values["occupation"] = occupation
    if "date_of_birth" in existing_cols and date_of_birth is not None:
        values["date_of_birth"] = date_of_birth
    if "subscription_plan" in existing_cols and plan:
        values["subscription_plan"] = str(plan)

    # Lookup by clerk_id first, then by email
    row = await database.fetch_one(
        users.select().where((users.c.clerk_id == clerk_id) | (users.c.email == (email or "")))
    )

    if row:
        upd_vals = dict(values)
        if "auth_provider" in existing_cols:
            upd_vals["auth_provider"] = "clerk"
        if "clerk_id" in existing_cols and not row["clerk_id"] and clerk_id:
            upd_vals["clerk_id"] = clerk_id

        await database.execute(users.update().where(users.c.id == row["id"]).values(**upd_vals))
        logger.info(
            "clerk.webhook.user.updated",
            extra={"user_id": str(row["id"]), "email": email, "plan": values.get("subscription_plan")},
        )
    else:
        ins_vals = dict(values)
        # Required / defaults
        if "password_hash" in existing_cols:
            ins_vals["password_hash"] = None
        if "clerk_id" in existing_cols:
            ins_vals["clerk_id"] = clerk_id
        if "auth_provider" in existing_cols:
            ins_vals["auth_provider"] = "clerk"
        if "subscription_plan" in existing_cols and "subscription_plan" not in ins_vals:
            ins_vals["subscription_plan"] = "basic"

        # NOTE: your Supabase table defines id as uuid with a default (gen_random_uuid()).
        # So we don't set `id` here—let the DB default generate it.
        await database.execute(users.insert().values(**ins_vals))
        logger.info("clerk.webhook.user.created", extra={"email": email, "plan": ins_vals.get("subscription_plan")})


async def _sync_subscription_to_user(subscription: Dict[str, Any]) -> None:
    """
    Mirror Clerk Billing subscription changes to users table (plan, etc.).
    The payload shape can vary; we extract defensively.
    """
    clerk_user_id = (
        subscription.get("user_id")
        or subscription.get("user")
        or subscription.get("owner_id")
    )

    if not clerk_user_id:
        logger.info("clerk.webhook.subscription.skip_no_user")
        return

    # Best-effort plan extraction
    plan = (
        subscription.get("plan")
        or (subscription.get("price") or {}).get("product")
        or (subscription.get("items") or [{}])[0].get("price", {}).get("product")
    )
    status = subscription.get("status")

    row = await database.fetch_one(users.select().where(users.c.clerk_id == clerk_user_id))
    if not row:
        logger.info("clerk.webhook.subscription.no_user_yet", extra={"clerk_id": clerk_user_id})
        return

    upd_vals: Dict[str, Any] = {}
    if plan and "subscription_plan" in users.c.keys():
        upd_vals["subscription_plan"] = str(plan)

    # If you later add users.subscription_status, update it here as well.
    if upd_vals:
        await database.execute(users.update().where(users.c.id == row["id"]).values(**upd_vals))
        logger.info(
            "clerk.webhook.subscription.updated",
            extra={"user_id": str(row["id"]), "plan": upd_vals.get("subscription_plan"), "status": status},
        )


# ---- Routes ------------------------------------------------------------------

@router.get("/webhooks/clerk/health")
async def clerk_webhook_health():
    """
    Simple GET health check (handy to test routing quickly in a browser).
    """
    ok = bool(CLERK_WEBHOOK_SECRET)
    return {"ok": ok, "has_signing_secret": ok}


@router.post("/webhooks/clerk")
async def clerk_webhook(request: Request):
    """
    Single endpoint for all Clerk events.
    - Verifies Svix signature on the raw body.
    - Parses JSON leniently (no strict Pydantic model).
    - Routes by `type` and upserts/syncs as needed.
    """
    raw = await request.body()
    _verify_clerk_signature(request.headers, raw)

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        logger.exception("clerk.webhook.bad_payload.json_decode")
        raise HTTPException(status_code=400, detail="Bad payload")

    etype = payload.get("type")
    data = payload.get("data") or {}

    logger.info("clerk.webhook.received", extra={"type": etype})

    # User lifecycle
    if etype in ("user.created", "user.updated"):
        await _upsert_user_from_clerk_user(data)
        return {"ok": True}

    # Subscription lifecycle (Clerk Billing or your provider webhooks forwarded through Clerk)
    if etype in (
        "subscription.created",
        "subscription.updated",
        "subscription.deleted",
        "subscription.paused",
        "subscription.resumed",
        "subscription.canceled",
    ):
        await _sync_subscription_to_user(data)
        return {"ok": True}

    # Add more handlers as needed (email_address.updated, phone_number.updated, etc.)
    logger.info("clerk.webhook.ignored", extra={"type": etype})
    return {"ok": True}
