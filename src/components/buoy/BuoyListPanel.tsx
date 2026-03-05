"use client";

import { useLocation } from "@/lib/context/LocationContext";
import { useSelectedBuoy } from "@/lib/context/BuoyContext";
import { useUnits } from "@/lib/context/UnitsContext";
import { useNearbyBuoys } from "@/lib/hooks/useBuoys";
import { Panel } from "@/components/ui/Panel";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import { ErrorPanel } from "@/components/ui/ErrorPanel";

function milesToKm(mi: number): number {
  return mi / 0.621371;
}

export function BuoyListPanel() {
  const { lat, lon } = useLocation();
  const { data, isLoading } = useNearbyBuoys(lat, lon);
  const { selectedBuoyId, setSelectedBuoy } = useSelectedBuoy();
  const { units } = useUnits();
  const imperial = units === "imperial";

  if (isLoading) return <LoadingPanel title="Nearby Buoys" />;
  if (!data?.success)
    return (
      <ErrorPanel
        title="Nearby Buoys"
        message={!data ? "No data" : data.error}
      />
    );

  return (
    <Panel title="Nearby Buoys">
      <div className="max-h-64 overflow-y-auto">
        {data.data.length === 0 ? (
          <p className="py-4 text-center font-mono text-xs text-hud-text-dim">
            No buoys found within 200 miles
          </p>
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-hud-border text-left text-hud-text-dim">
                <th className="pb-1 pr-2">Station</th>
                <th className="pb-1 pr-2">Type</th>
                <th className="pb-1 text-right">Distance</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((buoy) => (
                <tr
                  key={buoy.id}
                  onClick={() => setSelectedBuoy(buoy.id)}
                  className={`cursor-pointer border-b border-hud-border/30 transition-colors hover:bg-hud-border/20 ${
                    selectedBuoyId === buoy.id
                      ? "bg-hud-accent/10 text-hud-accent"
                      : "text-hud-text"
                  }`}
                >
                  <td className="py-1.5 pr-2">
                    <div className="font-bold">{buoy.name}</div>
                    <div className="text-[10px] text-hud-text-dim">{buoy.id}</div>
                  </td>
                  <td className="py-1.5 pr-2 text-hud-text-dim">{buoy.type}</td>
                  <td className="py-1.5 text-right text-hud-text-dim">
                    {imperial ? buoy.distanceMiles : Math.round(milesToKm(buoy.distanceMiles))} {imperial ? "mi" : "km"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}
