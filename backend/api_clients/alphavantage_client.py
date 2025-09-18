# backend/api_clients/alphavantage_client.py
import os
import csv
import io
import asyncio
import logging
from datetime import datetime, timezone, date
from typing import Dict, List, Tuple, Optional

import httpx

logger = logging.getLogger("alphavantage_client")

ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query"

# ---- Helpers ----------------------------------------------------------------

def _parse_iso_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    s2 = s.strip().lower()
    if s2 in ("null", "none", "n/a", ""):
        return None
    try:
        return date.fromisoformat(s.strip())
    except Exception:
        return None

def _to_float(x) -> Optional[float]:
    if x is None:
        return None
    try:
        if isinstance(x, str):
            x = x.replace(",", "")
        return float(x)
    except Exception:
        return None

def _to_int(x) -> Optional[int]:
    if x is None:
        return None
    try:
        if isinstance(x, str):
            x = x.replace(",", "")
        return int(float(x))
    except Exception:
        return None

def _parse_ts_or_date_to_aware_utc(x):
    if not x:
        return None
    if isinstance(x, datetime):
        return x if x.tzinfo else x.replace(tzinfo=timezone.utc)
    if isinstance(x, date):
        return datetime(x.year, x.month, x.day, tzinfo=timezone.utc)
    s = str(x).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(s, fmt)
            if fmt == "%Y-%m-%d":
                return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None
# ---- Rate Limiter ------------------------------------------------------------

class AlphaVantageRateLimiter:
    """
    Leaky-bucket limiter targeting ~75 req/min (default Pro plan).
    Uses a global interval + a small concurrency semaphore to spread load.
    """
    def __init__(self, rpm: int = 75, concurrent: int = 10):
        self.min_interval = 60.0 / float(rpm if rpm > 0 else 75)
        self._lock = asyncio.Lock()
        self._last_call_at = 0.0
        self._sema = asyncio.Semaphore(concurrent)

    async def throttle(self):
        async with self._sema:
            async with self._lock:
                now = asyncio.get_event_loop().time()
                wait = max(0.0, self._last_call_at + self.min_interval - now)
                if wait > 0:
                    await asyncio.sleep(wait)
                self._last_call_at = asyncio.get_event_loop().time()

# ---- Client ------------------------------------------------------------------

class AlphaVantageClient:
    def __init__(self, api_key: Optional[str] = None, timeout: float = 30.0, rpm: int = 75, concurrent: int = 10):
        self.api_key = api_key or ALPHA_VANTAGE_API_KEY
        if not self.api_key:
            raise RuntimeError("ALPHA_VANTAGE_API_KEY not configured")
        self.timeout = timeout
        self.rate = AlphaVantageRateLimiter(rpm=rpm, concurrent=concurrent)
        self._client = httpx.AsyncClient(timeout=self.timeout)

    async def _get(self, params: Dict[str, str]) -> httpx.Response:
        await self.rate.throttle()
        r = await self._client.get(ALPHA_VANTAGE_BASE, params={**params, "apikey": self.api_key})
        r.raise_for_status()
        return r

    # ---------- 1) Universe sync ---------------------------------------------

    async def fetch_listing_status(self, state: str = "active") -> List[Dict[str, str]]:
        """
        Returns a list of dict rows from LISTING_STATUS CSV with keys:
        symbol,name,exchange,assetType,ipoDate,delistingDate,status
        """
        params = {"function": "LISTING_STATUS", "state": state}
        resp = await self._get(params)
        logger.info(f"[AV] LISTING_STATUS raw (first 300): {resp.text[:300]!r}")
        text = resp.text or ""

        # If AV sent JSON (rate limit / error), surface it clearly
        if text.lstrip().startswith("{"):
            try:
                j = resp.json()
                note = j.get("Note") or j.get("Information")
                err  = j.get("Error Message")
                if note or err:
                    raise RuntimeError(f"Alpha Vantage LISTING_STATUS returned JSON: {note or err}")
            except Exception:
                pass  # Not valid JSON; continue to CSV parse

        # CSV parse
        reader = csv.DictReader(io.StringIO(text))
        rows = [
            {
                "symbol": r.get("symbol"),
                "name": r.get("name"),
                "exchange": r.get("exchange"),
                "assetType": r.get("assetType"),
                "ipoDate": r.get("ipoDate"),
                "delistingDate": r.get("delistingDate"),
                "status": r.get("status"),
            }
            for r in reader
        ]

        if not rows:
            # Retry once without the state filter
            logger.warning("[AV] LISTING_STATUS(state=active) returned 0 rows; retrying without state")
            resp2 = await self._get({"function": "LISTING_STATUS"})
            text2 = resp2.text or ""
            if text2.lstrip().startswith("{"):
                try:
                    j2 = resp2.json()
                    note = j2.get("Note") or j2.get("Information")
                    err  = j2.get("Error Message")
                    raise RuntimeError(f"Alpha Vantage LISTING_STATUS retry returned JSON: {note or err}")
                except Exception:
                    pass
            reader2 = csv.DictReader(io.StringIO(text2))
            rows = [{
                "symbol": r.get("symbol"),
                "name": r.get("name"),
                "exchange": r.get("exchange"),
                "assetType": r.get("assetType"),
                "ipoDate": r.get("ipoDate"),
                "delistingDate": r.get("delistingDate"),
                "status": r.get("status"),
            } for r in reader2]

        logger.info(f"[AV] LISTING_STATUS rows parsed: {len(rows)}")
        return rows

    async def sync_universe_into_db(self, database, batch_insert_size: int = 1000) -> Dict[str, int]:
        """
        - Pull active US listings from Alpha Vantage
        - Compare against existing securities.ticker
        - Batch upsert *new* tickers with av_* metadata (parallel to current model)
        """
        # 1) Existing tickers
        existing_rows = await database.fetch_all("SELECT ticker FROM securities")
        existing = { (r["ticker"] or "").strip().upper() for r in existing_rows if r["ticker"] }

        # 2) Fetch AV active universe
        active_rows = await self.fetch_listing_status("active")

        # 3) Compute new symbols
        new_records: List[Dict[str, str]] = []
        for r in active_rows:
            sym = (r.get("symbol") or "").strip().upper()
            if not sym or sym in existing:
                continue
            new_records.append(r)

        logger.info(f"[AV] New active symbols to insert: {len(new_records)}")

        if not new_records:
            return {"inserted": 0, "seen_active": len(active_rows)}

        # 4) Prepare rows for batch upsert
        now = datetime.now(timezone.utc)
        to_insert = []
        for r in new_records:
            to_insert.append({
                "ticker": (r.get("symbol") or "").strip().upper(),
                "av_date_added": now,
                "av_exchange": (r.get("exchange") or None),
                "av_asset_type": (r.get("assetType") or None),
                "av_ipo_date": _parse_iso_date(r.get("ipoDate")),
                "av_name": (r.get("name") or None),
            })

        # 5) Batch upsert
        inserted = 0
        sql = """
            INSERT INTO securities (ticker, active,
                                    av_added_security, av_date_added,
                                    av_exchange, av_asset_type, av_ipo_date, av_name)
            VALUES (:ticker, TRUE,
                    TRUE, :av_date_added,
                    :av_exchange, :av_asset_type, :av_ipo_date, :av_name)
            ON CONFLICT (ticker) DO UPDATE
            SET
                av_added_security = COALESCE(securities.av_added_security, TRUE),
                av_date_added     = COALESCE(securities.av_date_added, EXCLUDED.av_date_added),
                av_exchange       = COALESCE(securities.av_exchange, EXCLUDED.av_exchange),
                av_asset_type     = COALESCE(securities.av_asset_type, EXCLUDED.av_asset_type),
                av_ipo_date       = COALESCE(securities.av_ipo_date, EXCLUDED.av_ipo_date),
                av_name           = COALESCE(securities.av_name, EXCLUDED.av_name)
        """
        B = max(100, batch_insert_size)
        for i in range(0, len(to_insert), B):
            chunk = to_insert[i:i+B]
            try:
                await database.execute_many(sql, chunk)
                inserted += len(chunk)
            except Exception as e:
                logger.error(f"[AV] Batch upsert failed for rows {i}-{i+len(chunk)-1}: {e}")

        return {"inserted": inserted, "seen_active": len(active_rows)}

    # ---------- 2) Bulk realtime quotes --------------------------------------

    @staticmethod
    def _chunk(lst: List[str], size: int = 100) -> List[List[str]]:
        return [lst[i:i+size] for i in range(0, len(lst), size)]

    async def _bulk_quotes_batch(self, batch: List[str]) -> Dict[str, Dict]:
        params = {
            "function": "REALTIME_BULK_QUOTES",
            "symbol": ",".join(batch),
            "datatype": "json",
        }
        out: Dict[str, Dict] = {}
        try:
            resp = await self._get(params)
            data = resp.json()
        except Exception as e:
            logger.error(f"[AV] bulk quotes request failed for batch ({len(batch)}): {e}")
            return out

        payload = (
            data.get("Realtime Bulk Quotes")
            or data.get("Stock Quotes")
            or data.get("results")
            or []
        )
        if not isinstance(payload, list):
            logger.warning(f"[AV] Unexpected bulk payload: type={type(payload)} keys={list(data.keys())[:5]}")
            return out

        for item in payload:
            sym = (item.get("symbol") or item.get("01. symbol") or "").strip().upper()
            if not sym:
                continue
            price = item.get("price") or item.get("05. price") or item.get("current_price")
            prev_close = item.get("previous_close") or item.get("08. previous close")
            volume = item.get("volume") or item.get("06. volume")
            ts_raw = item.get("timestamp") or item.get("07. latest trading day")

            out[sym] = {
                "price": _to_float(price),
                "previous_close": _to_float(prev_close),
                "volume": _to_int(volume),
                "price_timestamp": _parse_ts_or_date_to_aware_utc(ts_raw),
            }
        return out

    async def bulk_quotes(
        self,
        symbols: List[str],
        quote_batch_size: int = 100,
        max_concurrent_batches: int = 5,
    ) -> Dict[str, Dict]:
        """
        Call REALTIME_BULK_QUOTES in 100-symbol chunks, with limited concurrency.
        Respects the global rate limiter in _get().
        Returns {symbol: {price, previous_close, volume, price_timestamp}}
        """
        clean_syms = [s.strip().upper() for s in symbols if s]
        batches = self._chunk(clean_syms, max(1, min(100, quote_batch_size)))
        results: Dict[str, Dict] = {}

        # Process in small waves to avoid huge gather() sets
        sem = asyncio.Semaphore(max(1, max_concurrent_batches))

        async def _run_batch(b):
            async with sem:
                return await self._bulk_quotes_batch(b)

        for i in range(0, len(batches), max_concurrent_batches):
            wave = batches[i:i+max_concurrent_batches]
            outs = await asyncio.gather(*[_run_batch(b) for b in wave], return_exceptions=True)
            for out in outs:
                if isinstance(out, dict):
                    results.update(out)
                else:
                    logger.error(f"[AV] bulk quotes wave error: {out}")

        return results

    async def update_prices_for_active(self, database, limit_symbols: int = 1000,
                                       quote_batch_size: int = 100, max_concurrent_batches: int = 5) -> Tuple[int, int]:
        """
        - Select symbols to update (oldest first) from your security_usage view (or securities)
        - Fetch quotes in 100-sized batches (concurrent waves)
        - Write back ONLY to av_* fields so we don't disrupt Yahoo/Polygon
        Returns (updated_count, attempted_count)
        """
        rows = await database.fetch_all(
            """
            SELECT ticker
            FROM security_usage
            WHERE status = 'Active'
              AND (on_alphavantage IS DISTINCT FROM FALSE)
            ORDER BY last_updated ASC
            LIMIT :lim
            """,
            {"lim": limit_symbols},
        )
        symbols = [r["ticker"] for r in rows if r["ticker"]]
        if not symbols:
            return (0, 0)

        data = await self.bulk_quotes(symbols, quote_batch_size=quote_batch_size, max_concurrent_batches=max_concurrent_batches)

        updated = 0
        now = datetime.utcnow()

        # Use execute_many for the common success path to reduce round trips
        update_rows = []
        disable_rows = []

        for sym in symbols:
            q = data.get(sym)
            if not q:
                disable_rows.append({"ticker": sym, "now": now})
                continue
            update_rows.append({
                "ticker": sym,
                "price": q.get("price"),
                "ts": q.get("price_timestamp"),
                "now": now,
            })

        if update_rows:
            try:
                await database.execute_many(
                    """
                    UPDATE securities
                       SET av_price            = :price,
                           av_price_timestamp  = :ts,
                           on_alphavantage     = TRUE,
                           last_updated        = :now::timestamp
                     WHERE ticker = :ticker
                    """,
                    update_rows,
                )
                updated = len(update_rows)
            except Exception as e:
                logger.error(f"[AV] Batch update failed; falling back to per-row. err={e}")
                # Per-row fallback
                updated = 0
                for row in update_rows:
                    try:
                        await database.execute(
                            """
                            UPDATE securities
                               SET av_price            = :price,
                                   av_price_timestamp  = :ts,
                                   on_alphavantage     = TRUE,
                                   last_updated        = :now::timestamp
                             WHERE ticker = :ticker
                            """,
                            row,
                        )
                        updated += 1
                    except Exception as e2:
                        logger.error(f"[AV] Update failed for {row['ticker']}: {e2}")

        if disable_rows:
            try:
                await database.execute_many(
                    """
                    UPDATE securities
                       SET on_alphavantage = FALSE,
                           last_updated    = :now::timestamp
                     WHERE ticker = :ticker
                    """,
                    disable_rows,
                )
            except Exception as e:
                logger.error(f"[AV] Batch disable failed; falling back. err={e}")
                for row in disable_rows:
                    try:
                        await database.execute(
                            "UPDATE securities SET on_alphavantage = FALSE, last_updated = :now::timestamp WHERE ticker = :ticker",
                            row,
                        )
                    except Exception as e2:
                        logger.error(f"[AV] Fallback disable failed for {row['ticker']}: {e2}")

        return (updated, len(symbols))

    # ---------- 3) Placeholder for Overview ----------------------------------

    async def get_company_overview(self, symbol: str) -> Dict:
        params = {"function": "OVERVIEW", "symbol": symbol}
        resp = await self._get(params)
        return resp.json()

    async def aclose(self):
        await self._client.aclose()
