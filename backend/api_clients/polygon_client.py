"""
Polygon market data client using the official SDK + REST (v3).

Capabilities:
- Full-market snapshots for prices (filtered to our tickers).
- Reference tickers listing to backfill 'securities'.
- Historical daily OHLCV via aggregates.

Docs:
- Full market snapshot:
  https://polygon.io/docs/rest/stocks/snapshots/full-market-snapshot
- List tickers (v3):
  https://polygon.io/docs/stocks/get_v3_reference_tickers
- Aggregates (daily):
  https://polygon.io/docs/stocks/get_v2_aggs_ticker_ticker_range_multiplier_timespan_from_to
"""
import os
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Iterable

import requests

# NOTE: PyPI package name is `polygon-api-client`, but the module is imported as `polygon`.
try:
    from polygon import RESTClient  # provided by polygon-api-client
except Exception as e:
    raise RuntimeError(
        "Polygon SDK unavailable. Install 'polygon-api-client' in requirements.txt "
        "and ensure POLYGON_API_KEY is set."
    ) from e

from backend.api_clients.data_source_interface import MarketDataSource

logger = logging.getLogger("polygon_client")


def _to_dt(ts: Optional[int]) -> Optional[datetime]:
    """Polygon timestamps may be ns/us/ms/s; normalize to aware UTC."""
    if ts is None:
        return None
    try:
        ts = int(ts)
        if ts > 10**15:   # ns
            sec = ts / 1_000_000_000
        elif ts > 10**12: # us
            sec = ts / 1_000_000
        elif ts > 10**10: # ms
            sec = ts / 1_000
        else:             # s
            sec = ts
        return datetime.fromtimestamp(sec, tz=timezone.utc)
    except Exception:
        return None


class PolygonClient(MarketDataSource):
    """
    Thin wrapper around Polygon's SDK/REST that returns
    simple Python dicts our services can consume.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("POLYGON_API_KEY")
        if not self.api_key:
            raise RuntimeError("POLYGON_API_KEY not set")

        # Blocking SDK; run calls in a thread via run_in_executor
        self.client = RESTClient(self.api_key)

        # For v3 REST calls (reference listings)
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})
        self.base_v3 = "https://api.polygon.io/v3"

        # lightweight cache TTLs (optional, kept consistent with other clients)
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = {
            "current_price": 15 * 60,     # 15 minutes
            "company_metrics": 24 * 60 * 60,
            "historical_prices": 6 * 60 * 60,
        }

    # ---- required by MarketDataSource interface ----
    @property
    def source_name(self) -> str:
        return "polygon"

    @property
    def daily_call_limit(self) -> Optional[int]:
        return None

    # ------------------------------------------------
    # Simple in-memory cache helpers
    # ------------------------------------------------

    def _get_from_cache(self, cache_key: str, cache_type: str) -> Optional[Any]:
        if cache_key in self.cache:
            item = self.cache[cache_key]
            ts: datetime = item.get("timestamp")  # type: ignore
            if ts and (datetime.now(timezone.utc) - ts).total_seconds() < self.cache_ttl[cache_type]:
                return item.get("data")
        return None

    def _set_in_cache(self, cache_key: str, cache_type: str, data: Any) -> None:
        self.cache[cache_key] = {"data": data, "timestamp": datetime.now(timezone.utc)}

    # ------------------------------------------------
    # Prices via full-market snapshots
    # ------------------------------------------------

    def _pick_price_and_ts(self, snap: Any) -> (Optional[float], Optional[datetime]):
        """
        Choose a reasonable price/timestamp from a TickerSnapshot-like object.

        Preference:
          1) last_trade.price / timestamp
          2) mid(last_quote.bid_price, last_quote.ask_price) / timestamp
          3) minute.close or day.close or prev_day.close / timestamp
          4) updated
        """
        price, ts = None, None

        # last trade
        lt = getattr(snap, "last_trade", None)
        if lt:
            p = getattr(lt, "price", None) or getattr(lt, "p", None)
            if p is not None:
                try:
                    price = float(p)
                except Exception:
                    price = None
                ts = (getattr(lt, "sip_timestamp", None)
                      or getattr(lt, "participant_timestamp", None)
                      or getattr(lt, "t", None))

        # last quote mid
        if price is None:
            lq = getattr(snap, "last_quote", None)
            if lq:
                bp = getattr(lq, "bid_price", None) or getattr(lq, "bp", None)
                ap = getattr(lq, "ask_price", None) or getattr(lq, "ap", None)
                if bp is not None and ap is not None:
                    try:
                        price = (float(bp) + float(ap)) / 2.0
                        ts = (getattr(lq, "sip_timestamp", None)
                              or getattr(lq, "participant_timestamp", None)
                              or getattr(lq, "t", None))
                    except Exception:
                        price = None

        # bars: minute -> day -> prev_day
        if price is None:
            for bar_attr in ("min", "minute", "day", "prev_day"):
                bar = getattr(snap, bar_attr, None)
                if bar:
                    close = getattr(bar, "close", None) or getattr(bar, "c", None)
                    if close is not None:
                        try:
                            price = float(close)
                        except Exception:
                            price = None
                        ts = getattr(bar, "timestamp", None) or getattr(bar, "t", None)
                        if price is not None:
                            break

        if ts is None:
            ts = getattr(snap, "updated", None)

        return price, _to_dt(ts)

    async def get_snapshots_for(
        self,
        tickers: List[str],
        include_otc: bool = False,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Return {ticker: {price, timestamp, source}} for the given tickers.

        We attempt to use the SDK's `tickers=` filter (newer versions).
        If unsupported, we fall back to streaming the whole market and filter locally.
        """
        if not tickers:
            return {}

        want = {t.upper() for t in tickers}
        out: Dict[str, Dict[str, Any]] = {}
        loop = asyncio.get_event_loop()

        def _fetch_snapshots() -> Iterable[Any]:
            # try: with tickers & include_otc
            try:
                return self.client.get_snapshot_all(
                    "stocks",
                    tickers=",".join(list(want)[:900]),
                    include_otc=include_otc,
                )
            except TypeError:
                # try: include_otc only
                try:
                    return self.client.get_snapshot_all("stocks", include_otc=include_otc)
                except TypeError:
                    # fallback: no kwargs
                    return self.client.get_snapshot_all("stocks")

        try:
            snaps = await loop.run_in_executor(None, lambda: list(_fetch_snapshots()))
        except Exception as e:
            logger.error(f"Polygon get_snapshot_all failed: {e}")
            return {}

        for s in snaps:
            t = getattr(s, "ticker", None)
            if not t:
                continue
            tu = t.upper()
            if tu not in want:
                # If we had to stream full market, skip unrequested tickers
                continue
            price, dt = self._pick_price_and_ts(s)
            if price is None:
                continue
            out[tu] = {
                "price": float(price),
                "timestamp": dt or datetime.now(timezone.utc),
                "source": self.source_name,
            }

        return out

    # ------------------------------------------------
    # Reference listings via v3 REST (to backfill securities)
    # ------------------------------------------------

    async def list_reference_tickers(
        self,
        market: str = "stocks",
        active_only: bool = True,
        types: Optional[List[str]] = None,  # e.g., ["CS","ETF","ADR"]
        limit: int = 1000,
        max_pages: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Page through /v3/reference/tickers and return a list of dicts:
          {ticker, name, type, active, locale, market}

        - Keeps apiKey across `next_url` pages.
        - Basic 429 handling using Retry-After if present.
        """
        params = {
            "apiKey": self.api_key,
            "market": market,
            "active": "true" if active_only else "false",
            "limit": limit,
        }

        # Polygon v3 supports 'type' filter; if multiple, loop over them
        type_sets = types or [None]
        out: List[Dict[str, Any]] = []
        loop = asyncio.get_event_loop()

        def _fetch_page(url: str, q: Optional[Dict[str, Any]]) -> Dict[str, Any]:
            # Ensure we always pass apiKey, even if `next_url` doesn't include it
            from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

            parsed = urlparse(url)
            existing = parse_qs(parsed.query)
            if "apiKey" not in existing:
                existing["apiKey"] = [self.api_key]

            # Only add q for the first page (Polygon expects params on the base URL, not on next_url)
            if q:
                for k, v in q.items():
                    existing[k] = [v] if not isinstance(v, list) else v

            new_query = urlencode({k: v[-1] for k, v in existing.items()})
            merged = parsed._replace(query=new_query)
            final_url = urlunparse(merged)

            r = self.session.get(final_url, timeout=30)
            if r.status_code == 429:
                retry_after = r.headers.get("Retry-After")
                if retry_after:
                    try:
                        import time
                        time.sleep(float(retry_after))
                        r = self.session.get(final_url, timeout=30)
                    except Exception:
                        pass
            r.raise_for_status()
            return r.json()

        for t in type_sets:
            page_count = 0
            first_params = dict(params)
            if t:
                first_params["type"] = t

            url = f"{self.base_v3}/reference/tickers"
            next_url = url

            while next_url:
                page_count += 1
                try:
                    data = await loop.run_in_executor(
                        None,
                        lambda: _fetch_page(next_url, first_params if next_url == url else None),
                    )
                except Exception as e:
                    logger.error(f"Polygon v3 reference page fetch failed (type={t}, page={page_count}): {e}")
                    break

                results = data.get("results") or []
                for row in results:
                    out.append({
                        "ticker": row.get("ticker"),
                        "name": row.get("name"),
                        "type": row.get("type"),
                        "active": row.get("active"),
                        "locale": row.get("locale"),
                        "market": row.get("market"),
                    })

                next_url = data.get("next_url")
                if max_pages and page_count >= max_pages:
                    break

        return out

    # ============================================================
    # Implementations required by MarketDataSource (async)
    # ============================================================

    async def get_current_price(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Return a price dict for a single ticker using snapshots.
        Shape matches your other clients:
        {
          "price": float,
          "day_open": None, "day_high": None, "day_low": None,  # (not provided here)
          "close_price": float,
          "volume": None,
          "timestamp": datetime,
          "price_timestamp": datetime,
          "price_timestamp_str": str,
          "source": "polygon"
        }
        """
        if not ticker:
            return None

        cache_key = f"price_{ticker.upper()}"
        cached = self._get_from_cache(cache_key, "current_price")
        if cached:
            return cached

        snaps = await self.get_snapshots_for([ticker])
        snap = snaps.get(ticker.upper())
        if not snap or snap.get("price") is None:
            return None

        ts = snap.get("timestamp") or datetime.now(timezone.utc)
        result = {
            "price": float(snap["price"]),
            "day_open": None,
            "day_high": None,
            "day_low": None,
            "close_price": float(snap["price"]),
            "volume": None,
            "timestamp": datetime.now(timezone.utc),
            "price_timestamp": ts,
            "price_timestamp_str": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "source": self.source_name,
        }
        self._set_in_cache(cache_key, "current_price", result)
        return result

    async def get_batch_prices(self, tickers: List[str], max_batch_size: int = 900) -> Dict[str, Dict[str, Any]]:
        """
        Batch pricing via snapshots. Ignores max_batch_size unless you need to chunk your input.
        Returns {ticker: price_dict_like_get_current_price}
        """
        if not tickers:
            return {}
        snaps = await self.get_snapshots_for(tickers)
        out: Dict[str, Dict[str, Any]] = {}
        now = datetime.now(timezone.utc)
        for t, s in snaps.items():
            ts = s.get("timestamp") or now
            out[t] = {
                "price": float(s["price"]),
                "day_open": None,
                "day_high": None,
                "day_low": None,
                "close_price": float(s["price"]),
                "volume": None,
                "timestamp": now,
                "price_timestamp": ts,
                "price_timestamp_str": ts.strftime("%Y-%m-%d %H:%M:%S"),
                "source": self.source_name,
            }
        return out

    async def get_company_metrics(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Polygon client does not provide fundamental 'metrics' in this wrapper.
        Return a safe sentinel so upstream code can handle it.
        """
        return {"not_found": True, "source": self.source_name}

    async def get_historical_prices(
        self,
        ticker: str,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Historical daily OHLCV using Polygon aggregates.
        Returns a list of dicts:
        {
          "date": date,
          "timestamp": datetime,
          "day_open": float|None,
          "day_high": float|None,
          "day_low": float|None,
          "close_price": float,
          "volume": int|None,
          "source": "polygon"
        }
        """
        if not ticker or not start_date:
            return []

        if end_date is None:
            end_date = datetime.now(timezone.utc)

        # Cache key includes date range
        cache_key = f"history_{ticker.upper()}_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}"
        cached = self._get_from_cache(cache_key, "historical_prices")
        if cached:
            return cached

        loop = asyncio.get_event_loop()
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")

        def _fetch_aggs() -> Any:
            # 1 day bars
            return self.client.get_aggs(
                ticker=ticker.upper(),
                multiplier=1,
                timespan="day",
                from_=start_str,
                to=end_str,
                adjusted=True,
                sort="asc",
                limit=50000,  # generous
            )

        try:
            aggs = await loop.run_in_executor(None, _fetch_aggs)
        except Exception as e:
            logger.error(f"Polygon aggregates fetch failed for {ticker}: {e}")
            return []

        results: List[Dict[str, Any]] = []
        for a in aggs or []:
            # fields: o,h,l,c,v,t (ms)
            try:
                ts = _to_dt(getattr(a, "timestamp", None) or getattr(a, "t", None))
                if ts is None:
                    continue
                close_val = getattr(a, "close", None) or getattr(a, "c", None)
                if close_val is None:
                    continue

                open_val = getattr(a, "open", None) or getattr(a, "o", None)
                high_val = getattr(a, "high", None) or getattr(a, "h", None)
                low_val = getattr(a, "low", None) or getattr(a, "l", None)
                vol_val = getattr(a, "volume", None) or getattr(a, "v", None)

                results.append({
                    "date": ts.date(),
                    "timestamp": ts,
                    "day_open": float(open_val) if open_val is not None else None,
                    "day_high": float(high_val) if high_val is not None else None,
                    "day_low": float(low_val) if low_val is not None else None,
                    "close_price": float(close_val),
                    "volume": int(vol_val) if vol_val is not None else None,
                    "source": self.source_name,
                })
            except Exception as row_err:
                logger.warning(f"Polygon aggs row parse error for {ticker}: {row_err}")

        # Cache and return
        self._set_in_cache(cache_key, "historical_prices", results)
        return results
