"use client";

import { useCallback, useRef } from "react";
import { usePrecipStore } from "@/store/precipStore";

const DEBOUNCE_MS = 300;

interface FetchBounds {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
}

export function useLoadPrecipGrid() {
  const { setGrid, setLoading, setError } = usePrecipStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  const fetchGrid = useCallback(
    (bounds: FetchBounds) => {
      // Round bounds for cache key stability
      const key = [
        bounds.west.toFixed(1),
        bounds.south.toFixed(1),
        bounds.east.toFixed(1),
        bounds.north.toFixed(1),
        Math.round(bounds.zoom),
      ].join(",");

      if (key === lastKeyRef.current) return;

      // Debounce
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setLoading(true);
        console.log("[precip] PRECIP FETCH START key=" + key);

        // Send rounded bounds to match the cache key and reduce
        // server-side cache fragmentation.
        const params = new URLSearchParams({
          west: String(Math.floor(bounds.west * 10) / 10),
          south: String(Math.floor(bounds.south * 10) / 10),
          east: String(Math.ceil(bounds.east * 10) / 10),
          north: String(Math.ceil(bounds.north * 10) / 10),
          zoom: String(Math.round(bounds.zoom)),
        });

        fetch(`/api/precipitation/grid?${params}`)
          .then((res) => res.json())
          .then((json) => {
            if (json.ok && json.data) {
              // Only mark key as fetched on success — failed fetches must not
              // poison the key, otherwise retries are blocked.
              lastKeyRef.current = key;
              console.log(`[precip] PRECIP GRID LOADED cells=${json.data.length}`);
              setGrid(json.data);
            } else {
              console.log("[precip] PRECIP FETCH FAILED:", json.error);
              setError(json.error ?? "Failed to load precipitation grid");
            }
          })
          .catch((err) => {
            console.log("[precip] PRECIP FETCH ERROR:", err.message);
            setError(err.message);
          })
          .finally(() => setLoading(false));
      }, DEBOUNCE_MS);
    },
    [setGrid, setLoading, setError]
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { fetchGrid, clearTimer };
}
