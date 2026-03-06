"use client";

import { useUnits } from "@/lib/context/UnitsContext";
import { cToF, mpsToMph } from "@/lib/units";
import { useWeatherStore } from "@/store/weatherStore";
import { Panel } from "@/components/ui/Panel";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import type { HourlyForecast } from "@/lib/types/weather";

function formatHour(timeStr: string): string {
  const date = new Date(timeStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
  });
}

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function HourCell({ hour, imperial }: { hour: HourlyForecast; imperial: boolean }) {
  const temp = imperial ? cToF(hour.temperature) : hour.temperature;
  const wind = imperial ? mpsToMph(hour.windSpeed) : hour.windSpeed;

  return (
    <div className="flex min-w-[60px] flex-col items-center rounded border border-hud-border bg-hud-bg px-2 py-2">
      <div className="font-mono text-[10px] text-hud-text-dim">
        {formatHour(hour.time)}
      </div>
      <div className="mt-1 font-mono text-sm font-bold text-hud-text">
        {Math.round(temp)}&deg;
      </div>
      {hour.precipitationProbability > 0 && (
        <div className="mt-0.5 font-mono text-[10px] text-blue-400">
          {hour.precipitationProbability}%
        </div>
      )}
      <div className="mt-0.5 font-mono text-[10px] text-hud-text-dim">
        {wind.toFixed(0)} {windDirectionLabel(hour.windDirection)}
      </div>
    </div>
  );
}

export function HourlyTimeline() {
  const { units } = useUnits();
  const imperial = units === "imperial";
  const weather = useWeatherStore((s) => s.weather);
  const loading = useWeatherStore((s) => s.loading);
  const error = useWeatherStore((s) => s.error);

  if (!weather && loading) return <LoadingPanel title="Hourly Forecast" />;
  if (!weather)
    return (
      <ErrorPanel
        title="Hourly Forecast"
        message={error ?? "No data"}
      />
    );

  return (
    <Panel title="48-Hour Forecast">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weather.hourly.map((hour) => (
          <HourCell key={hour.time} hour={hour} imperial={imperial} />
        ))}
      </div>
    </Panel>
  );
}
