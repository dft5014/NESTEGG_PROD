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
ALPHAVANTAGE_DEBUG = os.getenv("ALPHAVANTAGE_DEBUG", "").lower() in ("1", "true", "yes")


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

    async def aclose(self):
        """Close the underlying HTTP client (call from main.py in a finally block)."""
        try:
            await self._client.aclose()
        except Exception as e:
            logger.warning(f"[AV] aclose() warning: {e}")

    async def _get(self, params: Dict[str, str]) -> httpx.Response:
        await self.rate.throttle()
        r = await self._client.get(ALPHA_VANTAGE_BASE, params={**params, "apikey": self.api_key})
        r.raise_for_status()
        return r

    # ---------- Symbol selection (quotes path) --------------------------------
    # (kept for compatibility with your existing endpoints)

    async def _select_symbols_for_av(self, database, limit_symbols: int) -> List[str]:
        """
        Try multiple selection strategies with explicit logs.
        We keep the universe AV-friendly: US stocks/ETFs; exclude indexes (^), futures (=F), crypto (-USD), foreign (.TO) etc.
        """
        def _log(name: str, rows):
            vals = [(r["ticker"] or "").strip().upper() for r in rows if r["ticker"]]
            logger.info(f"[AV] Select[{name}]: {len(vals)} symbols (limit={limit_symbols})")
            return vals

        sql1 = """
            SELECT u.ticker
            FROM security_usage u
            LEFT JOIN securities s ON s.ticker = u.ticker
            WHERE u.status = 'Active'
              AND (u.on_alphavantage IS DISTINCT FROM FALSE)
              AND COALESCE(s.av_asset_type, s.asset_type, 'security') IN ('Stock','ETF','security')
              AND COALESCE(s.av_exchange,'') IN ('NYSE','NASDAQ','NYSE ARCA','NYSE MKT','BATS')
              AND u.ticker NOT LIKE '^%%'
              AND u.ticker NOT LIKE '%%=F'
              AND u.ticker NOT LIKE '%%-USD'
              AND u.ticker NOT LIKE '%%.%%'
            ORDER BY u.last_updated ASC
            LIMIT :lim
        """
        rows = await database.fetch_all(sql1, {"lim": limit_symbols})
        c1 = _log("usage_active", rows)
        if c1:
            return c1

        sql2 = """
            SELECT u.ticker
            FROM security_usage u
            LEFT JOIN securities s ON s.ticker = u.ticker
            WHERE (u.on_alphavantage IS DISTINCT FROM FALSE)
              AND COALESCE(s.av_asset_type, s.asset_type, 'security') IN ('Stock','ETF','security')
              AND COALESCE(s.av_exchange,'') IN ('NYSE','NASDAQ','NYSE ARCA','NYSE MKT','BATS')
              AND u.ticker NOT LIKE '^%%'
              AND u.ticker NOT LIKE '%%=F'
              AND u.ticker NOT LIKE '%%-USD'
              AND u.ticker NOT LIKE '%%.%%'
            ORDER BY u.last_updated ASC
            LIMIT :lim
        """
        rows = await database.fetch_all(sql2, {"lim": limit_symbols})
        c2 = _log("usage_any_status", rows)
        if c2:
            return c2

        sql3 = """
            SELECT s.ticker
            FROM securities s
            WHERE COALESCE(s.active, TRUE)
              AND (s.on_alphavantage IS DISTINCT FROM FALSE)
              AND COALESCE(s.av_asset_type, s.asset_type, 'security') IN ('Stock','ETF','security')
              AND COALESCE(s.av_exchange,'') IN ('NYSE','NASDAQ','NYSE ARCA','NYSE MKT','BATS')
              AND s.ticker NOT LIKE '^%%'
              AND s.ticker NOT LIKE '%%=F'
              AND s.ticker NOT LIKE '%%-USD'
              AND s.ticker NOT LIKE '%%.%%'
            ORDER BY COALESCE(s.last_updated, '1970-01-01'::timestamp) ASC
            LIMIT :lim
        """
        rows = await database.fetch_all(sql3, {"lim": limit_symbols})
        c3 = _log("securities_active", rows)
        return c3

    # ---------- 1) Universe sync (kept) --------------------------------------

    async def fetch_listing_status(self, state: str = "active") -> List[Dict[str, str]]:
        """
        Returns a list of dict rows from LISTING_STATUS CSV with keys:
        symbol,name,exchange,assetType,ipoDate,delistingDate,status
        """
        params = {"function": "LISTING_STATUS", "state": state}
        resp = await self._get(params)
        text = resp.text or ""

        logger.info(f"[AV] LISTING_STATUS HTTP {resp.status_code}; bytes={len(text)}")
        if ALPHAVANTAGE_DEBUG:
            logger.debug(f"[AV] LISTING_STATUS raw head: {text[:300]!r}")

        if text.lstrip().startswith("{"):
            try:
                j = resp.json()
                note = j.get("Note") or j.get("Information")
                err  = j.get("Error Message")
                logger.warning(f"[AV] LISTING_STATUS JSON Note/Error: {note or err}")
                raise RuntimeError(f"Alpha Vantage LISTING_STATUS returned JSON: {note or err}")
            except Exception:
                pass

        reader = csv.DictReader(io.StringIO(text))
        rows = [{
            "symbol": r.get("symbol"),
            "name": r.get("name"),
            "exchange": r.get("exchange"),
            "assetType": r.get("assetType"),
            "ipoDate": r.get("ipoDate"),
            "delistingDate": r.get("delistingDate"),
            "status": r.get("status"),
        } for r in reader]

        if not rows:
            logger.warning("[AV] LISTING_STATUS(state=active) returned 0 rows; retrying without state")
            resp2 = await self._get({"function": "LISTING_STATUS"})
            text2 = resp2.text or ""
            if text2.lstrip().startswith("{"):
                try:
                    j2 = resp2.json()
                    note = j2.get("Note") or j2.get("Information")
                    err  = j2.get("Error Message")
                    logger.warning(f"[AV] LISTING_STATUS retry JSON Note/Error: {note or err}")
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
        existing_rows = await database.fetch_all("SELECT ticker FROM securities")
        existing = {(r["ticker"] or "").strip().upper() for r in existing_rows if r["ticker"]}
        logger.info(f"[AV] UniverseSync: existing tickers loaded: {len(existing)}")

        active_rows = await self.fetch_listing_status("active")

        new_records: List[Dict[str, str]] = []
        for r in active_rows:
            sym = (r.get("symbol") or "").strip().upper()
            if not sym or sym in existing:
                continue
            new_records.append(r)

        logger.info(f"[AV] UniverseSync: new active symbols to insert: {len(new_records)}")

        if not new_records:
            return {"inserted": 0, "seen_active": len(active_rows)}

        now = datetime.now(timezone.utc)
        to_insert = [{
            "ticker": (r.get("symbol") or "").strip().upper(),
            "av_date_added": now,
            "av_exchange": (r.get("exchange") or None),
            "av_asset_type": (r.get("assetType") or None),
            "av_ipo_date": _parse_iso_date(r.get("ipoDate")),
            "av_name": (r.get("name") or None),
        } for r in new_records]

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
                logger.info(f"[AV] UniverseSync: batch upsert rows {i}-{i+len(chunk)-1} applied")
            except Exception as e:
                logger.error(f"[AV] UniverseSync: batch upsert failed for rows {i}-{i+len(chunk)-1}: {repr(e)}")

        logger.info(f"[AV] UniverseSync: inserted={inserted}, seen_active={len(active_rows)}")
        return {"inserted": inserted, "seen_active": len(active_rows)}

    # ---------- 2) Bulk realtime quotes (kept) --------------------------------

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
            if ALPHAVANTAGE_DEBUG:
                logger.debug(f"[AV] bulk_quotes HTTP {resp.status_code}; batch={len(batch)}; keys={list(data.keys())[:5]}")
        except Exception as e:
            logger.error(f"[AV] bulk quotes request failed for batch ({len(batch)}): {repr(e)}")
            return out

        if isinstance(data, dict) and any(k in data for k in ("Note", "Information", "Error Message")):
            logger.warning(f"[AV] bulk_quotes Note/Error: {data.get('Note') or data.get('Information') or data.get('Error Message')}")

        payload = (
            data.get("Realtime Bulk Quotes")
            or data.get("Stock Quotes")
            or data.get("results")
            or []
        )
        if not isinstance(payload, list):
            logger.warning(f"[AV] Unexpected bulk payload: type={type(payload)} keys={list(data.keys())[:5]}")
            return out

        if ALPHAVANTAGE_DEBUG:
            logger.debug(f"[AV] bulk_quotes payload_len={len(payload)} for batch of {len(batch)}")

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
        clean_syms = [s.strip().upper() for s in symbols if s]
        batches = self._chunk(clean_syms, max(1, min(100, quote_batch_size)))
        results: Dict[str, Dict] = {}

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
                    logger.error(f"[AV] bulk quotes wave error: {repr(out)}")

        if not results:
            logger.warning("[AV] bulk_quotes: no quotes parsed from AV (rate limit Note? unsupported universe? payload shape change?).")
        else:
            logger.info(f"[AV] bulk_quotes: quotes parsed for {len(results)} symbols. Sample: {list(results.keys())[:10]}")
        return results

    async def update_prices_for_active(
        self,
        database,
        limit_symbols: int = 1000,
        quote_batch_size: int = 100,
        max_concurrent_batches: int = 5,
        symbols_override: Optional[List[str]] = None,
    ) -> Tuple[int, int]:
        logger.info(f"[AV] PriceUpdate: start limit={limit_symbols}, batch={quote_batch_size}, concurrency={max_concurrent_batches}, override={bool(symbols_override)}")
        if symbols_override:
            symbols = [s.strip().upper() for s in symbols_override if s]
        else:
            symbols = await self._select_symbols_for_av(database, limit_symbols)
        logger.info(f"[AV] PriceUpdate: selected {len(symbols)} symbols. Sample: {symbols[:10]}")

        if not symbols:
            logger.warning("[AV] PriceUpdate: no symbols selected (check view filters/status/on_alphavantage).")
            return (0, 0)

        data = await self.bulk_quotes(
            symbols,
            quote_batch_size=quote_batch_size,
            max_concurrent_batches=max_concurrent_batches
        )
        logger.info(f"[AV] PriceUpdate: AV returned quotes for {len(data)} / {len(symbols)} symbols.")
        zero_quotes_overall = (len(data) == 0)
        if zero_quotes_overall:
            logger.warning("[AV] PriceUpdate: AV returned 0 quotes for the entire batch; skipping disables (likely rate-limit/unsupported universe).")

        updated = 0
        now = datetime.utcnow()

        update_rows = []
        disable_rows = []

        for sym in symbols:
            q = data.get(sym)
            if not q:
                if not zero_quotes_overall:
                    disable_rows.append({"ticker": sym, "now": now})
                continue
            update_rows.append({
                "ticker": sym,
                "price": q.get("price"),
                "ts": q.get("price_timestamp"),
                "now": now,
            })

        logger.info(f"[AV] PriceUpdate: prepared updates={len(update_rows)}, disables={len(disable_rows)}.")

        if update_rows:
            try:
                await database.execute_many(
                    """
                    UPDATE securities
                       SET av_price            = :price,
                           av_price_timestamp  = :ts,
                           on_alphavantage     = TRUE,
                           last_updated        = CAST(:now AS timestamp)
                     WHERE ticker = :ticker
                    """,
                    update_rows,
                )
                updated = len(update_rows)
                logger.info(f"[AV] PriceUpdate: batch UPDATE applied for {updated} tickers.")
            except Exception as e:
                logger.error(f"[AV] PriceUpdate: batch UPDATE failed; falling back to per-row. err={repr(e)}")
                updated = 0
                for row in update_rows:
                    try:
                        await database.execute(
                            """
                            UPDATE securities
                               SET av_price            = :price,
                                   av_price_timestamp  = :ts,
                                   on_alphavantage     = TRUE,
                                   last_updated        = CAST(:now AS timestamp)
                             WHERE ticker = :ticker
                            """,
                            row,
                        )
                        updated += 1
                    except Exception as e2:
                        logger.error(f"[AV] PriceUpdate: per-row UPDATE failed for {row['ticker']}: {repr(e2)}")

        if disable_rows:
            try:
                await database.execute_many(
                    """
                    UPDATE securities
                       SET on_alphavantage = FALSE,
                           last_updated    = CAST(:now AS timestamp)
                     WHERE ticker = :ticker
                    """,
                    disable_rows,
                )
                logger.info(f"[AV] PriceUpdate: batch DISABLE applied for {len(disable_rows)} tickers.")
            except Exception as e:
                logger.error(f"[AV] PriceUpdate: batch DISABLE failed; falling back. err={repr(e)}")
                for row in disable_rows:
                    try:
                        await database.execute(
                            "UPDATE securities SET on_alphavantage = FALSE, last_updated = CAST(:now AS timestamp) WHERE ticker = :ticker",
                            row,
                        )
                    except Exception as e2:
                        logger.error(f"[AV] PriceUpdate: per-row DISABLE failed for {row['ticker']}: {repr(e2)}")

        logger.info(f"[AV] PriceUpdate: completed updated={updated}, attempted={len(symbols)}, disabled={len(disable_rows)}")
        return (updated, len(symbols))

    # ---------- 3) Company Overview (per-symbol + batch update) --------------

    async def get_company_overview(self, symbol: str) -> Dict:
        """
        Fetch Alpha Vantage 'OVERVIEW' for a single symbol.
        Returns raw JSON dict (Alpha Vantage field casing).
        """
        params = {"function": "OVERVIEW", "symbol": symbol}
        resp = await self._get(params)
        data = resp.json()
        if isinstance(data, dict) and any(k in data for k in ("Note", "Information", "Error Message")):
            logger.warning(f"[AV] OVERVIEW Note/Error for {symbol}: "
                           f"{data.get('Note') or data.get('Information') or data.get('Error Message')}")
        return data

    async def _select_symbols_for_overview(self, database, limit_symbols: int = 50) -> List[str]:
        """
        Pick up to `limit_symbols` tickers to update fundamentals for, using `security_usage`.
        Oldest first by metrics_age_minutes (NULL treated as very old).
        Skip tickers already marked on_alphavantage = FALSE.
        Restrict to AV-friendly US equities/ETFs.
        """
        sql = """
            SELECT u.ticker
            FROM security_usage u
            LEFT JOIN securities s ON s.ticker = u.ticker
            WHERE (u.metrics_status = 'Requires Updating' OR u.metrics_status IS NULL)
              AND (s.on_alphavantage IS DISTINCT FROM FALSE)
              AND COALESCE(s.active, TRUE)
              AND COALESCE(s.av_asset_type, s.asset_type, 'security') IN ('Stock','ETF','security')
              AND (s.ticker NOT LIKE '^%%')
              AND (s.ticker NOT LIKE '%%=F')
              AND (s.ticker NOT LIKE '%%-USD')
              AND (s.ticker NOT LIKE '%%.%%')
              AND (s.ticker NOT LIKE '%%-%%')
            ORDER BY COALESCE(u.metrics_age_minutes, 1000000000) DESC,
                     s.last_metrics_update NULLS FIRST,
                     s.last_updated NULLS FIRST,
                     u.ticker ASC
            LIMIT :lim
        """
        rows = await database.fetch_all(sql, {"lim": limit_symbols})
        syms = [(r["ticker"] or "").strip().upper() for r in rows if r["ticker"]]
        logger.info(f"[AV] OverviewSelect: picked {len(syms)} symbols (limit={limit_symbols}). Sample: {syms[:5]}")
        return syms

    def _map_overview_to_update_values(self, sym: str, ov: Dict, now: datetime) -> Dict:
        """
        Normalize AV Overview payload into our securities columns.
        We don’t overwrite prices here—this is a fundamentals/metrics update.
        """
        def f(key, alt=None):  # float
            return _to_float(ov.get(key) if alt is None else ov.get(key, ov.get(alt)))
        def s(key, alt=None):  # string
            return (ov.get(key) if alt is None else ov.get(key, ov.get(alt))) or None

        fifty_two_low  = f("52WeekLow")
        fifty_two_high = f("52WeekHigh")
        fifty_two_range = f"{fifty_two_low}-{fifty_two_high}" if (fifty_two_low is not None and fifty_two_high is not None) else None

        return {
            "ticker": sym,
            "company_name": s("Name"),
            "sector": s("Sector"),
            "industry": s("Industry"),
            "market_cap": f("MarketCapitalization"),
            "pe_ratio": f("PERatio") or f("TrailingPE"),
            "forward_pe": f("ForwardPE"),
            "dividend_rate": f("DividendPerShare"),
            "dividend_yield": f("DividendYield"),
            "beta": f("Beta"),
            "fifty_two_week_low": fifty_two_low,
            "fifty_two_week_high": fifty_two_high,
            "fifty_two_week_range": fifty_two_range,
            "eps": f("DilutedEPSTTM") or f("EPS"),
            "forward_eps": None,
            "updated_at": now,
        }

    async def update_company_overviews(
        self,
        database,
        limit_symbols: int = 50,
        symbols_override: Optional[List[str]] = None
    ) -> Dict[str, int]:
        """
        Pull Alpha Vantage OVERVIEW for a batch (default 50) of tickers that have
        stale metrics and upsert metrics into `securities`.

        Also: if OVERVIEW is empty/unexpected for a ticker, we set on_alphavantage = FALSE
        so it will not be reselected in future runs.
        """
        symbols = [s.strip().upper() for s in symbols_override if s] if symbols_override else \
                  await self._select_symbols_for_overview(database, limit_symbols=limit_symbols)

        if not symbols:
            logger.info("[AV] OverviewUpdate: no symbols found requiring metrics update.")
            return {"attempted": 0, "updated": 0, "skipped": 0, "failed": 0}

        logger.info(f"[AV] OverviewUpdate: starting for {len(symbols)} symbols.")
        now = datetime.utcnow()  # naive to match `timestamp without time zone` columns

        updated = 0
        skipped = 0
        failed  = 0
        rows_to_update: List[Dict] = []
        rows_to_disable: List[Dict] = []

        # Fetch serially (rate-limited), clearer logs and respects AV RPM reliably
        for sym in symbols:
            try:
                ov = await self.get_company_overview(sym)
                if not ov or "Symbol" not in ov:
                    skipped += 1
                    rows_to_disable.append({"ticker": sym, "now": now})
                    logger.warning(f"[AV] OVERVIEW empty/unexpected payload for {sym}; disabling on_alphavantage.")
                    continue

                mapped = self._map_overview_to_update_values(sym, ov, now)
                rows_to_update.append(mapped)

            except Exception as e:
                failed += 1
                logger.error(f"[AV] OVERVIEW fetch failed for {sym}: {repr(e)}")

        # Apply metrics updates
        if rows_to_update:
            sql_update = """
                UPDATE securities
                   SET company_name         = :company_name,
                       sector               = :sector,
                       industry             = :industry,
                       market_cap           = :market_cap,
                       pe_ratio             = :pe_ratio,
                       forward_pe           = :forward_pe,
                       dividend_rate        = :dividend_rate,
                       dividend_yield       = :dividend_yield,
                       beta                 = :beta,
                       fifty_two_week_low   = :fifty_two_week_low,
                       fifty_two_week_high  = :fifty_two_week_high,
                       fifty_two_week_range = :fifty_two_week_range,
                       eps                  = :eps,
                       forward_eps          = :forward_eps,
                       last_metrics_update  = :updated_at,
                       last_updated         = :updated_at,
                       metrics_source       = 'alpha_vantage'
                 WHERE ticker = :ticker
            """
            try:
                await database.execute_many(sql_update, rows_to_update)
                updated = len(rows_to_update)
                logger.info(f"[AV] OverviewUpdate: batch UPDATE applied for {updated} tickers.")
            except Exception as e:
                logger.error(f"[AV] OverviewUpdate: batch UPDATE failed; falling back per-row. err={repr(e)}")
                updated = 0
                for row in rows_to_update:
                    try:
                        await database.execute(sql_update, row)
                        updated += 1
                    except Exception as e2:
                        failed += 1
                        logger.error(f"[AV] OverviewUpdate: per-row UPDATE failed for {row['ticker']}: {repr(e2)}")

        # Apply disables for unsupported/empty payloads
        if rows_to_disable:
            sql_disable = """
                UPDATE securities
                   SET on_alphavantage = FALSE,
                       last_updated    = CAST(:now AS timestamp)
                 WHERE ticker = :ticker
            """
            try:
                await database.execute_many(sql_disable, rows_to_disable)
                logger.info(
                    f"[AV] OverviewUpdate: disabled on_alphavantage for {len(rows_to_disable)} tickers "
                    f"(empty/unsupported OVERVIEW). Sample: {[r['ticker'] for r in rows_to_disable[:10]]}"
                )
            except Exception as e:
                logger.error(f"[AV] OverviewUpdate: batch DISABLE failed; falling back. err={repr(e)}")
                for row in rows_to_disable:
                    try:
                        await database.execute(sql_disable, row)
                    except Exception as e2:
                        logger.error(f"[AV] OverviewUpdate: per-row DISABLE failed for {row['ticker']}: {repr(e2)}")

        logger.info(f"[AV] OverviewUpdate: completed attempted={len(symbols)}, updated={updated}, skipped={skipped}, failed={failed}")
        return {"attempted": len(symbols), "updated": updated, "skipped": skipped, "failed": failed}
