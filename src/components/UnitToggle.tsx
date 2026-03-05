"use client";

import { useUnits } from "@/lib/context/UnitsContext";

export function UnitToggle() {
  const { units, toggleUnits } = useUnits();

  return (
    <button
      onClick={toggleUnits}
      className="rounded border border-hud-border bg-hud-panel px-3 py-1.5 font-mono text-xs text-hud-text-dim hover:border-hud-accent hover:text-hud-accent"
    >
      {units === "metric" ? "°C" : "°F"}
    </button>
  );
}
