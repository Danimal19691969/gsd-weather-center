"use client";

import { useDailyForecast } from "@/lib/hooks/useWeather";
import { useUnits } from "@/lib/context/UnitsContext";
import { cToF } from "@/lib/units";
import { Panel } from "@/components/ui/Panel";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import type { DailyForecast } from "@/lib/types/weather";

function formatDay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function DayCard({ day, imperial }: { day: DailyForecast; imperial: boolean }) {
  const hi = imperial ? cToF(day.tempMax) : day.tempMax;
  const lo = imperial ? cToF(day.tempMin) : day.tempMin;

  return (
    <div className="flex flex-col items-center rounded border border-hud-border bg-hud-bg px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-hud-text-dim">
        {formatDay(day.date)}
      </div>
      <div className="mt-1 font-mono text-xs text-hud-accent">
        {day.description}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-lg font-bold text-hud-text">
          {Math.round(hi)}&deg;
        </span>
        <span className="font-mono text-sm text-hud-text-dim">
          {Math.round(lo)}&deg;
        </span>
      </div>
      {day.precipitationSum > 0 && (
        <div className="mt-1 font-mono text-[10px] text-blue-400">
          {day.precipitationSum.toFixed(1)} mm
        </div>
      )}
    </div>
  );
}

interface Props {
  lat: number;
  lon: number;
}

export function DailyForecastPanel({ lat, lon }: Props) {
  const { data, isLoading } = useDailyForecast(lat, lon);
  const { units } = useUnits();
  const imperial = units === "imperial";

  if (isLoading) return <LoadingPanel title="7-Day Forecast" />;
  if (!data?.success)
    return (
      <ErrorPanel
        title="7-Day Forecast"
        message={!data ? "No data" : data.error}
      />
    );

  return (
    <Panel title="7-Day Forecast">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {data.data.map((day) => (
          <DayCard key={day.date} day={day} imperial={imperial} />
        ))}
      </div>
    </Panel>
  );
}
