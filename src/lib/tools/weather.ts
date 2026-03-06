import type { ToolResult } from "@/lib/types/tool-result";
import type {
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  MarineWeather,
} from "@/lib/types/weather";
import { cachedFetch } from "@/lib/cache";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const MARINE_BASE = "https://marine-api.open-meteo.com/v1";

function weatherCodeToDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 55) return "Drizzle";
  if (code <= 57) return "Freezing drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Freezing rain";
  if (code <= 75) return "Snow";
  if (code <= 77) return "Snow grains";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code <= 99) return "Thunderstorm with hail";
  return "Unknown";
}

// ---------------------------------------------------------------------------
// Combined fetch: current + hourly + daily in a single Open-Meteo request
// ---------------------------------------------------------------------------

export interface AllWeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export async function fetchAllWeather(
  lat: number,
  lon: number
): Promise<ToolResult<AllWeatherData>> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "surface_pressure",
        "uv_index",
        "visibility",
      ].join(","),
      hourly: [
        "temperature_2m",
        "precipitation_probability",
        "precipitation",
        "wind_speed_10m",
        "wind_direction_10m",
        "weather_code",
      ].join(","),
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "weather_code",
      ].join(","),
      forecast_hours: "48",
      forecast_days: "7",
      timezone: "auto",
    });

    const json = await cachedFetch(
      `weather:all:${lat}:${lon}`,
      async () => {
        const res = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`, {
          next: { revalidate: 600 },
        });
        if (!res.ok)
          throw new Error(`Open-Meteo returned ${res.status}: ${res.statusText}`);
        return res.json();
      }
    );

    const c = json.current;
    const current: CurrentWeather = {
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      pressure: c.surface_pressure,
      uvIndex: c.uv_index,
      visibility: c.visibility,
      weatherCode: c.weather_code,
      description: weatherCodeToDescription(c.weather_code),
      precipitation: c.precipitation,
      timestamp: c.time,
    };

    const h = json.hourly;
    const hourly: HourlyForecast[] = h.time.map(
      (time: string, i: number) => ({
        time,
        temperature: h.temperature_2m[i],
        precipitation: h.precipitation[i],
        precipitationProbability: h.precipitation_probability[i],
        windSpeed: h.wind_speed_10m[i],
        windDirection: h.wind_direction_10m[i],
        weatherCode: h.weather_code[i],
      })
    );

    const d = json.daily;
    const daily: DailyForecast[] = d.time.map(
      (date: string, i: number) => ({
        date,
        tempMax: d.temperature_2m_max[i],
        tempMin: d.temperature_2m_min[i],
        precipitationSum: d.precipitation_sum[i],
        weatherCode: d.weather_code[i],
        description: weatherCodeToDescription(d.weather_code[i]),
      })
    );

    return { success: true, data: { current, hourly, daily } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "open-meteo",
    };
  }
}

// ---------------------------------------------------------------------------
// Legacy per-tool functions (used by AI chat tool calls)
// ---------------------------------------------------------------------------

export async function getCurrentWeather(
  lat: number,
  lon: number
): Promise<ToolResult<CurrentWeather>> {
  const result = await fetchAllWeather(lat, lon);
  if (!result.success) return result;
  return { success: true, data: result.data.current };
}

export async function getForecast(
  lat: number,
  lon: number,
  type: "hourly" | "daily"
): Promise<ToolResult<HourlyForecast[] | DailyForecast[]>> {
  const result = await fetchAllWeather(lat, lon);
  if (!result.success) return result;
  return {
    success: true,
    data: type === "hourly" ? result.data.hourly : result.data.daily,
  };
}

export async function getMarineWeather(
  lat: number,
  lon: number
): Promise<ToolResult<MarineWeather>> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: [
        "wave_height",
        "wave_period",
        "wave_direction",
        "swell_wave_height",
        "swell_wave_period",
        "swell_wave_direction",
        "wind_wave_height",
        "wind_wave_period",
      ].join(","),
    });

    const json = await cachedFetch(
      `weather:marine:${lat}:${lon}`,
      async () => {
        const res = await fetch(`${MARINE_BASE}/marine?${params}`, {
          next: { revalidate: 600 },
        });
        if (!res.ok) throw new Error(`Open-Meteo Marine returned ${res.status}: ${res.statusText}`);
        return res.json();
      }
    );
    const c = json.current;

    return {
      success: true,
      data: {
        seaSurfaceTemp: null,
        waveHeight: c.wave_height ?? null,
        wavePeriod: c.wave_period ?? null,
        waveDirection: c.wave_direction ?? null,
        swellHeight: c.swell_wave_height ?? null,
        swellPeriod: c.swell_wave_period ?? null,
        swellDirection: c.swell_wave_direction ?? null,
        windWaveHeight: c.wind_wave_height ?? null,
        windWavePeriod: c.wind_wave_period ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "open-meteo-marine",
    };
  }
}
