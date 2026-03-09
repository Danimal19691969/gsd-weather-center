export type PrecipIntensity = "none" | "light" | "moderate" | "heavy" | "extreme";

export function getPrecipIntensity(mmPerHour: number): PrecipIntensity {
  if (mmPerHour <= 0) return "none";
  if (mmPerHour <= 0.5) return "light";
  if (mmPerHour <= 2) return "moderate";
  if (mmPerHour <= 10) return "heavy";
  return "extreme";
}
