"use client";

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export function WindToggleButton({ enabled, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`rounded border px-3 py-1.5 font-mono text-xs ${
        enabled
          ? "border-hud-accent bg-hud-accent/20 text-hud-accent"
          : "border-hud-border bg-hud-panel text-hud-text-dim hover:border-hud-accent hover:text-hud-accent"
      }`}
    >
      {enabled ? "Wind: ON" : "Wind: OFF"}
    </button>
  );
}
