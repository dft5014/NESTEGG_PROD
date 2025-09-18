# backend/clients/api_clients/polygon_client.py
import os
import json
import logging
from typing import Dict, Iterable, List, Optional, Set, Any, Tuple
from datetime import datetime, timezone

import httpx

logger = logging.getLogger("polygon_client")

POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")
if not POLYGON_API_KEY:
    logger.warning("polygon.missing_api_key_env")

BASE = "https://api.polygon.io"
SNAPSHOT_V2 = f"{BASE}/v2/snapshot/locale/us/markets/stocks/tickers"
REF_TICKERS_V3 = f"{BASE}/v3/reference/tickers"

# Keep HTTP/1.1 to avoid httpx[http2]/h2 dependency in your current stack
HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=45.0, write=5.0, pool=5.0)
HTTP_HEADERS = {
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
    "User-Agent": "NestEgg-PolygonClient/1.3",
}


class PolygonClient:
    """
    Lightweight async client for Polygon REST.

    Public methods (match main.py usage):
      - get_snapshots_for(tickers: Iterable[str]) -> Dict[str, Dict[str, Any]]
      - debug_snapshots_for(tickers: Iterable[str]) -> (parsed_map, raw_map, stats)
      - list_reference_tickers(market, active_only, types, limit, max_pages) -> List[Dict[str, Any]]
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or POLYGON_API_KEY
        if not self.api_key:
            raise RuntimeError("POLYGON_API_KEY not configured")

    # -----------------------------
    # Public: Prices / Snapshots
    # -----------------------------
    async def get_snapshots_for(self, tickers: Iterable[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch the full-market snapshot once, filter to requested tickers (case-insensitive),
        and return {ticker: {"price": float, "timestamp": datetime_utc}}.

        Price priority:
          1) lastTrade.p
          2) min.c (latest 1-minute bar close)
          3) day.c (day bar close-so-far)
          4) prevDay.c (last resort)

        Timestamp priority:
          1) lastTrade.t (ns -> ms)
          2) min.t (ms)
          3) updated (ns -> ms)
          4) NOW() UTC (final fallback so we don't drop otherwise-valid prices)
        """
        want: Set[str] = {str(t).strip().upper() for t in tickers if t}
        if not want:
            return {}

        # alias mapping so BRK-B <-> BRK.B etc.
        alias_map: Dict[str, str] = {}
        for db_sym in want:
            for alt in _aliases_for(db_sym):
                alias_map[alt] = db_sym
        want_all: Set[str] = set(alias_map.keys())
        logger.info(f"[PolygonClient] alias_map size={len(alias_map)} (for {len(want)} originals)")

        payload = await self._get_full_market_snapshot()
        rows = payload.get("tickers") or []
        if not isinstance(rows, list):
            logger.warning("polygon.snapshot.unexpected_shape")
            return {}

        out: Dict[str, Dict[str, Any]] = {}
        seen = updated = 0
        skipped_price = []
        skipped_ts = []

        for item in rows:
            sym = str(item.get("ticker") or "").upper()
            if sym not in want_all:
                continue
            db_key = alias_map.get(sym, sym)
            seen += 1

            last_trade = item.get("lastTrade") or {}
            min_bar    = item.get("min") or {}
            day_bar    = item.get("day") or {}
            prev_day   = item.get("prevDay") or {}

            price: Optional[float] = None
            ts_ms: Optional[int] = None

            # 1) lastTrade.p (+ t ns)
            lt_price = _safe_float(last_trade.get("p"))
            lt_t     = _safe_int(last_trade.get("t"))  # ns
            if lt_price is not None:
                price = lt_price
                if lt_t and lt_t > 1_000_000_000_000:
                    ts_ms = int(lt_t // 1_000_000)

            # 2) min.c (+ t ms)
            if price is None:
                m_close = _safe_float(min_bar.get("c"))
                m_t     = _safe_int(min_bar.get("t"))  # ms
                if m_close is not None:
                    price = m_close
                    if m_t and m_t > 0:
                        ts_ms = m_t

            # 3) day.c
            if price is None:
                d_close = _safe_float(day_bar.get("c"))
                if d_close is not None:
                    price = d_close

            # 4) prevDay.c
            if price is None:
                pd_close = _safe_float(prev_day.get("c"))
                if pd_close is not None:
                    price = pd_close

            # timestamps
            if ts_ms is None:
                updated_ns = _safe_int(item.get("updated"))  # ns
                if updated_ns and updated_ns > 1_000_000_000_000:
                    ts_ms = int(updated_ns // 1_000_000)

            if ts_ms is None and price is not None:
                ts_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)

            if price is None:
                skipped_price.append(db_key)
                continue
            if ts_ms is None:
                skipped_ts.append(db_key)
                continue

            ts_dt = datetime.fromtimestamp(int(ts_ms) / 1000.0, tz=timezone.utc)
            out[db_key] = {"price": float(price), "timestamp": ts_dt}
            updated += 1

        logger.info(
            f"[PolygonClient] requested={len(want)} seen_in_snapshot={seen} "
            f"updated={updated} skipped_price={len(skipped_price)} skipped_ts={len(skipped_ts)}"
        )
        if skipped_price:
            logger.info(f"[PolygonClient] skipped_price sample: {skipped_price[:20]}")
        if skipped_ts:
            logger.info(f"[PolygonClient] skipped_ts sample: {skipped_ts[:20]}")

        return out

    async def debug_snapshots_for(
        self,
        tickers: Iterable[str],
    ) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]], Dict[str, Any]]:
        """
        Returns (parsed_map, raw_map, stats)
          - parsed_map: {ticker -> {"price": float, "timestamp": datetime}}
          - raw_map:    {ticker -> full raw snapshot row from Polygon}
          - stats:      {"requested": int, "seen": int, "updated": int, "skipped_price": int, "skipped_ts": int}
        """
        want: Set[str] = {str(t).strip().upper() for t in tickers if t}
        if not want:
            return {}, {}, {"requested": 0, "seen": 0, "updated": 0, "skipped_price": 0, "skipped_ts": 0}

        # alias mapping so BRK-B <-> BRK.B etc.
        alias_map: Dict[str, str] = {}
        for db_sym in want:
            for alt in _aliases_for(db_sym):
                alias_map[alt] = db_sym
        want_all = set(alias_map.keys())
        logger.info(f"[PolygonClient.debug] alias_map size={len(alias_map)} (for {len(want)} originals)")

        payload = await self._get_full_market_snapshot()
        rows = payload.get("tickers") or []
        if not isinstance(rows, list):
            return {}, {}, {"requested": len(want), "seen": 0, "updated": 0, "skipped_price": 0, "skipped_ts": 0}

        parsed: Dict[str, Dict[str, Any]] = {}
        raw: Dict[str, Dict[str, Any]] = {}
        seen = updated = 0
        skipped_price = []
        skipped_ts = []

        for item in rows:
            sym = str(item.get("ticker") or "").upper()
            if sym not in want_all:
                continue
            db_key = alias_map.get(sym, sym)
            raw[db_key] = item
            seen += 1

            last_trade = item.get("lastTrade") or {}
            min_bar    = item.get("min") or {}
            day_bar    = item.get("day") or {}
            prev_day   = item.get("prevDay") or {}

            price: Optional[float] = None
            ts_ms: Optional[int] = None

            # parse with same rules
            lt_price = _safe_float(last_trade.get("p"))
            lt_t     = _safe_int(last_trade.get("t"))  # ns
            if lt_price is not None:
                price = lt_price
                if lt_t and lt_t > 1_000_000_000_000:
                    ts_ms = int(lt_t // 1_000_000)

            if price is None:
                m_close = _safe_float(min_bar.get("c"))
                m_t     = _safe_int(min_bar.get("t"))
                if m_close is not None:
                    price = m_close
                    if m_t and m_t > 0:
                        ts_ms = m_t

            if price is None:
                d_close = _safe_float(day_bar.get("c"))
                if d_close is not None:
                    price = d_close

            if price is None:
                pd_close = _safe_float(prev_day.get("c"))
                if pd_close is not None:
                    price = pd_close

            if ts_ms is None:
                updated_ns = _safe_int(item.get("updated"))
                if updated_ns and updated_ns > 1_000_000_000_000:
                    ts_ms = int(updated_ns // 1_000_000)

            if ts_ms is None and price is not None:
                ts_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)

            if price is None:
                skipped_price.append(db_key)
                continue
            if ts_ms is None:
                skipped_ts.append(db_key)
                continue

            ts_dt = datetime.fromtimestamp(int(ts_ms) / 1000.0, tz=timezone.utc)
            parsed[db_key] = {"price": float(price), "timestamp": ts_dt}
            updated += 1

        stats = {
            "requested": len(want),
            "seen": seen,
            "updated": updated,
            "skipped_price": len(skipped_price),
            "skipped_ts": len(skipped_ts),
        }

        # Compact sample log
        try:
            sample_keys = list(parsed.keys())[:10] or list(raw.keys())[:10]
            sample_dump = {
                "stats": stats,
                "sample": {k: {
                    "parsed": parsed.get(k, {}),
                    "raw_min_c": (((raw.get(k) or {}).get("min") or {}).get("c")),
                    "raw_day_c": (((raw.get(k) or {}).get("day") or {}).get("c")),
                    "raw_prev_c": (((raw.get(k) or {}).get("prevDay") or {}).get("c")),
                    "raw_lastTrade_p": (((raw.get(k) or {}).get("lastTrade") or {}).get("p")),
                } for k in sample_keys}
            }
            logger.info("[PolygonClient.debug] " + json.dumps(sample_dump, default=_dt_iso)[:8000])
        except Exception:
            pass

        return parsed, raw, stats

    # -----------------------------
    # Public: Reference universe
    # -----------------------------
    async def list_reference_tickers(
        self,
        market: str = "stocks",
        active_only: bool = True,
        types: Optional[List[str]] = None,
        limit: int = 1000,
        max_pages: int = 3,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {
            "market": market,
            "active": "true" if active_only else "false",
            "limit": limit,
            "apiKey": self.api_key,
        }
        if types:
            params["type"] = ",".join([t.strip().upper() for t in types if t])

        rows: List[Dict[str, Any]] = []
        url = REF_TICKERS_V3
        pages = 0

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=HTTP_HEADERS) as client:
            while url and pages < max_pages:
                resp = await _get_with_retry(client, url, params=params)
                params = None  # next_url has query
                try:
                    payload = resp.json()
                except Exception as e:
                    logger.error(f"polygon.reference.json_error: {e}")
                    break

                results = payload.get("results") or []
                if not isinstance(results, list):
                    break
                rows.extend(results)

                url = payload.get("next_url")
                pages += 1

        return rows

    # -----------------------------
    # Internals
    # -----------------------------
    async def _get_full_market_snapshot(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=HTTP_HEADERS) as client:
            resp = await _get_with_retry(client, SNAPSHOT_V2, params={"apiKey": self.api_key})
            try:
                payload = resp.json()
            except Exception as e:
                logger.error(f"polygon.snapshot.json_error: {e}")
                return {}
            return payload if isinstance(payload, dict) else {}


# --------------- helpers -----------------

async def _get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    params: Optional[Dict[str, Any]] = None,
    retries: int = 3,
) -> httpx.Response:
    last_exc: Optional[Exception] = None
    for attempt in range(retries):
        try:
            r = await client.get(url, params=params)
            r.raise_for_status()
            return r
        except Exception as e:
            last_exc = e
            sleep = 1.5 ** attempt
            logger.warning(f"polygon.http_retry attempt={attempt+1} sleep={sleep:.2f}s url={url} err={e}")
            await _async_sleep(sleep)
    assert last_exc is not None
    raise last_exc


def _safe_float(x: Any) -> Optional[float]:
    try:
        if x is None:
            return None
        return float(x)
    except Exception:
        return None


def _safe_int(x: Any) -> Optional[int]:
    try:
        if x is None:
            return None
        return int(x)
    except Exception:
        return None


def _dt_iso(x: Any) -> Any:
    if isinstance(x, datetime):
        return x.isoformat()
    return x


def _aliases_for(sym: str) -> List[str]:
    """
    Generate alternate ticker forms to bridge dataset punctuation differences.
    - Class shares: 'BRK-B' <-> 'BRK.B' (only when right side is 1–3 A–Z letters)
    - Slash/dot/hyphen interop for rare forms: ABC/W <-> ABC.W <-> ABC-W
    - Preserve known suffixes we don't morph: WS (warrants), W, U (units), RT (rights)
    We always include the original symbol as an alias of itself.
    """
    s = sym.strip().upper()
    out = {s}

    PROTECTED = {"WS", "W", "U", "RT"}  # suffixes we avoid morphing
    def _is_class_suffix(x: str) -> bool:
        return 1 <= len(x) <= 3 and x.isalpha() and x not in PROTECTED

    # Hyphen ↔ dot for share classes
    if "-" in s:
        left, right = s.rsplit("-", 1)
        if _is_class_suffix(right):
            out.add(f"{left}.{right}")
    if "." in s:
        left, right = s.rsplit(".", 1)
        if _is_class_suffix(right):
            out.add(f"{left}-{right}")

    # Slash variants (rare)
    if "/" in s:
        left, right = s.rsplit("/", 1)
        if right and right not in PROTECTED:
            out.add(f"{left}.{right}")
            out.add(f"{left}-{right}")

    return list(out)


async def _async_sleep(seconds: float) -> None:
    import asyncio
    await asyncio.sleep(seconds)
