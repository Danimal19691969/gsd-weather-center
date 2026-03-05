"use client";

import { LocationProvider, useLocation } from "@/lib/context/LocationContext";
import { BuoyProvider } from "@/lib/context/BuoyContext";
import { WeatherMap } from "./map/WeatherMap";
import { LocationSearch } from "./map/LocationSearch";
import { GeolocationButton } from "./map/GeolocationButton";
import { CurrentConditions } from "./weather/CurrentConditions";
import { DailyForecastPanel } from "./weather/DailyForecast";
import { HourlyTimeline } from "./weather/HourlyTimeline";
import { MarinePanel } from "./weather/MarinePanel";
import { BuoyListPanel } from "./buoy/BuoyListPanel";
import { BuoyObservationCard } from "./buoy/BuoyObservationCard";
import { BuoyHistoryChart } from "./buoy/BuoyHistoryChart";
import { ChatPanel } from "./chat/ChatPanel";
import { UnitToggle } from "./UnitToggle";

function DashboardContent() {
  const { lat, lon, locationName } = useLocation();

  return (
    <div className="min-h-screen bg-hud-bg p-4">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-hud-accent">
            GSD WEATHER CENTER
          </h1>
          <p className="font-mono text-xs text-hud-text-dim">
            {locationName} &mdash; {lat.toFixed(4)}, {lon.toFixed(4)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LocationSearch />
          <GeolocationButton />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <UnitToggle />
          <div className="font-mono text-xs text-hud-text-dim">
            OPERATIONAL
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-hud-success" />
          </div>
        </div>
      </header>

      <div className="mb-4">
        <WeatherMap />
      </div>

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

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <BuoyListPanel />
        </div>
        <div className="lg:col-span-2">
          <BuoyObservationCard />
        </div>
      </div>

      <div className="mt-4">
        <BuoyHistoryChart />
      </div>

      <div className="mt-4">
        <ChatPanel />
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <LocationProvider>
      <BuoyProvider>
        <DashboardContent />
      </BuoyProvider>
    </LocationProvider>
  );
}
