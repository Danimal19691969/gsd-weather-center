"use client";

import { useSelectedBuoy } from "@/lib/context/BuoyContext";
import { useBuoyObservation } from "@/lib/hooks/useBuoys";
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

export function BuoyObservationCard() {
  const { selectedBuoyId } = useSelectedBuoy();
  const { data, isLoading } = useBuoyObservation(selectedBuoyId);

  if (!selectedBuoyId) {
    return (
      <Panel title="Buoy Observations">
        <p className="py-8 text-center font-mono text-xs text-hud-text-dim">
          Select a buoy to view observations
        </p>
      </Panel>
    );
  }

  if (isLoading) return <LoadingPanel title="Buoy Observations" />;
  if (!data?.success)
    return (
      <ErrorPanel
        title="Buoy Observations"
        message={!data ? "No data" : data.error}
      />
    );

  const obs = data.data;
  const time = new Date(obs.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Panel title={`Station ${obs.stationId}`}>
      <div className="mb-3 font-mono text-[10px] text-hud-text-dim">
        Last update: {time} UTC
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Waves
          </h3>
          <StatBlock label="Height" value={val(obs.waveHeight)} unit="m" />
          <div className="mt-2">
            <StatBlock label="Period" value={val(obs.wavePeriod)} unit="s" />
          </div>
          <div className="mt-2">
            <StatBlock label="Avg Period" value={val(obs.avgWavePeriod)} unit="s" />
          </div>
          <div className="mt-2">
            <StatBlock label="Direction" value={dirLabel(obs.meanWaveDirection)} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Wind
          </h3>
          <StatBlock label="Speed" value={val(obs.windSpeed)} unit="m/s" />
          <div className="mt-2">
            <StatBlock label="Gust" value={val(obs.gustSpeed)} unit="m/s" />
          </div>
          <div className="mt-2">
            <StatBlock label="Direction" value={dirLabel(obs.windDirection)} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Atmosphere
          </h3>
          <StatBlock label="Air Temp" value={val(obs.airTemp)} unit="°C" />
          <div className="mt-2">
            <StatBlock label="Pressure" value={val(obs.pressure, 0)} unit="hPa" />
          </div>
          <div className="mt-2">
            <StatBlock label="Dewpoint" value={val(obs.dewpoint)} unit="°C" />
          </div>
          <div className="mt-2">
            <StatBlock label="Visibility" value={val(obs.visibility)} unit="nmi" />
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Ocean
          </h3>
          <StatBlock label="Water Temp" value={val(obs.waterTemp)} unit="°C" />
        </div>
      </div>
    </Panel>
  );
}
