"use client";

import { useEffect, useRef } from "react";
import { useWeatherStore } from "@/store/weatherStore";

// Match the server cache TTL — no point refreshing more often
const REFRESH_INTERVAL = 600_000; // 10 minutes

export function useLoadWeather(lat: number, lon: number) {
  const setWeather = useWeatherStore((s) => s.setWeather);
  const setLoading = useWeatherStore((s) => s.setLoading);
  const setError = useWeatherStore((s) => s.setError);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const hasExistingData = !!useWeatherStore.getState().weather;

      // Only show loading spinner on initial load, not refreshes
      if (!hasExistingData) setLoading(true);

      try {
        const res = await fetch(`/api/weather?tool=all&lat=${lat}&lon=${lon}`);
        const json = await res.json();
        if (cancelled) return;

        // Accept both ok:true and success:true (ok is the new format)
        if (json.ok || json.success) {
          setWeather(json.data);
          setError(null);
        } else {
          // If we already have data, keep showing it (stale > empty)
          if (!hasExistingData) {
            setError(json.error ?? "Weather data temporarily unavailable");
          }
          // Don't overwrite existing data with an error
        }
      } catch {
        // Network error — keep existing data if we have it
        if (!cancelled && !hasExistingData) {
          setError("Weather request failed");
        }
      }
      if (!cancelled) setLoading(false);
    }

    load();
    intervalRef.current = setInterval(load, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [lat, lon, setWeather, setLoading, setError]);
}
