"use client";

import { Panel } from "./Panel";

interface ErrorPanelProps {
  title: string;
  message: string;
}

export function ErrorPanel({ title, message }: ErrorPanelProps) {
  return (
    <Panel title={title}>
      <div className="py-4 font-mono text-xs text-hud-danger">{message}</div>
    </Panel>
  );
}
