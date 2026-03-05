"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useSelectedBuoy } from "@/lib/context/BuoyContext";
import { useBuoyHistory } from "@/lib/hooks/useBuoys";
import { Panel } from "@/components/ui/Panel";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import type { BuoyObservation } from "@/lib/types/buoy";

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
}

interface ChartData {
  time: string;
  value: number | null;
}

function prepareData(
  observations: BuoyObservation[],
  field: keyof BuoyObservation
): ChartData[] {
  return [...observations]
    .reverse()
    .map((obs) => ({
      time: formatTime(obs.timestamp),
      value: obs[field] as number | null,
    }))
    .filter((d) => d.value !== null);
}

interface MiniChartProps {
  title: string;
  data: ChartData[];
  unit: string;
  color: string;
}

function MiniChart({ title, data, unit, color }: MiniChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center font-mono text-[10px] text-hud-text-dim">
        No {title.toLowerCase()} data
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-hud-text-dim">
        {title} ({unit})
      </h4>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            interval="preserveStartEnd"
            stroke="#1e3a5f"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            width={35}
            stroke="#1e3a5f"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #1e3a5f",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "monospace",
              color: "#e2e8f0",
            }}
            formatter={(value: number) => [`${value.toFixed(1)} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BuoyHistoryChart() {
  const { selectedBuoyId } = useSelectedBuoy();
  const { data, isLoading } = useBuoyHistory(selectedBuoyId);

  if (!selectedBuoyId) {
    return (
      <Panel title="24-Hour History">
        <p className="py-8 text-center font-mono text-xs text-hud-text-dim">
          Select a buoy to view history
        </p>
      </Panel>
    );
  }

  if (isLoading) return <LoadingPanel title="24-Hour History" />;
  if (!data?.success) {
    return (
      <Panel title="24-Hour History">
        <p className="py-8 text-center font-mono text-xs text-hud-text-dim">
          No history available
        </p>
      </Panel>
    );
  }

  const obs = data.data;

  return (
    <Panel title="24-Hour History">
      <div className="grid gap-4 sm:grid-cols-2">
        <MiniChart
          title="Wave Height"
          data={prepareData(obs, "waveHeight")}
          unit="m"
          color="#06b6d4"
        />
        <MiniChart
          title="Water Temp"
          data={prepareData(obs, "waterTemp")}
          unit="°C"
          color="#22c55e"
        />
        <MiniChart
          title="Wind Speed"
          data={prepareData(obs, "windSpeed")}
          unit="m/s"
          color="#eab308"
        />
        <MiniChart
          title="Pressure"
          data={prepareData(obs, "pressure")}
          unit="hPa"
          color="#a78bfa"
        />
      </div>
    </Panel>
  );
}
