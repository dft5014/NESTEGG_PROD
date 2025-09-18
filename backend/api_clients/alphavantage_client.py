# backend/api_clients/alphavantage_client.py
import os
import csv
import io
import math
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Tuple

import httpx

logger = logging.getLogger("alphavantage_client")

ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query"

# Docs:
# LISTING_STATUS (CSV): function=LISTING_STATUS [&state=active|delisted] [&date=YYYY-MM-DD]
#   https://www.alphavantage.co/documentation/  (Fundamental Data > Listing & Delisting Status)
# REALTIME_BULK_QUOTES: function=REALTIME_BULK_QUOTES&symbol=MSFT,AAPL,... (≤100)
#   https://www.alphavantage.co/documentation/  (Core Stock APIs > Realtime Bulk Quotes Premium)
# OVERVIEW: function=OVERVIEW&symbol=IBM (single symbol)
#   https://www.alphavantage.co/documentation/  (Fundamental Data > Company Overview)

class AlphaVantageRateLimiter:
    """
    Simple leaky-bucket limiter targeting ~75 req/min (default Pro plan).
    We space requests by ~0.85s to be conservative and allow bursts via a semaphore.
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


class AlphaVantageClient:
    def __init__(self, api_key: str | None = None, timeout: float = 30.0, rpm: int = 75, concurrent: int = 10):
        self.api_key = api_key or ALPHA_VANTAGE_API_KEY
        if not self.api_key:
            raise RuntimeError("ALPHA_VANTAGE_API_KEY not configured")
        self.timeout = timeout
        self.rate = AlphaVantageRateLimiter(rpm=rpm, concurrent=concurrent)
        self._client = httpx.AsyncClient(timeout=self.timeout)

    async def _get(self, params: Dict[str, str], expect_csv: bool = False) -> httpx.Response:
        await self.rate.throttle()
        r = await self._client.get(ALPHA_VANTAGE_BASE, params={**params, "apikey": self.api_key})
        r.raise_for_status()
        # Alpha Vantage sometimes returns JSON error even when CSV requested; caller handles parsing.
        return r

    # ---------- 1) Universe sync ----------
    async def fetch_listing_status(self, state: str = "active") -> List[Dict[str, str]]:
        """
        Returns a list of dict rows from LISTING_STATUS CSV with keys:
        symbol,name,exchange,assetType,ipoDate,delistingDate,status
        """
        params = {"function": "LISTING_STATUS", "state": state}
        resp = await self._get(params, expect_csv=True)
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
                # Not valid JSON; continue to CSV parse
                pass

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
            # Retry once without the state filter in case of an AV-side quirk
            logger.warning("[AV] LISTING_STATUS(state=active) returned 0 rows; retrying without state")
            resp2 = await self._get({"function": "LISTING_STATUS"}, expect_csv=True)
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

    async def sync_universe_into_db(self, database) -> Dict[str, int]:
        """
        - Pull active US listings from Alpha Vantage
        - Compare against existing securities.ticker
        - Upsert *new* tickers with av_* metadata in parallel to current model
        """
        # 1) Pull your current tickers
        existing_rows = await database.fetch_all("SELECT ticker FROM securities")
        existing = set([r["ticker"] for r in existing_rows if r["ticker"]])

        # 2) Fetch AV active universe
        try:
            active_rows = await self.fetch_listing_status("active")
        except Exception as e:
            logger.error(f"[AV] LISTING_STATUS failed: {e}")
            raise

        # 3) Compute new symbols (avoid duplicates; uppercase and strip)
        new_records = []
        for r in active_rows:
            sym = (r["symbol"] or "").strip().upper()
            if not sym or sym in existing:
                continue
            new_records.append(r)

        logger.info(f"[AV] New active symbols to insert: {len(new_records)}")

        # 4) Upsert new symbols with av_* columns, preserving existing model
        inserted = 0
        now = datetime.now(timezone.utc)
        for r in new_records:
            try:
                await database.execute(
                    """
                    INSERT INTO securities (ticker, active,
                                            av_added_security, av_date_added,
                                            av_exchange, av_asset_type, av_ipo_date, av_name)
                    VALUES (:ticker, TRUE,
                            TRUE, :av_date_added,
                            :av_exchange, :av_asset_type, :av_ipo_date, :av_name)
                    ON CONFLICT (ticker) DO UPDATE
                    SET  -- do not overwrite existing non-AV fields; only set AV fields if NULL
                        av_added_security = COALESCE(securities.av_added_security, TRUE),
                        av_date_added     = COALESCE(securities.av_date_added, EXCLUDED.av_date_added),
                        av_exchange       = COALESCE(securities.av_exchange, EXCLUDED.av_exchange),
                        av_asset_type     = COALESCE(securities.av_asset_type, EXCLUDED.av_asset_type),
                        av_ipo_date       = COALESCE(securities.av_ipo_date, EXCLUDED.av_ipo_date),
                        av_name           = COALESCE(securities.av_name, EXCLUDED.av_name)
                    """,
                    {
                        "ticker": (r["symbol"] or "").strip().upper(),
                        "av_date_added": now,
                        "av_exchange": (r["exchange"] or None),
                        "av_asset_type": (r["assetType"] or None),
                        "av_ipo_date": (r["ipoDate"] or None),
                        "av_name": (r["name"] or None),
                    },
                )
                inserted += 1
            except Exception as e:
                logger.error(f"[AV] Upsert failed for {r.get('symbol')}: {e}")

        return {"inserted": inserted, "seen_active": len(active_rows)}

    # ---------- 2) Bulk realtime quotes ----------
    @staticmethod
    def _chunk(lst: List[str], size: int = 100) -> List[List[str]]:
        return [lst[i:i+size] for i in range(0, len(lst), size)]

    async def bulk_quotes(self, symbols: List[str]) -> Dict[str, Dict]:
        """
        Call REALTIME_BULK_QUOTES in 100-symbol chunks.
        Returns {symbol: {price, previous_close, volume, ...}} (keys present if provided by AV)
        """
        result: Dict[str, Dict] = {}
        for batch in self._chunk([s.strip().upper() for s in symbols if s], 100):
            params = {
                "function": "REALTIME_BULK_QUOTES",
                "symbol": ",".join(batch),
                "datatype": "json",
            }
            try:
                resp = await self._get(params)
                data = resp.json()
            except Exception as e:
                logger.error(f"[AV] bulk quotes request failed for batch: {e}")
                continue

            # API returns list under key 'Realtime Bulk Quotes' (field names may vary; handle robustly)
            payload = (
                data.get("Realtime Bulk Quotes")
                or data.get("Stock Quotes")
                or data.get("results")
                or []
            )

            if not isinstance(payload, list):
                logger.warning(f"[AV] Unexpected bulk payload type: {type(payload)}; data keys: {list(data.keys())}")
                continue

            for item in payload:
                sym = (item.get("symbol") or item.get("01. symbol") or "").strip().upper()
                if not sym:
                    continue
                # Normalize common fields
                price = (
                    item.get("price")
                    or item.get("05. price")
                    or item.get("current_price")
                )
                prev_close = item.get("previous_close") or item.get("08. previous close")
                volume = item.get("volume") or item.get("06. volume")
                ts = item.get("timestamp") or item.get("07. latest trading day")

                result[sym] = {
                    "price": float(price) if price not in (None, "", "None") else None,
                    "previous_close": float(prev_close) if prev_close not in (None, "", "None") else None,
                    "volume": int(volume) if (isinstance(volume, str) and volume.isdigit()) else volume,
                    "price_timestamp": ts,
                }
        return result

    async def update_prices_for_active(self, database, limit_symbols: int = 1000) -> Tuple[int, int]:
        """
        - Select symbols to update (oldest first) from your security_usage view (or securities)
        - Fetch quotes in 100-sized batches
        - Write back ONLY to av_* fields so we don't disrupt Yahoo/Polygon
        Returns (updated_count, attempted_count)
        """
        # Select candidates (oldest)
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

        data = await self.bulk_quotes(symbols)

        updated = 0
        now = datetime.now(timezone.utc)
        for sym in symbols:
            q = data.get(sym)
            if not q:
                # mark opt-out to avoid hammering bad tickers
                try:
                    await database.execute(
                        """
                        UPDATE securities
                           SET on_alphavantage = FALSE,
                               last_updated = :now
                         WHERE ticker = :ticker
                        """,
                        {"ticker": sym, "now": now},
                    )
                except Exception as e:
                    logger.error(f"[AV] Failed to disable on_alphavantage for {sym}: {e}")
                continue

            try:
                await database.execute(
                    """
                    UPDATE securities
                       SET av_price            = :price,
                           av_price_timestamp  = :ts,
                           on_alphavantage     = TRUE,
                           last_updated        = :now
                     WHERE ticker = :ticker
                    """,
                    {
                        "ticker": sym,
                        "price": q.get("price"),
                        "ts": q.get("price_timestamp"),
                        "now": now,
                    },
                )
                updated += 1
            except Exception as e:
                logger.error(f"[AV] Update failed for {sym}: {e}")
                try:
                    await database.execute(
                        "UPDATE securities SET on_alphavantage = FALSE, last_updated = :now WHERE ticker = :ticker",
                        {"ticker": sym, "now": now},
                    )
                except Exception as e2:
                    logger.error(f"[AV] Fallback disable failed for {sym}: {e2}")

        return (updated, len(symbols))

    # ---------- 3) Placeholder for Overview ----------
    async def get_company_overview(self, symbol: str) -> Dict:
        """
        Placeholder for future use. Alpha Vantage OVERVIEW is per-symbol.
        """
        params = {"function": "OVERVIEW", "symbol": symbol}
        resp = await self._get(params)
        return resp.json()

    async def aclose(self):
        await self._client.aclose()
