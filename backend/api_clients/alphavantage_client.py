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

    # ---------- selection for OVERVIEW ---------------------------------------

    async def _select_symbols_for_overview(self, database, limit_symbols: int = 50) -> List[str]:
        """
        Select up to `limit_symbols` tickers from `security_usage` ordered by oldest metrics first.
        Oldest first = largest metrics_age_minutes; NULL treated as *very old* (comes first).
        We also apply AV-friendly filters (exclude indices, futures, crypto pairs, foreign suffixes).
        """
        sql = """
            SELECT u.ticker
            FROM security_usage u
            LEFT JOIN securities s ON s.ticker = u.ticker
            WHERE (u.metrics_status = 'Requires Updating' OR u.metrics_status IS NULL)
              AND COALESCE(s.active, TRUE)
              AND COALESCE(s.av_asset_type, s.asset_type, 'security') IN ('Stock','ETF','security')
              AND (s.ticker NOT LIKE '^%%')
              AND (s.ticker NOT LIKE '%%=F')
              AND (s.ticker NOT LIKE '%%-USD')
              AND (s.ticker NOT LIKE '%%.%%')
              AND (s.ticker NOT LIKE '%%-%%') -- exclude units/warrants like XYZ-U/XYZ-WS
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

    # ---------- 1) Universe sync (unchanged) ----------------------------------

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

    # ---------- 2) Company Overview ------------------------------------------

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

    def _map_overview_to_update_values(self, sym: str, ov: Dict, now: datetime) -> Dict:
        """
        Normalize AV Overview payload into our `securities` columns.
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
            "forward_eps": None,   # not provided by AV Overview
            "updated_at": now,
        }

    async def update_company_overviews(
        self,
        database,
        limit_symbols: int = 50,
        symbols_override: Optional[List[str]] = None
    ) -> Dict[str, int]:
        """
        Pull Alpha Vantage OVERVIEW for up to `limit_symbols` tickers (default 50),
        chosen from `security_usage` by oldest `metrics_age_minutes` first (NULL first).
        Upsert metrics into `securities`.

        Writes:
          company_name, sector, industry,
          market_cap, pe_ratio, forward_pe,
          dividend_rate, dividend_yield, beta,
          fifty_two_week_low, fifty_two_week_high, fifty_two_week_range,
          eps, forward_eps=None,
          last_metrics_update, last_updated, metrics_source='alpha_vantage'.

        Returns: {"attempted": N, "updated": M, "skipped": K, "failed": F}
        """
        if symbols_override:
            symbols = [s.strip().upper() for s in symbols_override if s]
            logger.info(f"[AV] OverviewUpdate: using symbol override ({len(symbols)}). Sample: {symbols[:5]}")
        else:
            symbols = await self._select_symbols_for_overview(database, limit_symbols=limit_symbols)

        if not symbols:
            logger.info("[AV] OverviewUpdate: no symbols found requiring metrics update.")
            return {"attempted": 0, "updated": 0, "skipped": 0, "failed": 0}

        logger.info(f"[AV] OverviewUpdate: starting for {len(symbols)} symbols.")
        now = datetime.utcnow()  # naive to match 'timestamp without time zone'

        updated = 0
        skipped = 0
        failed  = 0
        rows_to_update = []

        # Sequential fetches (respecting rate limiter) keep logs simple & safe with AV rpm.
        for sym in symbols:
            try:
                ov = await self.get_company_overview(sym)
                if not ov or "Symbol" not in ov:
                    logger.warning(f"[AV] OVERVIEW empty/unexpected payload for {sym}; skipping.")
                    skipped += 1
                    continue
                mapped = self._map_overview_to_update_values(sym, ov, now)
                rows_to_update.append(mapped)
            except Exception as e:
                failed += 1
                logger.error(f"[AV] OVERVIEW fetch failed for {sym}: {repr(e)}")

        if rows_to_update:
            sql = """
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
                await database.execute_many(sql, rows_to_update)
                updated = len(rows_to_update)
                logger.info(f"[AV] OverviewUpdate: batch UPDATE applied for {updated} tickers.")
            except Exception as e:
                logger.error(f"[AV] OverviewUpdate: batch UPDATE failed; falling back per-row. err={repr(e)}")
                updated = 0
                for row in rows_to_update:
                    try:
                        await database.execute(sql, row)
                        updated += 1
                    except Exception as e2:
                        failed += 1
                        logger.error(f"[AV] OverviewUpdate: per-row UPDATE failed for {row['ticker']}: {repr(e2)}")

        logger.info(f"[AV] OverviewUpdate: completed attempted={len(symbols)}, updated={updated}, skipped={skipped}, failed={failed}")
        return {"attempted": len(symbols), "updated": updated, "skipped": skipped, "failed": failed}
