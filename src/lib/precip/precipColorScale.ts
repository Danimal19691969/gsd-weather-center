import type { PrecipType } from "./precipClassifier";
import type { PrecipIntensity } from "./precipIntensity";

type ColorMap = Record<"light" | "moderate" | "heavy", string>;

export const PRECIP_COLOR_SCALE: Record<Exclude<PrecipType, "none">, ColorMap> = {
  rain: {
    light: "#a6cee3",
    moderate: "#1f78b4",
    heavy: "#08306b",
  },
  snow: {
    light: "#b2e2e2",
    moderate: "#66c2a4",
    heavy: "#ffffff",
  },
  sleet: {
    light: "#cbc9e2",
    moderate: "#9e9ac8",
    heavy: "#54278f",
  },
  freezing_rain: {
    light: "#fbb4c4",
    moderate: "#e7298a",
    heavy: "#7a0177",
  },
};

export function precipToColor(type: PrecipType | "none", intensity: PrecipIntensity): string {
  if (type === "none" || intensity === "none") return "transparent";

  const scale = PRECIP_COLOR_SCALE[type as Exclude<PrecipType, "none">];
  if (!scale) return "transparent";

  // extreme uses same color as heavy
  const key = intensity === "extreme" ? "heavy" : intensity;
  return scale[key];
}
