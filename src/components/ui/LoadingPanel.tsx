"use client";

import { Panel } from "./Panel";

interface LoadingPanelProps {
  title: string;
}

export function LoadingPanel({ title }: LoadingPanelProps) {
  return (
    <Panel title={title}>
      <div className="flex items-center gap-2 py-8">
        <div className="h-2 w-2 animate-pulse rounded-full bg-hud-accent" />
        <span className="font-mono text-xs text-hud-text-dim">
          Loading data...
        </span>
      </div>
    </Panel>
  );
}
