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
        lastKeyRef.current = key;
        setLoading(true);

        const params = new URLSearchParams({
          west: String(bounds.west),
          south: String(bounds.south),
          east: String(bounds.east),
          north: String(bounds.north),
          zoom: String(Math.round(bounds.zoom)),
        });

        fetch(`/api/precipitation/grid?${params}`)
          .then((res) => res.json())
          .then((json) => {
            if (json.ok && json.data) {
              setGrid(json.data);
            } else {
              setError(json.error ?? "Failed to load precipitation grid");
            }
          })
          .catch((err) => setError(err.message))
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
