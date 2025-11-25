// Security Search Hook with Debouncing and Price Hydration
import { useState, useCallback, useRef, useEffect } from 'react';
import { searchSecurities } from '@/utils/apimethods/positionMethods';

export default function useSecuritySearch({
  dispatch,
  positions = {},
  enabled = true,
  debounceMs = 300
}) {
  const searchTimeoutRef = useRef(null);
  const hydratingRef = useRef(new Set());

  // Debounced search
  const search = useCallback(async (positionId, query, assetType) => {
    if (!enabled || !query || query.length < 1) {
      dispatch?.({ type: 'SET_SEARCH_RESULTS', payload: { key: positionId, results: [] } });
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set searching state
    dispatch?.({ type: 'SET_SEARCHING', payload: { key: positionId, value: true } });

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchSecurities(query);

        // Filter based on asset type
        let filteredResults = results || [];
        if (assetType === 'security') {
          filteredResults = filteredResults.filter(r =>
            r.asset_type === 'security' || r.asset_type === 'index' || r.asset_type === 'stock' || r.asset_type === 'etf'
          );
        } else if (assetType === 'crypto') {
          filteredResults = filteredResults.filter(r => r.asset_type === 'crypto');
        }

        dispatch?.({
          type: 'SET_SEARCH_RESULTS',
          payload: { key: positionId, results: filteredResults }
        });
      } catch (error) {
        console.error('Search error:', error);
        dispatch?.({ type: 'SET_SEARCH_RESULTS', payload: { key: positionId, results: [] } });
      } finally {
        dispatch?.({ type: 'SET_SEARCHING', payload: { key: positionId, value: false } });
      }
    }, debounceMs);
  }, [dispatch, enabled, debounceMs]);

  // Select search result - updates position with name and price
  const selectResult = useCallback((assetType, positionId, result) => {
    const updates = {};

    if (assetType === 'security') {
      updates.ticker = result.ticker || result.symbol;
      updates.name = result.name;
      updates.price = result.price;
    } else if (assetType === 'crypto') {
      updates.symbol = result.symbol;
      updates.name = result.name;
      updates.current_price = result.price;
    }

    dispatch?.({
      type: 'UPDATE_POSITION',
      payload: { assetType, id: positionId, data: updates }
    });

    // Clear search results
    dispatch?.({ type: 'SET_SEARCH_RESULTS', payload: { key: positionId, results: [] } });
  }, [dispatch]);

  // Price hydration for positions with tickers but no prices
  const hydratePrice = useCallback(async (assetType, positionId, query) => {
    if (!enabled || !query || hydratingRef.current.has(positionId)) {
      return;
    }

    hydratingRef.current.add(positionId);

    try {
      const results = await searchSecurities(query);

      let filteredResults = results || [];
      if (assetType === 'security') {
        filteredResults = filteredResults.filter(r =>
          r.asset_type === 'security' || r.asset_type === 'index' || r.asset_type === 'stock' || r.asset_type === 'etf'
        );
      } else if (assetType === 'crypto') {
        filteredResults = filteredResults.filter(r => r.asset_type === 'crypto');
      }

      const match = filteredResults.find(r =>
        (r.ticker || r.symbol)?.toLowerCase() === query.toLowerCase()
      );

      if (match) {
        const updates = {};
        if (assetType === 'security') {
          updates.price = match.price;
          updates.name = match.name;
        } else if (assetType === 'crypto') {
          updates.current_price = match.price;
          updates.name = match.name;
        }

        dispatch?.({
          type: 'UPDATE_POSITION',
          payload: { assetType, id: positionId, data: updates }
        });
      }
    } catch (error) {
      console.error(`Failed to hydrate ${positionId}:`, error);
    } finally {
      hydratingRef.current.delete(positionId);
    }
  }, [dispatch, enabled]);

  // Batch hydration for positions needing prices
  const hydrateAllPending = useCallback(async () => {
    const toHydrate = [];

    Object.entries(positions).forEach(([assetType, typePositions]) => {
      if (assetType !== 'security' && assetType !== 'crypto') return;

      typePositions.forEach(pos => {
        if (pos.status === 'added' || pos.status === 'submitting') return;

        if (assetType === 'security' && pos.data.ticker && !pos.data.price) {
          toHydrate.push({ assetType, id: pos.id, query: pos.data.ticker });
        } else if (assetType === 'crypto' && pos.data.symbol && !pos.data.current_price) {
          toHydrate.push({ assetType, id: pos.id, query: pos.data.symbol });
        }
      });
    });

    if (toHydrate.length === 0) return;

    console.log(`Hydrating ${toHydrate.length} positions...`);

    // Process in batches to avoid overwhelming the API
    for (const item of toHydrate) {
      await hydratePrice(item.assetType, item.id, item.query);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [positions, hydratePrice]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    search,
    selectResult,
    hydratePrice,
    hydrateAllPending
  };
}
