"use client";

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <div
      className={`rounded-lg border border-hud-border bg-hud-panel p-4 ${className}`}
    >
      <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-hud-accent">
        {title}
      </h2>
      {children}
    </div>
  );
}
