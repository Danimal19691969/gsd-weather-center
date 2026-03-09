export interface ColorBand {
  label: string;
  color: string;
  min: number;
}

export const WIND_COLOR_SCALE: ColorBand[] = [
  { label: "Calm", color: "#2c7bb6", min: 0 },
  { label: "Light", color: "#00cc66", min: 2 },
  { label: "Moderate", color: "#ffe600", min: 5 },
  { label: "Strong", color: "#ff8c00", min: 10 },
  { label: "Very Strong", color: "#ff2a00", min: 18 },
];

export function speedToColor(speedMs: number): string {
  for (let i = WIND_COLOR_SCALE.length - 1; i >= 0; i--) {
    if (speedMs >= WIND_COLOR_SCALE[i].min) return WIND_COLOR_SCALE[i].color;
  }
  return WIND_COLOR_SCALE[0].color;
}
