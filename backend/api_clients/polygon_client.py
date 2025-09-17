"""
Polygon market data client using official SDK + REST.
- Full-market snapshots (SDK) for prices, filtered to our tickers.
- Reference tickers (REST v3) to backfill new tickers into 'securities'.

Docs:
- Full market snapshot: /v2/snapshot/locale/us/markets/stocks/tickers
- List tickers (v3):    /v3/reference/tickers
"""
import os
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Iterable

import requests
from polygon import RESTClient
from polygon.rest.models import TickerSnapshot

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
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("POLYGON_API_KEY")
        if not self.api_key:
            raise RuntimeError("POLYGON_API_KEY not set")
        self.client = RESTClient(self.api_key)
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})
        self.base_v3 = "https://api.polygon.io/v3"

    @property
    def source_name(self) -> str:
        return "polygon"

    @property
    def daily_call_limit(self) -> Optional[int]:
        return None

    # ---------- PRICES (snapshots) ----------

    def _pick_price_and_ts(self, snap: TickerSnapshot) -> (Optional[float], Optional[datetime]):
        """
        Preference:
          1) last_trade.price / timestamp
          2) mid(last_quote.bid_price, last_quote.ask_price) / timestamp
          3) minute.close or day.close / timestamp
          4) updated
        """
        price, ts = None, None

        lt = getattr(snap, "last_trade", None)
        if lt:
            p = getattr(lt, "price", None) or getattr(lt, "p", None)
            if p is not None:
                price = float(p)
                ts = (getattr(lt, "sip_timestamp", None)
                      or getattr(lt, "participant_timestamp", None)
                      or getattr(lt, "t", None))

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

        if price is None:
            # try minute/day/prev_day bars
            for bar_attr in ("min", "minute", "day", "prev_day"):
                bar = getattr(snap, bar_attr, None)
                if bar:
                    close = getattr(bar, "close", None) or getattr(bar, "c", None)
                    if close is not None:
                        price = float(close)
                        ts = getattr(bar, "timestamp", None) or getattr(bar, "t", None)
                        break

        if ts is None:
            ts = getattr(snap, "updated", None)

        return price, _to_dt(ts)

    async def get_snapshots_for(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Return {ticker: {price, timestamp, source}} for the given tickers.
        If SDK supports 'tickers=' parameter on get_snapshot_all, we try it;
        else we iterate full market and locally filter.
        """
        if not tickers:
            return {}
        want = set(t.upper() for t in tickers)
        out: Dict[str, Dict[str, Any]] = {}
        loop = asyncio.get_event_loop()

        def _fetch_snapshots() -> Iterable[TickerSnapshot]:
            try:
                # Try narrow snapshot (if SDK supports it); else fallback to full
                return self.client.get_snapshot_all("stocks", tickers=",".join(list(want)[:900]))
            except TypeError:
                # Older SDKs don’t have 'tickers' arg — stream full market
                return self.client.get_snapshot_all("stocks")

        try:
            # Materialize in a worker thread (SDK is blocking)
            snaps = await loop.run_in_executor(None, lambda: list(_fetch_snapshots()))
        except Exception as e:
            logger.error(f"Polygon get_snapshot_all failed: {e}")
            return {}

        for s in snaps:
            t = getattr(s, "ticker", None)
            if not t or t.upper() not in want:
                continue
            price, dt = self._pick_price_and_ts(s)
            if price is None:
                continue
            out[t.upper()] = {
                "price": price,
                "timestamp": dt or datetime.now(timezone.utc),
                "source": self.source_name,
            }
        return out

    # ---------- REFERENCE TICKERS (v3) ----------

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
        """
        params = {
            "apiKey": self.api_key,
            "market": market,
            "active": "true" if active_only else "false",
            "limit": limit,
        }
        # Polygon v3 supports 'type' filter; if multiple, call multiple times
        type_sets = types or [None]
        out: List[Dict[str, Any]] = []
        loop = asyncio.get_event_loop()

        def _fetch_page(url: str, q: Dict[str, Any]) -> Dict[str, Any]:
            r = self.session.get(url, params=q, timeout=30)
            r.raise_for_status()
            return r.json()

        for t in type_sets:
            page = 0
            params_local = dict(params)
            if t:
                params_local["type"] = t
            url = f"{self.base_v3}/reference/tickers"
            next_url = url
            while next_url:
                page += 1
                try:
                    data = await loop.run_in_executor(None, lambda: _fetch_page(next_url, params_local if next_url == url else {}))
                except Exception as e:
                    logger.error(f"Polygon v3 reference page fetch failed (type={t}, page={page}): {e}")
                    break

                results = data.get("results") or []
                for row in results:
                    # Normalize minimal fields we care about
                    out.append({
                        "ticker": row.get("ticker"),
                        "name": row.get("name"),
                        "type": row.get("type"),
                        "active": row.get("active"),
                        "locale": row.get("locale"),
                        "market": row.get("market"),
                    })

                next_url = data.get("next_url")
                if max_pages and page >= max_pages:
                    break
        return out
