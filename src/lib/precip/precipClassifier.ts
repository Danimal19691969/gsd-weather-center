export type PrecipType = "rain" | "snow" | "sleet" | "freezing_rain" | "none";

export interface PrecipInput {
  temp: number;        // °C
  precipitation: number; // mm
  snowfall: number;    // mm
  rain: number;        // mm
}

export function classifyPrecipType(data: PrecipInput): PrecipType {
  if (data.precipitation <= 0 && data.snowfall <= 0 && data.rain <= 0) {
    return "none";
  }

  // Sleet: near freezing (0–1°C) with both rain and snowfall signals
  if (data.temp > 0 && data.temp <= 1 && data.snowfall > 0 && data.rain > 0) {
    return "sleet";
  }

  // Freezing rain: below freezing but rain detected (not snowfall)
  if (data.temp < 0 && data.rain > 0 && data.snowfall <= 0) {
    return "freezing_rain";
  }

  // Snow: explicit snowfall or below/at freezing with precipitation
  if (data.snowfall > 0) {
    return "snow";
  }
  if (data.temp <= 0 && data.precipitation > 0) {
    return "snow";
  }

  // Rain: above freezing with precipitation
  if (data.temp > 1 && data.precipitation > 0) {
    return "rain";
  }

  return "none";
}
