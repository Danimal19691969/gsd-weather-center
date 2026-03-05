"use client";

import { CurrentConditions } from "./weather/CurrentConditions";
import { DailyForecastPanel } from "./weather/DailyForecast";
import { HourlyTimeline } from "./weather/HourlyTimeline";
import { MarinePanel } from "./weather/MarinePanel";

// Default location: Portland, OR
const DEFAULT_LAT = 45.5152;
const DEFAULT_LON = -122.6784;

export function Dashboard() {
  const lat = DEFAULT_LAT;
  const lon = DEFAULT_LON;

  return (
    <div className="min-h-screen bg-hud-bg p-4">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-hud-accent">
            GSD WEATHER CENTER
          </h1>
          <p className="font-mono text-xs text-hud-text-dim">
            Portland, OR &mdash; {lat.toFixed(4)}, {lon.toFixed(4)}
          </p>
        </div>
        <div className="font-mono text-xs text-hud-text-dim">
          OPERATIONAL
          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-hud-success" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CurrentConditions lat={lat} lon={lon} />
        </div>
        <div className="lg:col-span-2">
          <DailyForecastPanel lat={lat} lon={lon} />
        </div>
      </div>

      <div className="mt-4">
        <HourlyTimeline lat={lat} lon={lon} />
      </div>

      <div className="mt-4">
        <MarinePanel lat={lat} lon={lon} />
      </div>
    </div>
  );
}
