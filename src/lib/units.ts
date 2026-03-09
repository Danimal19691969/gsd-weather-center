import type { UnitSystem } from "@/lib/context/UnitsContext";

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fToC(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function mpsToMph(ms: number): number {
  return ms * 2.237;
}

export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function formatTemp(celsius: number, units: UnitSystem): string {
  const value = units === "imperial" ? cToF(celsius) : celsius;
  const symbol = units === "imperial" ? "°F" : "°C";
  return `${Math.round(value)}${symbol}`;
}

export function formatWindSpeed(kmh: number, units: UnitSystem): string {
  if (units === "imperial") {
    return `${kmhToMph(kmh).toFixed(1)} mph`;
  }
  return `${kmh.toFixed(1)} km/h`;
}
