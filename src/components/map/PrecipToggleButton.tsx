"use client";

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export function PrecipToggleButton({ enabled, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`rounded border px-3 py-1.5 font-mono text-xs ${
        enabled
          ? "border-blue-400 bg-blue-400/20 text-blue-400"
          : "border-hud-border bg-hud-panel text-hud-text-dim hover:border-blue-400 hover:text-blue-400"
      }`}
    >
      {enabled ? "Precip: ON" : "Precip: OFF"}
    </button>
  );
}
