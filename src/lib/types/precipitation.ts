import type { PrecipType } from "@/lib/precip/precipClassifier";
import type { PrecipIntensity } from "@/lib/precip/precipIntensity";

export interface HourlyPrecipData {
  time: string;
  precipitation: number;
  rain: number;
  snowfall: number;
  showers: number;
  temperature: number;
  weatherCode: number;
  type: PrecipType;
  intensity: PrecipIntensity;
  color: string;
}
