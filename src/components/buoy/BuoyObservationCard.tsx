"use client";

import { useSelectedBuoy } from "@/lib/context/BuoyContext";
import { useBuoyObservation } from "@/lib/hooks/useBuoys";
import { useUnits } from "@/lib/context/UnitsContext";
import { cToF, metersToFeet, mpsToMph } from "@/lib/units";
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

function fmtConv(v: number | null, convert: (n: number) => number, decimals = 1): string {
  if (v === null) return "—";
  return convert(v).toFixed(decimals);
}

export function BuoyObservationCard() {
  const { selectedBuoyId } = useSelectedBuoy();
  const { data, isLoading } = useBuoyObservation(selectedBuoyId);
  const { units } = useUnits();
  const imperial = units === "imperial";

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
          <StatBlock label="Height" value={imperial ? fmtConv(obs.waveHeight, metersToFeet) : val(obs.waveHeight)} unit={imperial ? "ft" : "m"} />
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
          <StatBlock label="Speed" value={imperial ? fmtConv(obs.windSpeed, mpsToMph) : val(obs.windSpeed)} unit={imperial ? "mph" : "m/s"} />
          <div className="mt-2">
            <StatBlock label="Gust" value={imperial ? fmtConv(obs.gustSpeed, mpsToMph) : val(obs.gustSpeed)} unit={imperial ? "mph" : "m/s"} />
          </div>
          <div className="mt-2">
            <StatBlock label="Direction" value={dirLabel(obs.windDirection)} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Atmosphere
          </h3>
          <StatBlock label="Air Temp" value={imperial ? fmtConv(obs.airTemp, cToF) : val(obs.airTemp)} unit={imperial ? "°F" : "°C"} />
          <div className="mt-2">
            <StatBlock label="Pressure" value={val(obs.pressure, 0)} unit="hPa" />
          </div>
          <div className="mt-2">
            <StatBlock label="Dewpoint" value={imperial ? fmtConv(obs.dewpoint, cToF) : val(obs.dewpoint)} unit={imperial ? "°F" : "°C"} />
          </div>
          <div className="mt-2">
            <StatBlock label="Visibility" value={val(obs.visibility)} unit="nmi" />
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hud-accent-dim">
            Ocean
          </h3>
          <StatBlock label="Water Temp" value={imperial ? fmtConv(obs.waterTemp, cToF) : val(obs.waterTemp)} unit={imperial ? "°F" : "°C"} />
        </div>
      </div>
    </Panel>
  );
}
