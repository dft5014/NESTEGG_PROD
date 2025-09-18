# backend/clients/api_clients/polygon_client.py
import os
import math
import time
import logging
from typing import Dict, Iterable, List, Optional, Set, Tuple, Any

import httpx

logger = logging.getLogger("polygon_client")

POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")
if not POLYGON_API_KEY:
    logger.warning("polygon.missing_api_key_env")

BASE = "https://api.polygon.io"
SNAPSHOT_V2 = f"{BASE}/v2/snapshot/locale/us/markets/stocks/tickers"
REF_TICKERS_V3 = f"{BASE}/v3/reference/tickers"

# Reasonable HTTP timeouts for batch jobs
HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=45.0, write=5.0, pool=5.0)
HTTP_HEADERS = {
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
    "User-Agent": "NestEgg-PolygonClient/1.0",
}


class PolygonClient:
    """
    Lightweight async client for Polygon REST.
    - Full-market snapshot (v2) -> filter in-memory to our tickers.
    - Reference tickers (v3) -> paginated list for universe reconciliation.
    - Returns simple, DB-ready shapes (price + timestamp_ms).

    Public methods used by existing code:
      - get_snapshots_for(tickers: Iterable[str]) -> Dict[str, Dict[str, Any]]
      - list_reference_tickers(market: str, active_only: bool, types: Optional[List[str]],
                               limit: int, max_pages: int) -> List[Dict[str, Any]]
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or POLYGON_API_KEY
        if not self.api_key:
            raise RuntimeError("POLYGON_API_KEY not configured")
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=HTTP_HEADERS, http2=True)
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self._client:
            await self._client.aclose()
            self._client = None

    # -----------------------------
    # Public: Prices / Snapshots
    # -----------------------------
    async def get_snapshots_for(self, tickers: Iterable[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch the full-market snapshot once, filter to the requested tickers (case-insensitive),
        and return a mapping suitable for DB upserts:

        {
          "AAPL": {"price": 227.41, "timestamp": 1758215880000},
          "MSFT": {"price": 432.05, "timestamp": 1758215880000},
          ...
        }

        Price selection heuristic:
          1) Use minute bar close `min.c` when present.
          2) Fallback to day close `day.c`.
          3) If neither exists, skip (no update).
        Timestamp (ms since epoch):
          - Prefer `min.t` (ms).
          - Else fallback to `updated` (ns -> ms).
        """
        want: Set[str] = {t.upper() for t in tickers if t}
        if not want:
            return {}

        data = await self._get_full_market_snapshot()
        rows = data.get("tickers") or []
        if not isinstance(rows, list):
            logger.warning("polygon.snapshot.unexpected_shape")
            return {}

        out: Dict[str, Dict[str, Any]] = {}
        for item in rows:
            sym = str(item.get("ticker") or "").upper()
            if sym not in want:
                continue

            # extract price candidates
            min_bar = item.get("min") or {}
            day_bar = item.get("day") or {}
            price = _safe_float(min_bar.get("c"))
            ts_ms = _safe_int(min_bar.get("t"))  # ms if present

            if price is None:
                price = _safe_float(day_bar.get("c"))

            # timestamp fallback: updated (ns) -> ms
            if ts_ms is None:
                updated_ns = _safe_int(item.get("updated"))
                if updated_ns is not None and updated_ns > 1e12:
                    ts_ms = int(updated_ns // 1_000_000)

            if price is None or ts_ms is None:
                # If we can't form a sensible reading, skip this symbol
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

        Args:
          - market: "stocks" (Polygon expects values like 'stocks', 'crypto', etc.)
          - active_only: True -> active=true; False -> both
          - types: e.g., ["CS","ETF","ADR"]
          - limit: page size (Polygon allows <= 1000)
          - max_pages: defensive cap to avoid runaway loops

        Returns:
          List of raw rows from Polygon (each contains 'ticker', 'name', 'active', 'type', etc.)
        """
        params = {
            "market": market,
            "active": "true" if active_only else "false",
            "limit": limit,
            "apiKey": self.api_key,
        }
        if types:
            # Polygon expects comma-separated list
            params["type"] = ",".join(types)

        rows: List[Dict[str, Any]] = []
        url = REF_TICKERS_V3
        pages = 0

        async with self._ensure_client() as client:
            while url and pages < max_pages:
                resp = await self._get_with_retry(client, url, params=params)
                payload = resp.json()
                results = payload.get("results") or []
                if not isinstance(results, list):
                    break
                rows.extend(results)
                url = payload.get("next_url")
                params = None  # subsequent calls follow next_url which already includes query
                pages += 1

        return rows

    # -----------------------------
    # Internals
    # -----------------------------
    async def _get_full_market_snapshot(self) -> Dict[str, Any]:
        """
        One-shot fetch of the entire equities snapshot (v2). Large but fast on Polygon.
        """
        async with self._ensure_client() as client:
            resp = await self._get_with_retry(client, SNAPSHOT_V2, params={"apiKey": self.api_key})
            try:
                payload = resp.json()
            except Exception as e:
                logger.error(f"polygon.snapshot.json_error: {e}")
                raise
            return payload if isinstance(payload, dict) else {}

    async def _ensure_client(self) -> httpx.AsyncClient:
        """
        Ensure we have a live AsyncClient. Context-managing this returns self._client.
        """
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers=HTTP_HEADERS, http2=True)
        return self._client

    async def _get_with_retry(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        retries: int = 3,
    ) -> httpx.Response:
        """
        Simple retry with exponential backoff. Raises on non-2xx.
        Note: Polygon often returns 200 with a JSON 'status' field.
              Transport errors and 4xx/5xx are handled here.
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
        # give up
        assert last_exc is not None
        raise last_exc


# --------------- helpers -----------------

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
        # handle numeric strings as well
        return int(x)
    except Exception:
        return None


async def _async_sleep(seconds: float) -> None:
    # tiny awaitable sleep without importing trio/asyncio directly here
    import asyncio
    await asyncio.sleep(seconds)
