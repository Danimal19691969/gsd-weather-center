"use client";

import { useMarineWeather } from "@/lib/hooks/useWeather";
import { Panel } from "@/components/ui/Panel";
import { StatBlock } from "@/components/ui/StatBlock";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import { ErrorPanel } from "@/components/ui/ErrorPanel";

function dirLabel(deg: number | null): string {
  if (deg === null) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function val(v: number | null, decimals = 1): string {
  return v !== null ? v.toFixed(decimals) : "—";
}

interface Props {
  lat: number;
  lon: number;
}

export function MarinePanel({ lat, lon }: Props) {
  const { data, isLoading } = useMarineWeather(lat, lon);

  if (isLoading) return <LoadingPanel title="Marine Conditions" />;
  if (!data?.success)
    return (
      <ErrorPanel
        title="Marine Conditions"
        message={!data ? "No data" : data.error}
      />
    );

  const m = data.data;

  return (
    <Panel title="Marine Conditions">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Waves
          </h3>
          <StatBlock label="Height" value={val(m.waveHeight)} unit="m" />
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
          <StatBlock label="Height" value={val(m.swellHeight)} unit="m" />
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
          <StatBlock label="Height" value={val(m.windWaveHeight)} unit="m" />
          <div className="mt-2">
            <StatBlock label="Period" value={val(m.windWavePeriod)} unit="s" />
          </div>
          {m.seaSurfaceTemp !== null && (
            <div className="mt-2">
              <StatBlock label="SST" value={val(m.seaSurfaceTemp)} unit="°C" />
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
