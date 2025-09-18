# backend/clients/api_clients/polygon_client.py
import os
import logging
from typing import Dict, Iterable, List, Optional, Set, Any

import httpx

logger = logging.getLogger("polygon_client")

POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")
if not POLYGON_API_KEY:
    logger.warning("polygon.missing_api_key_env")

BASE = "https://api.polygon.io"
SNAPSHOT_V2 = f"{BASE}/v2/snapshot/locale/us/markets/stocks/tickers"
REF_TICKERS_V3 = f"{BASE}/v3/reference/tickers"

HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=45.0, write=5.0, pool=5.0)
HTTP_HEADERS = {
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
    "User-Agent": "NestEgg-PolygonClient/1.1",
}


class PolygonClient:
    """
    Lightweight async client for Polygon REST.

    Public methods (match your main.py usage):
      - get_snapshots_for(tickers: Iterable[str]) -> Dict[str, Dict[str, Any]]
      - list_reference_tickers(market: str, active_only: bool, types: Optional[List[str]],
                               limit: int, max_pages: int) -> List[Dict[str, Any]]
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
        and return {ticker: {"price": float, "timestamp": int_ms}}.

        Price priority:
          1) lastTrade.p (if present)
          2) min.c (latest 1-minute bar close)
          3) day.c (day bar close-so-far)

        Timestamp priority (ms since epoch):
          1) lastTrade.t (ns -> ms) if we used lastTrade.p
          2) min.t (already ms) if we used min.c
          3) updated (ns -> ms) as a general fallback
        """
        want: Set[str] = {t.upper() for t in tickers if t}
        if not want:
            return {}

        payload = await self._get_full_market_snapshot()
        rows = payload.get("tickers") or []
        if not isinstance(rows, list):
            logger.warning("polygon.snapshot.unexpected_shape")
            return {}

        out: Dict[str, Dict[str, Any]] = {}
        for item in rows:
            sym = str(item.get("ticker") or "").upper()
            if sym not in want:
                continue

            last_trade = item.get("lastTrade") or {}
            min_bar = item.get("min") or {}
            day_bar = item.get("day") or {}

            price = None
            ts_ms = None

            # 1) lastTrade.p
            lt_price = _safe_float(last_trade.get("p"))
            lt_t = _safe_int(last_trade.get("t"))  # ns
            if lt_price is not None:
                price = lt_price
                if lt_t and lt_t > 1e12:
                    ts_ms = int(lt_t // 1_000_000)

            # 2) min.c (if we didn’t get a usable last trade)
            if price is None:
                m_close = _safe_float(min_bar.get("c"))
                m_t = _safe_int(min_bar.get("t"))  # ms
                if m_close is not None:
                    price = m_close
                    if m_t:
                        ts_ms = m_t

            # 3) day.c
            if price is None:
                d_close = _safe_float(day_bar.get("c"))
                if d_close is not None:
                    price = d_close

            # Fallback timestamp: 'updated' (ns -> ms)
            if ts_ms is None:
                updated_ns = _safe_int(item.get("updated"))
                if updated_ns and updated_ns > 1e12:
                    ts_ms = int(updated_ns // 1_000_000)

            if price is None or ts_ms is None:
                # Can't form a sensible reading; skip
                continue

            out[sym] = {"price": float(price), "timestamp": int(ts_ms)}

        return out

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
        """
        Page through /v3/reference/tickers to discover tickers for reconciliation.

        Returns a list of raw rows (each contains 'ticker', 'name', 'active', 'type', etc).
        """
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

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=HTTP_HEADERS, http2=True) as client:
            while url and pages < max_pages:
                resp = await _get_with_retry(client, url, params=params)
                params = None  # subsequent calls follow next_url which already has query
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
        """
        One-shot fetch of the entire equities snapshot (v2). Large but fast on Polygon.
        Manages its own AsyncClient and retries.
        """
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=HTTP_HEADERS, http2=True) as client:
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
    """
    Simple retry with exponential backoff. Raises on non-2xx.
    Note: Polygon often returns 200 with a JSON 'status' field; transport/HTTP errors handled here.
    """
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


async def _async_sleep(seconds: float) -> None:
    import asyncio
    await asyncio.sleep(seconds)
