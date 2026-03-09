"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePrecipStore } from "@/store/precipStore";
import { MAX_HOURS } from "@/lib/precip/ForecastTimeline";

const TICK_INTERVAL_MS = 500;

function formatHourLabel(hour: number): string {
  const days = Math.floor(hour / 24);
  const hrs = hour % 24;
  if (days === 0) return `${hrs}h`;
  return `${days}d ${hrs}h`;
}

export function ForecastTimelineUI() {
  const { currentHour, setCurrentHour, playing, setPlaying, grid } = usePrecipStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!playing) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      usePrecipStore.setState((state) => {
        const next = state.currentHour + 1;
        if (next > MAX_HOURS) {
          return { currentHour: 0 }; // loop
        }
        return { currentHour: next };
      });
    }, TICK_INTERVAL_MS);

    return clearTimer;
  }, [playing, clearTimer]);

  // Stop playing if grid is cleared
  useEffect(() => {
    if (!grid && playing) setPlaying(false);
  }, [grid, playing, setPlaying]);

  const maxHour = grid?.[0]?.hours
    ? Math.min(grid[0].hours.length - 1, MAX_HOURS)
    : MAX_HOURS;

  return (
    <div className="flex items-center gap-3 rounded bg-black/70 px-3 py-2 font-mono text-xs text-white backdrop-blur-sm">
      <button
        onClick={() => setPlaying(!playing)}
        className={`rounded border px-2 py-0.5 text-[10px] ${
          playing
            ? "border-hud-accent bg-hud-accent/20 text-hud-accent"
            : "border-hud-border text-hud-text-dim hover:border-hud-accent hover:text-hud-accent"
        }`}
        disabled={!grid}
      >
        {playing ? "Pause" : "Play"}
      </button>

      <input
        type="range"
        min={0}
        max={maxHour}
        value={currentHour}
        onChange={(e) => setCurrentHour(parseInt(e.target.value, 10))}
        className="h-1 w-32 cursor-pointer accent-hud-accent sm:w-48"
        disabled={!grid}
      />

      <span className="min-w-[4rem] text-[10px] text-hud-text-dim">
        {formatHourLabel(currentHour)}
      </span>

      {/* Time markers */}
      <div className="hidden items-center gap-2 text-[8px] text-hud-text-dim sm:flex">
        {[0, 24, 48, 72, 96, 120, 144, 168].map((h) => (
          <button
            key={h}
            onClick={() => setCurrentHour(h)}
            className="hover:text-hud-accent"
            disabled={!grid}
          >
            {h === 0 ? "Now" : `${h / 24}d`}
          </button>
        ))}
      </div>
    </div>
  );
}
