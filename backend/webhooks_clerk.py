# backend/webhooks_clerk.py
import os
import json
import logging
from datetime import date
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, HTTPException
from svix.webhooks import Webhook, WebhookVerificationError

from backend.core_db import database, users

logger = logging.getLogger("clerk_webhooks")

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")  # Clerk > Webhooks > Signing Secret
if not CLERK_WEBHOOK_SECRET:
    logger.warning("clerk.webhook.missing_secret_env")

router = APIRouter()


def _verify_clerk_signature(headers: dict, body: bytes) -> None:
    if not CLERK_WEBHOOK_SECRET:
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
        wh.verify(body, svix_headers)  # will raise if invalid
    except WebhookVerificationError as e:
        logger.warning("clerk.webhook.verify_failed", extra={"err": str(e)})
        raise HTTPException(status_code=400, detail="Invalid signature")


def _extract_primary_email(clerk_user: Dict[str, Any]) -> Optional[str]:
    """Return the primary email (lowercased) from Clerk user payload."""
    email = None
    primary_id = clerk_user.get("primary_email_address_id")
    for e in clerk_user.get("email_addresses") or []:
        # prefer primary; fallback to first available
        if (primary_id and e.get("id") == primary_id) or (not primary_id and e.get("email_address")):
            email = (e.get("email_address") or "").strip().lower()
            break
    return email


def _to_date(val: Any) -> Optional[date]:
    """Cast common date string formats to date; return None on failure."""
    if not val:
        return None
    if isinstance(val, date):
        return val
    s = str(val).strip()
    if not s or s.lower() in ("null", "none"):
        return None
    # accept YYYY-MM-DD, or YYYY/MM/DD
    for sep in ("-", "/"):
        parts = s.split(sep)
        if len(parts) == 3 and all(p.isdigit() for p in parts):
            try:
                y, m, d = map(int, parts)
                return date(y, m, d)
            except Exception:
                pass
    return None


async def _upsert_user_from_clerk_user(clerk_user: Dict[str, Any]) -> None:
    """
    Map Clerk user payload → your `users` table.
    Updates when row exists (by clerk_id or email); inserts otherwise.
    """
    clerk_id = clerk_user.get("id")
    email = _extract_primary_email(clerk_user)

    pm = clerk_user.get("public_metadata") or {}
    um = clerk_user.get("unsafe_metadata") or {}

    # fields we try to persist
    first_name = clerk_user.get("first_name")
    last_name  = clerk_user.get("last_name")
    image_url  = clerk_user.get("image_url")
    plan       = pm.get("plan") or um.get("plan")
    phone      = um.get("phone")
    occupation = um.get("occupation")
    dob        = _to_date(um.get("date_of_birth"))

    logger.info("clerk.webhook.user.parsed",
        extra={"clerk_id": clerk_id, "email": email, "first_name": first_name,
               "last_name": last_name, "plan": plan, "has_dob": bool(dob)})

    if not (clerk_id or email):
        logger.info("clerk.webhook.user.skip_no_keys")
        return

    # find existing row
    row = await database.fetch_one(
        users.select().where((users.c.clerk_id == clerk_id) | (users.c.email == (email or "")))
    )

    # Build values that actually exist as columns
    existing_cols = set(users.c.keys())
    values: Dict[str, Any] = {}
    if email and "email" in existing_cols: values["email"] = email
    if first_name is not None and "first_name" in existing_cols: values["first_name"] = first_name
    if last_name  is not None and "last_name"  in existing_cols: values["last_name"]  = last_name
    if image_url  is not None and "image_url"  in existing_cols: values["image_url"]  = image_url
    if phone      is not None and "phone"      in existing_cols: values["phone"]      = phone
    if occupation is not None and "occupation" in existing_cols: values["occupation"] = occupation
    if dob is not None and "date_of_birth" in existing_cols:     values["date_of_birth"] = dob
    if plan and "subscription_plan" in existing_cols:            values["subscription_plan"] = str(plan)

    if row:
        # UPDATE
        values.update({
            "clerk_id": row["clerk_id"] or clerk_id,
            "auth_provider": "clerk",
        })
        logger.info("clerk.webhook.user.update.values user_id=%s values=%s",
            str(row["id"]), json.dumps({k: str(v) for k, v in values.items()}))
        query = users.update().where(users.c.id == row["id"]).values(**values)
        res = await database.execute(query)
        # databases.execute returns the primary key for inserts; for updates it returns lastrowid (None on PG).
        # So we log an extra read to confirm changes happened.
        chk = await database.fetch_one(users.select().where(users.c.id == row["id"]))
        logger.info("clerk.webhook.user.updated", extra={"user_id": str(row["id"]), "email": chk["email"], "plan": chk["subscription_plan"]})
    else:
        # INSERT
        insert_values = {
            "email": email or "",               # required in your schema
            "password_hash": None,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "occupation": occupation,
            "date_of_birth": dob,
            "image_url": image_url,
            "clerk_id": clerk_id,
            "auth_provider": "clerk",
            "subscription_plan": str(plan) if plan else "basic",
        }
        # keep only existing columns
        insert_values = {k: v for k, v in insert_values.items() if k in existing_cols}
        logger.info("clerk.webhook.user.insert.values %s",
            json.dumps({k: str(v) for k, v in insert_values.items()}))
        await database.execute(users.insert().values(**insert_values))
        logger.info("clerk.webhook.user.created", extra={"email": email, "plan": insert_values.get("subscription_plan")})


async def _sync_subscription_to_user(sub: Dict[str, Any]) -> None:
    """
    Mirror Clerk Billing subscription events to users.subscription_plan.
    Shapes differ by billing provider; extract defensively.
    """
    clerk_user_id = sub.get("user_id") or sub.get("user") or sub.get("owner_id")
    if not clerk_user_id:
        logger.info("clerk.webhook.subscription.skip_no_user")
        return

    # Try several common locations for a product/plan identifier
    plan = (
        sub.get("plan") or
        (sub.get("price") or {}).get("product") or
        (sub.get("items") or [{}])[0].get("price", {}).get("product") or
        (sub.get("product") or {}).get("name") or
        (sub.get("data") or {}).get("plan")  # some test payloads
    )
    status = sub.get("status")

    row = await database.fetch_one(users.select().where(users.c.clerk_id == clerk_user_id))
    if not row:
        logger.info("clerk.webhook.subscription.no_user_yet", extra={"clerk_id": clerk_user_id})
        return

    vals = {}
    if plan and "subscription_plan" in set(users.c.keys()):
        vals["subscription_plan"] = str(plan)

    if not vals:
        logger.info("clerk.webhook.subscription.noop", extra={"user_id": str(row["id"]), "status": status})
        return

    logger.info("clerk.webhook.subscription.update.values", extra={"user_id": str(row["id"]), "vals": vals, "status": status})
    await database.execute(users.update().where(users.c.id == row["id"]).values(**vals))
    chk = await database.fetch_one(users.select().where(users.c.id == row["id"]))
    logger.info("clerk.webhook.subscription.updated", extra={"user_id": str(row["id"]), "plan": chk["subscription_plan"], "status": status})


@router.post("/webhooks/clerk")
async def clerk_webhook(request: Request):
    raw = await request.body()
    _verify_clerk_signature(request.headers, raw)

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        logger.exception("clerk.webhook.bad_payload.json_decode")
        raise HTTPException(status_code=400, detail="Bad payload")

    etype = payload.get("type")
    data: Dict[str, Any] = payload.get("data") or {}
    logger.info("clerk.webhook.received", extra={"type": etype})

    if etype in ("user.created", "user.updated"):
        await _upsert_user_from_clerk_user(data)
        return {"ok": True}

    if etype in (
        "subscription.created", "subscription.updated", "subscription.deleted",
        "subscription.paused", "subscription.resumed", "subscription.canceled", "subscription.active"
    ):
        await _sync_subscription_to_user(data)
        return {"ok": True}

    logger.info("clerk.webhook.ignored", extra={"type": etype})
    return {"ok": True}
