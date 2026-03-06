"use client";

import { useUnits } from "@/lib/context/UnitsContext";
import { metersToFeet, cToF } from "@/lib/units";
import { useWeatherStore } from "@/store/weatherStore";
import { Panel } from "@/components/ui/Panel";
import { StatBlock } from "@/components/ui/StatBlock";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import { ErrorPanel } from "@/components/ui/ErrorPanel";

function dirLabel(deg: number | null): string {
  if (deg === null) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function fmtHeight(v: number | null, imperial: boolean): string {
  if (v === null) return "—";
  const converted = imperial ? metersToFeet(v) : v;
  return converted.toFixed(1);
}

function fmtTemp(v: number | null, imperial: boolean): string {
  if (v === null) return "—";
  const converted = imperial ? cToF(v) : v;
  return converted.toFixed(1);
}

function val(v: number | null, decimals = 1): string {
  return v !== null ? v.toFixed(decimals) : "—";
}

export function MarinePanel() {
  const { units } = useUnits();
  const imperial = units === "imperial";
  const heightUnit = imperial ? "ft" : "m";
  const tempUnit = imperial ? "°F" : "°C";
  const weather = useWeatherStore((s) => s.weather);
  const loading = useWeatherStore((s) => s.loading);
  const error = useWeatherStore((s) => s.error);

  if (!weather && loading) return <LoadingPanel title="Marine Conditions" />;
  if (!weather?.marine)
    return (
      <ErrorPanel
        title="Marine Conditions"
        message={error ?? "No data"}
      />
    );

  const m = weather.marine;

  return (
    <Panel title="Marine Conditions">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Waves
          </h3>
          <StatBlock label="Height" value={fmtHeight(m.waveHeight, imperial)} unit={heightUnit} />
          <div className="mt-2">
            <StatBlock label="Period" value={val(m.wavePeriod)} unit="s" />
          </div>
          <div className="mt-2">
            <StatBlock label="Direction" value={dirLabel(m.waveDirection)} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Swell
          </h3>
          <StatBlock label="Height" value={fmtHeight(m.swellHeight, imperial)} unit={heightUnit} />
          <div className="mt-2">
            <StatBlock label="Period" value={val(m.swellPeriod)} unit="s" />
          </div>
          <div className="mt-2">
            <StatBlock label="Direction" value={dirLabel(m.swellDirection)} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Wind Waves
          </h3>
          <StatBlock label="Height" value={fmtHeight(m.windWaveHeight, imperial)} unit={heightUnit} />
          <div className="mt-2">
            <StatBlock label="Period" value={val(m.windWavePeriod)} unit="s" />
          </div>
          {m.seaSurfaceTemp !== null && (
            <div className="mt-2">
              <StatBlock label="SST" value={fmtTemp(m.seaSurfaceTemp, imperial)} unit={tempUnit} />
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
