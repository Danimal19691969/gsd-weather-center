"use client";

import { useUnits } from "@/lib/context/UnitsContext";
import { cToF, kmhToMph, kmToMiles } from "@/lib/units";
import { useWeatherStore } from "@/store/weatherStore";
import { Panel } from "@/components/ui/Panel";
import { StatBlock } from "@/components/ui/StatBlock";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { WeatherIcon } from "./WeatherIcon";

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function CurrentConditions() {
  const { units } = useUnits();
  const imperial = units === "imperial";
  const weather = useWeatherStore((s) => s.weather);
  const loading = useWeatherStore((s) => s.loading);
  const error = useWeatherStore((s) => s.error);

  if (!weather && loading) return <LoadingPanel title="Current Conditions" />;
  if (!weather)
    return (
      <ErrorPanel
        title="Current Conditions"
        message={error ?? "No data"}
      />
    );

  const w = weather.current;
  const temp = imperial ? cToF(w.temperature) : w.temperature;
  const feelsLike = imperial ? cToF(w.feelsLike) : w.feelsLike;
  const wind = imperial ? kmhToMph(w.windSpeed) : w.windSpeed;
  const windUnit = imperial ? "mph" : "km/h";
  const vis = imperial ? kmToMiles(w.visibility / 1000) : w.visibility / 1000;
  const visUnit = imperial ? "mi" : "km";

  return (
    <Panel title="Current Conditions">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className="text-hud-text-dim">
            <WeatherIcon weatherCode={w.weatherCode} size="lg" />
          </span>
          <div>
            <div className="font-mono text-5xl font-bold text-hud-text">
              {Math.round(temp)}
              <span className="text-2xl text-hud-text-dim">&deg;{imperial ? "F" : "C"}</span>
            </div>
          </div>
        </div>
        <div className="font-mono text-sm text-hud-accent">{w.description}</div>
        <div className="font-mono text-xs text-hud-text-dim">
          Feels like {Math.round(feelsLike)}&deg;{imperial ? "F" : "C"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBlock label="Humidity" value={w.humidity} unit="%" />
        <StatBlock
          label="Wind"
          value={`${wind.toFixed(1)} ${windDirectionLabel(w.windDirection)}`}
          unit={windUnit}
        />
        <StatBlock label="Pressure" value={w.pressure.toFixed(1)} unit="hPa" />
        <StatBlock label="UV Index" value={w.uvIndex.toFixed(1)} />
        <StatBlock
          label="Visibility"
          value={vis.toFixed(1)}
          unit={visUnit}
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
