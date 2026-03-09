import type { IconIntensity } from "@/lib/weather/weatherIconMapper";

interface IconProps {
  size: number;
  className?: string;
}

const STROKE = "currentColor";
const SW = 1.5; // consistent stroke width

// --- Rain drops (1, 2, or 3 based on intensity) ---
function RainDrops({ size, count }: { size: number; count: number }) {
  const s = size;
  return (
    <g stroke={STROKE} strokeWidth={SW} strokeLinecap="round" fill="none">
      {/* Center drop always visible */}
      <line x1={s * 0.5} y1={s * 0.55} x2={s * 0.45} y2={s * 0.75} />
      {count >= 2 && (
        <line x1={s * 0.3} y1={s * 0.6} x2={s * 0.25} y2={s * 0.8} />
      )}
      {count >= 3 && (
        <line x1={s * 0.7} y1={s * 0.6} x2={s * 0.65} y2={s * 0.8} />
      )}
    </g>
  );
}

// --- Snowflake (simple asterisk) ---
function Snowflake({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g stroke={STROKE} strokeWidth={1.2} strokeLinecap="round">
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
      <line x1={cx - r * 0.87} y1={cy - r * 0.5} x2={cx + r * 0.87} y2={cy + r * 0.5} />
      <line x1={cx - r * 0.87} y1={cy + r * 0.5} x2={cx + r * 0.87} y2={cy - r * 0.5} />
    </g>
  );
}

// --- Cloud shape ---
function Cloud({ size, y = 0.15 }: { size: number; y?: number }) {
  const s = size;
  return (
    <path
      d={`M${s * 0.2} ${s * (0.45 + y)}
          Q${s * 0.2} ${s * (0.2 + y)} ${s * 0.4} ${s * (0.2 + y)}
          Q${s * 0.45} ${s * (0.1 + y)} ${s * 0.55} ${s * (0.15 + y)}
          Q${s * 0.7} ${s * (0.1 + y)} ${s * 0.75} ${s * (0.25 + y)}
          Q${s * 0.85} ${s * (0.25 + y)} ${s * 0.85} ${s * (0.35 + y)}
          Q${s * 0.85} ${s * (0.45 + y)} ${s * 0.75} ${s * (0.45 + y)}
          Z`}
      fill="none"
      stroke={STROKE}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
  );
}

// --- Individual icon components ---

export function ClearIcon({ size, className }: IconProps) {
  const s = size;
  const c = s / 2;
  const r = s * 0.2;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={STROKE} strokeWidth={SW} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={c + Math.cos(rad) * (r + 2)}
            y1={c + Math.sin(rad) * (r + 2)}
            x2={c + Math.cos(rad) * (r + s * 0.12)}
            y2={c + Math.sin(rad) * (r + s * 0.12)}
            stroke={STROKE}
            strokeWidth={SW}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function CloudyIcon({ size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <Cloud size={size} y={0.2} />
    </svg>
  );
}

export function FogIcon({ size, className }: IconProps) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      {[0.3, 0.45, 0.6, 0.75].map((y) => (
        <line
          key={y}
          x1={s * 0.2}
          y1={s * y}
          x2={s * 0.8}
          y2={s * y}
          stroke={STROKE}
          strokeWidth={SW}
          strokeLinecap="round"
          opacity={1 - (y - 0.3) * 0.8}
        />
      ))}
    </svg>
  );
}

export function RainIcon({ size, className, intensity }: IconProps & { intensity: IconIntensity }) {
  const count = intensity === "heavy" ? 3 : intensity === "moderate" ? 2 : 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <Cloud size={size} />
      <RainDrops size={size} count={count} />
    </svg>
  );
}

export function SnowIcon({ size, className, intensity }: IconProps & { intensity: IconIntensity }) {
  const s = size;
  const r = s * 0.08;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      <Cloud size={s} />
      <Snowflake cx={s * 0.5} cy={s * 0.65} r={r} />
      {(intensity === "moderate" || intensity === "heavy") && (
        <Snowflake cx={s * 0.3} cy={s * 0.75} r={r * 0.8} />
      )}
      {intensity === "heavy" && (
        <Snowflake cx={s * 0.7} cy={s * 0.72} r={r * 0.8} />
      )}
    </svg>
  );
}

export function SleetIcon({ size, className }: IconProps) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      <Cloud size={s} />
      {/* Rain drop */}
      <line x1={s * 0.35} y1={s * 0.55} x2={s * 0.3} y2={s * 0.72} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      {/* Snowflake */}
      <Snowflake cx={s * 0.65} cy={s * 0.65} r={s * 0.07} />
    </svg>
  );
}

export function FreezingRainIcon({ size, className }: IconProps) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      <Cloud size={s} />
      {/* Rain drop */}
      <line x1={s * 0.4} y1={s * 0.55} x2={s * 0.35} y2={s * 0.72} stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      {/* Ice crystal (small diamond) */}
      <path
        d={`M${s * 0.65} ${s * 0.58} L${s * 0.7} ${s * 0.65} L${s * 0.65} ${s * 0.72} L${s * 0.6} ${s * 0.65} Z`}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThunderstormIcon({ size, className }: IconProps) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      <Cloud size={s} />
      {/* Lightning bolt */}
      <path
        d={`M${s * 0.52} ${s * 0.45} L${s * 0.42} ${s * 0.62} L${s * 0.52} ${s * 0.62} L${s * 0.45} ${s * 0.82}`}
        fill="none"
        stroke={STROKE}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
