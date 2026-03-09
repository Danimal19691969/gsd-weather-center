"use client";

import { WIND_COLOR_SCALE } from "@/lib/wind/colorScale";

export function WindLegend() {
  return (
    <div className="flex items-center gap-2 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-sm">
      <span className="text-hud-text-dim">Wind</span>
      {WIND_COLOR_SCALE.map((band) => (
        <div key={band.label} className="flex items-center gap-0.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: band.color }}
          />
          <span>{band.label}</span>
        </div>
      ))}
      <span className="text-hud-text-dim">m/s</span>
    </div>
  );
}
