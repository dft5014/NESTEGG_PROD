# backend/webhooks_clerk.py
import os
import json
import logging
import ipaddress
import asyncio
from datetime import date
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, HTTPException
from starlette.responses import Response
from svix.webhooks import Webhook, WebhookVerificationError

from backend.core_db import database, users

logger = logging.getLogger("clerk_webhooks")

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")  # Clerk > Webhooks > Signing Secret
if not CLERK_WEBHOOK_SECRET:
    logger.warning("clerk.webhook.missing_secret_env")

router = APIRouter()


# ------------- helpers -------------

def _clean_ip(ip: Optional[str]) -> Optional[str]:
    if not ip:
        return None
    try:
        ipaddress.ip_address(ip)  # validates IPv4/IPv6
        return ip
    except Exception:
        return None


def _ts_to_tz(ms_or_s):
    if ms_or_s is None:
        return None
    import datetime as dt
    x = int(ms_or_s)
    if x > 10**12:  # ms
        return dt.datetime.fromtimestamp(x / 1000.0, tz=dt.timezone.utc)
    return dt.datetime.fromtimestamp(x, tz=dt.timezone.utc)


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


async def _ensure_db_connected() -> None:
    """Make sure the shared `database` pool is connected before background work."""
    if not database.is_connected:
        try:
            await database.connect()
        except Exception:
            logger.exception("clerk.webhook.db_connect_failed")


# ------------- core updaters -------------

async def _update_users_last_login_from_session(db, fields: Dict[str, Any]) -> None:
    """
    Standalone users table update.
    Tries to match by internal id first, then by clerk_id as a fallback.
    """
    update_vals = {
        "last_login_at": fields.get("last_active_at") or fields.get("started_at"),
        "last_login_ip": fields.get("ip_address"),
        "last_login_city": fields.get("city"),
        "last_login_country": fields.get("country"),
        "last_login_device": fields.get("device_type"),
        "last_login_browser": " ".join(filter(None, [fields.get("browser_name"), fields.get("browser_version")])),
        "user_id": fields.get("user_id"),
        "clerk_user_id": fields.get("clerk_user_id"),
    }

    row = await db.fetch_one("""
        UPDATE users
           SET last_login_at      = :last_login_at,
               last_login_ip      = NULLIF(:last_login_ip,'')::inet,
               last_login_city    = :last_login_city,
               last_login_country = :last_login_country,
               last_login_device  = :last_login_device,
               last_login_browser = :last_login_browser,
               login_count        = COALESCE(login_count, 0) + 1
         WHERE id = :user_id
            OR clerk_id = :clerk_user_id
         RETURNING id;
    """, update_vals)

    if not row:
        logger.warning(
            "clerk.users_update_no_match",
            extra={"user_id": str(update_vals["user_id"]), "clerk_user_id": update_vals["clerk_user_id"]}
        )


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

    logger.info(
        "clerk.webhook.user.parsed",
        extra={"clerk_id": clerk_id, "email": email, "first_name": first_name, "last_name": last_name,
               "plan": plan, "has_dob": bool(dob)}
    )

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
        logger.info(
            "clerk.webhook.user.update.values",
            extra={"user_id": str(row["id"]), "values": {k: str(v) for k, v in values.items()}}
        )
        query = users.update().where(users.c.id == row["id"]).values(**values)
        await database.execute(query)
        chk = await database.fetch_one(users.select().where(users.c.id == row["id"]))
        logger.info(
            "clerk.webhook.user.updated",
            extra={"user_id": str(row["id"]), "email": chk["email"], "plan": chk["subscription_plan"]}
        )
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
        logger.info("clerk.webhook.user.insert.values %s", json.dumps({k: str(v) for k, v in insert_values.items()}))
        await database.execute(users.insert().values(**insert_values))
        logger.info("clerk.webhook.user.created", extra={"email": email, "plan": insert_values.get("subscription_plan")})


async def _sync_subscription_to_user(data: Dict[str, Any]):
    """
    Mirror Clerk Billing subscription changes into our users table.
    """
    # 1) Resolve the Clerk user id (commerce puts it under payer.user_id)
    clerk_user_id = (
        data.get("user_id")
        or data.get("owner_id")
        or (data.get("payer") or {}).get("user_id")
    )
    if not clerk_user_id:
        logger.info("clerk.webhook.subscription.skip_no_user")
        return

    # 2) Pick the active item; if none, pick the most recently updated item
    items = data.get("items") or []
    active_item = next((i for i in items if (i.get("status") or "").lower() == "active"), None)
    if not active_item and items:
        active_item = max(items, key=lambda i: i.get("updated_at") or 0)

    plan_slug = None
    plan_name = None
    if active_item:
        plan = active_item.get("plan") or {}
        plan_slug = plan.get("slug")
        plan_name = plan.get("name")

    # Fallback: if we still don't have a slug, derive one from the name
    if not plan_slug and plan_name:
        plan_slug = plan_name.strip().lower().replace(" ", "_")

    # 3) Optionally capture overall subscription status too
    sub_status = (data.get("status") or "").lower()  # e.g., active, canceled, past_due

    # 4) Update our user row
    row = await database.fetch_one(users.select().where(users.c.clerk_id == clerk_user_id))
    if not row:
        logger.info("clerk.webhook.subscription.no_user_yet clerk_id=%s", clerk_user_id)
        return

    update_vals = {}
    if plan_slug:
        update_vals["subscription_plan"] = plan_slug  # e.g., "nestegg_pro", "basic"
    # If you later add a column like users.subscription_status, set it here.
    # if "subscription_status" in users.c.keys():
    #     update_vals["subscription_status"] = sub_status

    if update_vals:
        await database.execute(users.update().where(users.c.id == row["id"]).values(**update_vals))
        logger.info(
            "clerk.webhook.subscription.updated user_id=%s plan=%s status=%s",
            str(row["id"]), plan_slug, sub_status
        )
    else:
        logger.info(
            "clerk.webhook.subscription.noop user_id=%s (no plan to write)",
            str(row["id"])
        )


# ------------- session handlers -------------

async def _handle_session_created(db, payload):
    s = payload.get("data") or {}
    act = (s.get("latest_activity") or {})
    clerk_session_id = s.get("id")
    clerk_user_id = s.get("user_id")
    if not clerk_session_id or not clerk_user_id:
        logger.warning("clerk.session_created.missing_ids", extra={"payload_keys": list(s.keys())})
        return

    # Resolve our user_id via clerk_id
    user_row = await db.fetch_one(
        "SELECT id FROM users WHERE clerk_id = :clerk_user_id",
        {"clerk_user_id": clerk_user_id}
    )
    if not user_row:
        logger.info("clerk.session_created.no_user_match", extra={"clerk_user_id": clerk_user_id})
        return

    ip = _clean_ip(((payload.get("event_attributes") or {}).get("http_request") or {}).get("client_ip"))

    fields = {
        "clerk_session_id": clerk_session_id,
        "clerk_user_id": clerk_user_id,
        "user_id": user_row["id"],
        "status": s.get("status", "active"),
        "started_at": _ts_to_tz(s.get("created_at")),
        "last_active_at": _ts_to_tz(s.get("last_active_at")),
        "device_type": act.get("device_type"),
        "is_mobile": act.get("is_mobile"),
        "browser_name": act.get("browser_name"),
        "browser_version": act.get("browser_version"),
        "city": act.get("city"),
        "country": act.get("country"),
        "ip_address": ip,
        "user_agent": (payload.get("event_attributes") or {}).get("http_request", {}).get("user_agent"),
        "client_id": s.get("client_id"),
        "raw": json.dumps(payload),
    }

    # Upsert session
    await db.execute("""
        INSERT INTO user_sessions
        (clerk_session_id, clerk_user_id, user_id, status, started_at, last_active_at,
         device_type, is_mobile, browser_name, browser_version, city, country, ip_address,
         user_agent, client_id, raw)
        VALUES
        (:clerk_session_id, :clerk_user_id, :user_id, :status, :started_at, :last_active_at,
         :device_type, :is_mobile, :browser_name, :browser_version, :city, :country,
         NULLIF(:ip_address,'')::inet,
         :user_agent, :client_id, CAST(:raw AS JSONB))
        ON CONFLICT (clerk_session_id) DO UPDATE SET
          status         = EXCLUDED.status,
          last_active_at = EXCLUDED.last_active_at,
          device_type    = EXCLUDED.device_type,
          is_mobile      = EXCLUDED.is_mobile,
          browser_name   = EXCLUDED.browser_name,
          browser_version= EXCLUDED.browser_version,
          city           = EXCLUDED.city,
          country        = EXCLUDED.country,
          ip_address     = EXCLUDED.ip_address,
          user_agent     = EXCLUDED.user_agent,
          client_id      = EXCLUDED.client_id,
          raw            = EXCLUDED.raw,
          updated_at     = now();
    """, fields)

    # Standalone users table update
    await _update_users_last_login_from_session(db, fields)


async def _handle_session_updated(db, payload):
    s = payload.get("data") or {}
    act = (s.get("latest_activity") or {})
    s_id = s.get("id")
    if not s_id:
        logger.warning("clerk.session_updated.missing_session_id")
        return

    ip = _clean_ip(((payload.get("event_attributes") or {}).get("http_request") or {}).get("client_ip"))

    await db.execute("""
        UPDATE user_sessions
           SET status         = COALESCE(:status, status),
               last_active_at = COALESCE(:last_active_at, last_active_at),
               device_type    = COALESCE(:device_type, device_type),
               is_mobile      = COALESCE(:is_mobile, is_mobile),
               browser_name   = COALESCE(:browser_name, browser_name),
               browser_version= COALESCE(:browser_version, browser_version),
               city           = COALESCE(:city, city),
               country        = COALESCE(:country, country),
               ip_address     = COALESCE(NULLIF(:ip_address,'')::inet, ip_address),
               user_agent     = COALESCE(:user_agent, user_agent),
               raw            = CAST(:raw AS JSONB),
               updated_at     = now()
         WHERE clerk_session_id = :clerk_session_id
    """, {
        "status": s.get("status"),
        "last_active_at": _ts_to_tz(s.get("last_active_at")),
        "device_type": act.get("device_type"),
        "is_mobile": act.get("is_mobile"),
        "browser_name": act.get("browser_name"),
        "browser_version": act.get("browser_version"),
        "city": act.get("city"),
        "country": act.get("country"),
        "ip_address": ip,
        "user_agent": (payload.get("event_attributes") or {}).get("http_request", {}).get("user_agent"),
        "raw": json.dumps(payload),
        "clerk_session_id": s_id,
    })

    # Keep users table fresh on activity as well (last_active moves)
    row = await db.fetch_one(
        "SELECT user_id FROM user_sessions WHERE clerk_session_id = :sid",
        {"sid": s_id}
    )
    user_id = row["user_id"] if row else None

    fields = {
        "user_id": user_id,
        "clerk_user_id": s.get("user_id"),
        "started_at": None,
        "last_active_at": _ts_to_tz(s.get("last_active_at")),
        "device_type": act.get("device_type"),
        "browser_name": act.get("browser_name"),
        "browser_version": act.get("browser_version"),
        "city": act.get("city"),
        "country": act.get("country"),
        "ip_address": ip,
    }
    await _update_users_last_login_from_session(db, fields)


async def _handle_session_ended(db, payload):
    s = payload.get("data") or {}
    s_id = s.get("id")
    if not s_id:
        logger.warning("clerk.session_ended.missing_session_id")
        return

    await db.execute("""
        UPDATE user_sessions
           SET status     = :status,
               ended_at   = COALESCE(:ended_at, now()),
               updated_at = now()
         WHERE clerk_session_id = :clerk_session_id
    """, {
        "status": s.get("status", "ended"),
        "ended_at": _ts_to_tz(s.get("updated_at")),
        "clerk_session_id": s_id
    })


# ------------- event dispatcher -------------

async def _process_clerk_event(etype: str, data: Dict[str, Any], full_payload: Dict[str, Any], svix_id: Optional[str]):
    await _ensure_db_connected()
    try:
        if etype in ("user.created", "user.updated"):
            await _upsert_user_from_clerk_user(data); return
        if etype.startswith("subscription."):
            await _sync_subscription_to_user(data); return
        if etype in ("session.created", "session.created_web"):
            await _handle_session_created(database, full_payload); return
        if etype in ("session.updated", "session.activity", "session.activity_recorded"):
            await _handle_session_updated(database, full_payload); return
        if etype in ("session.ended", "session.removed", "session.revoked"):
            await _handle_session_ended(database, full_payload); return

        logger.info("clerk.webhook.ignored", extra={"type": etype, "svix_id": svix_id})
    except Exception:
        # Log but don't re-raise (outside request lifecycle)
        logger.exception("clerk.webhook.background_error", extra={"type": etype, "svix_id": svix_id})


# ------------- route -------------

@router.post("/webhooks/clerk")
async def clerk_webhook(request: Request):
    raw = await request.body()
    _verify_clerk_signature(request.headers, raw)

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        logger.exception("clerk.webhook.bad_payload.json_decode",
                         extra={"svix_id": request.headers.get("svix-id")})
        raise HTTPException(status_code=400, detail="Bad payload")

    etype = (payload.get("type") or "").strip()
    data: Dict[str, Any] = payload.get("data") or {}
    svix_id = request.headers.get("svix-id")

    logger.info("clerk.webhook.received", extra={"type": etype, "svix_id": svix_id})

    # Schedule async processing and ACK immediately so Clerk marks success
    asyncio.create_task(_process_clerk_event(etype, data, payload, svix_id))
    return Response(status_code=204)
