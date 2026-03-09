"use client";

import { useUnits } from "@/lib/context/UnitsContext";

export function UnitToggle() {
  const { units, toggleUnits } = useUnits();
  const isMetric = units === "metric";

  return (
    <button
      onClick={toggleUnits}
      aria-label={`Switch to ${isMetric ? "imperial (°F)" : "metric (°C)"} units`}
      className="rounded border border-hud-border bg-hud-panel px-3 py-1.5 font-mono text-xs text-hud-text-dim hover:border-hud-accent hover:text-hud-accent"
    >
      {isMetric ? "°C" : "°F"}
    </button>
  );
}
