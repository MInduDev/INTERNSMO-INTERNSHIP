// src/hooks/useFetch.js
// Simple data‑fetch hook for the client side. It receives an async function returning the data.
// It handles loading, error, cancellation and returns the result.
import { useState, useEffect } from 'react';

export const useFetch = (apiCall, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiCall();
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, loading, error };
};
