"use client";

interface StatBlockProps {
  label: string;
  value: string | number;
  unit?: string;
}

export function StatBlock({ label, value, unit }: StatBlockProps) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-hud-text-dim">
        {label}
      </div>
      <div className="font-mono text-lg font-bold text-hud-text">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-hud-text-dim">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
