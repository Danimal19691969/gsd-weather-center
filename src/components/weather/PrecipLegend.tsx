"use client";

import { PRECIP_COLOR_SCALE } from "@/lib/precip/precipColorScale";
import { RainIcon, SnowIcon, SleetIcon, FreezingRainIcon } from "./icons/WeatherIcons";

const TYPE_LABELS: Record<string, string> = {
  rain: "Rain",
  snow: "Snow",
  sleet: "Sleet",
  freezing_rain: "Freezing Rain",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  rain: <RainIcon size={12} intensity="moderate" />,
  snow: <SnowIcon size={12} intensity="moderate" />,
  sleet: <SleetIcon size={12} />,
  freezing_rain: <FreezingRainIcon size={12} />,
};

const INTENSITY_LABELS = ["Light", "Moderate", "Heavy"] as const;
const INTENSITY_KEYS = ["light", "moderate", "heavy"] as const;

export function PrecipLegend() {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded bg-black/70 px-2 py-1.5 font-mono text-[10px] text-white backdrop-blur-sm">
      {Object.entries(PRECIP_COLOR_SCALE).map(([type, scale]) => (
        <div key={type} className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-hud-text-dim">
            {TYPE_ICONS[type]}
            {TYPE_LABELS[type]}
          </span>
          <div className="flex items-center gap-1">
            {INTENSITY_KEYS.map((key, i) => (
              <div key={key} className="flex items-center gap-0.5">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ backgroundColor: scale[key] }}
                />
                <span className="text-[8px]">{INTENSITY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
