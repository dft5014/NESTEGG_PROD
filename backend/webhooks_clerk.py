# backend/webhooks_clerk.py
import os
import logging
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from svix.webhooks import Webhook, WebhookVerificationError  # pip install svix

from backend.core_db import database, users

logger = logging.getLogger("clerk_webhooks")

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")  # from Clerk dashboard (Signing Secret)

router = APIRouter()


class ClerkEvent(BaseModel):
    data: Dict[str, Any]
    object: str
    type: str


def _verify_clerk_signature(headers: dict, body: bytes):
    """
    Clerk sends Svix headers:
      - svix-id
      - svix-timestamp
      - svix-signature
    Verify with CLERK_WEBHOOK_SECRET.
    """
    if not CLERK_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="CLERK_WEBHOOK_SECRET not configured")

    try:
        wh = Webhook(CLERK_WEBHOOK_SECRET)
        payload = wh.verify(body, {
            "svix-id": headers.get("svix-id"),
            "svix-timestamp": headers.get("svix-timestamp"),
            "svix-signature": headers.get("svix-signature"),
        })
        return payload  # verified JSON string
    except WebhookVerificationError as e:
        logger.warning("clerk.webhook.verify_failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid signature")


async def _upsert_user_from_clerk_user(data: Dict[str, Any]):
    """
    Map Clerk user payload → your `users` table.
    """
    clerk_id = data.get("id")
    # Primary email
    email = None
    try:
        primary_id = data.get("primary_email_address_id")
        for e in data.get("email_addresses") or []:
            if (primary_id and e.get("id") == primary_id) or (not primary_id and e.get("email_address")):
                email = (e.get("email_address") or "").strip().lower()
                break
    except Exception:
        pass
    # Names & avatar
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    image_url = data.get("image_url")

    # Plan (if you store plan on user unsafe/public metadata)
    plan = None
    pm = data.get("public_metadata") or {}
    um = data.get("unsafe_metadata") or {}
    plan = pm.get("plan") or um.get("plan")

    # If you also want phone, occupation, etc., pull from unsafe_metadata:
    phone = um.get("phone")
    occupation = um.get("occupation")
    date_of_birth = um.get("date_of_birth")

    if not (email or clerk_id):
        logger.info("clerk.webhook.user.skip_no_keys")
        return

    # Lookup by clerk_id first, then email
    row = await database.fetch_one(
        users.select().where((users.c.clerk_id == clerk_id) | (users.c.email == (email or "")))
    )
    values = {}
    if email: values["email"] = email
    if first_name is not None: values["first_name"] = first_name
    if last_name is not None: values["last_name"] = last_name
    if image_url is not None: values["image_url"] = image_url
    if plan: values["subscription_plan"] = plan
    if phone is not None: values["phone"] = phone
    if occupation is not None: values["occupation"] = occupation
    if date_of_birth is not None: values["date_of_birth"] = date_of_birth

    if row:
        # Update
        upd = users.update().where(users.c.id == row["id"]).values(
            clerk_id=row["clerk_id"] or clerk_id,
            auth_provider="clerk",
            **values
        )
        await database.execute(upd)
        logger.info("clerk.webhook.user.updated user_id=%s email=%s plan=%s", row["id"], email, plan)
    else:
        # Insert
        ins = users.insert().values(
            # Let DB default generate id (uuid default) – your schema uses gen_random_uuid()
            email=email or "",  # email is required in your schema; ensure Clerk always provides it
            password_hash=None,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            occupation=occupation,
            date_of_birth=date_of_birth,
            image_url=image_url,
            clerk_id=clerk_id,
            auth_provider="clerk",
            subscription_plan=plan or "basic",
        )
        await database.execute(ins)
        logger.info("clerk.webhook.user.created email=%s plan=%s", email, plan)


async def _sync_subscription_to_user(data: Dict[str, Any]):
    """
    When Clerk Billing emits subscription events, mirror plan/status to users.
    Payload shape can vary by provider; we use defensive extraction.
    """
    # Best key to link: user_id (Clerk user id)
    clerk_user_id = data.get("user_id") or data.get("user") or data.get("owner_id")
    if not clerk_user_id:
        logger.info("clerk.webhook.subscription.skip_no_user")
        return

    # Pull plan and status (shape may vary by provider/integration)
    plan = (
        data.get("plan") or
        (data.get("price") or {}).get("product") or
        (data.get("items") or [{}])[0].get("price", {}).get("product")
    )
    status = data.get("status")  # e.g., active, trialing, canceled, past_due

    row = await database.fetch_one(users.select().where(users.c.clerk_id == clerk_user_id))
    if not row:
        logger.info("clerk.webhook.subscription.no_user_yet clerk_id=%s", clerk_user_id)
        return

    upd_vals = {}
    if plan: upd_vals["subscription_plan"] = str(plan)
    # Optionally store status somewhere; if you add a column users.subscription_status, set it here.

    if upd_vals:
        await database.execute(users.update().where(users.c.id == row["id"]).values(**upd_vals))
        logger.info("clerk.webhook.subscription.updated user_id=%s plan=%s status=%s", row["id"], plan, status)


@router.post("/webhooks/clerk")
async def clerk_webhook(request: Request):
    # Verify signature
    raw = await request.body()
    _verify_clerk_signature(request.headers, raw)

    # Parse event
    try:
        event = ClerkEvent.model_validate_json(raw)
    except Exception:
        logger.exception("clerk.webhook.bad_payload")
        raise HTTPException(status_code=400, detail="Bad payload")

    etype = event.type
    logger.info("clerk.webhook.received type=%s", etype)

    # Handle user lifecycle
    if etype in ("user.created", "user.updated"):
        await _upsert_user_from_clerk_user(event.data)
        return {"ok": True}

    # Handle subscription lifecycle (enable Clerk Billing or provider webhooks)
    if etype in (
        "subscription.created",
        "subscription.updated",
        "subscription.deleted",
        "subscription.paused",
        "subscription.resumed",
        "subscription.canceled",
    ):
        await _sync_subscription_to_user(event.data)
        return {"ok": True}

    # You can add more types as needed (email_address.updated, phone_number.updated, etc.)
    logger.info("clerk.webhook.ignored type=%s", etype)
    return {"ok": True}
