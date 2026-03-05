"use client";

import { useCurrentWeather } from "@/lib/hooks/useWeather";
import { Panel } from "@/components/ui/Panel";
import { StatBlock } from "@/components/ui/StatBlock";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import { ErrorPanel } from "@/components/ui/ErrorPanel";

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

interface Props {
  lat: number;
  lon: number;
}

export function CurrentConditions({ lat, lon }: Props) {
  const { data, isLoading } = useCurrentWeather(lat, lon);

  if (isLoading) return <LoadingPanel title="Current Conditions" />;
  if (!data?.success)
    return (
      <ErrorPanel
        title="Current Conditions"
        message={!data ? "No data" : data.error}
      />
    );

  const w = data.data;

  return (
    <Panel title="Current Conditions">
      <div className="mb-4">
        <div className="font-mono text-5xl font-bold text-hud-text">
          {Math.round(w.temperature)}
          <span className="text-2xl text-hud-text-dim">&deg;C</span>
        </div>
        <div className="font-mono text-sm text-hud-accent">{w.description}</div>
        <div className="font-mono text-xs text-hud-text-dim">
          Feels like {Math.round(w.feelsLike)}&deg;C
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBlock label="Humidity" value={w.humidity} unit="%" />
        <StatBlock
          label="Wind"
          value={`${w.windSpeed.toFixed(1)} ${windDirectionLabel(w.windDirection)}`}
          unit="m/s"
        />
        <StatBlock label="Pressure" value={w.pressure.toFixed(1)} unit="hPa" />
        <StatBlock label="UV Index" value={w.uvIndex.toFixed(1)} />
        <StatBlock
          label="Visibility"
          value={(w.visibility / 1000).toFixed(1)}
          unit="km"
        />
        <StatBlock
          label="Precipitation"
          value={w.precipitation.toFixed(1)}
          unit="mm"
        />
      </div>
    </Panel>
  );
}
