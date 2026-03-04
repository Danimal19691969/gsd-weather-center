import type { ToolResult } from "@/lib/types/tool-result";
import type {
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  MarineWeather,
} from "@/lib/types/weather";

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

export async function getCurrentWeather(
  lat: number,
  lon: number
): Promise<ToolResult<CurrentWeather>> {
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
      timezone: "auto",
    });

    const res = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`);
    if (!res.ok) {
      return {
        success: false,
        error: `Open-Meteo returned ${res.status}: ${res.statusText}`,
        source: "open-meteo",
      };
    }

    const json = await res.json();
    const c = json.current;

    return {
      success: true,
      data: {
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
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "open-meteo",
    };
  }
}

export async function getForecast(
  lat: number,
  lon: number,
  type: "hourly" | "daily"
): Promise<ToolResult<HourlyForecast[] | DailyForecast[]>> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      timezone: "auto",
    });

    if (type === "hourly") {
      params.set(
        "hourly",
        [
          "temperature_2m",
          "precipitation_probability",
          "precipitation",
          "wind_speed_10m",
          "wind_direction_10m",
          "weather_code",
        ].join(",")
      );
      params.set("forecast_hours", "48");
    } else {
      params.set(
        "daily",
        [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "weather_code",
        ].join(",")
      );
      params.set("forecast_days", "7");
    }

    const res = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`);
    if (!res.ok) {
      return {
        success: false,
        error: `Open-Meteo returned ${res.status}: ${res.statusText}`,
        source: "open-meteo",
      };
    }

    const json = await res.json();

    if (type === "hourly") {
      const h = json.hourly;
      const data: HourlyForecast[] = h.time.map(
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
      return { success: true, data };
    } else {
      const d = json.daily;
      const data: DailyForecast[] = d.time.map(
        (date: string, i: number) => ({
          date,
          tempMax: d.temperature_2m_max[i],
          tempMin: d.temperature_2m_min[i],
          precipitationSum: d.precipitation_sum[i],
          weatherCode: d.weather_code[i],
          description: weatherCodeToDescription(d.weather_code[i]),
        })
      );
      return { success: true, data };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "open-meteo",
    };
  }
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

    const res = await fetch(`${MARINE_BASE}/marine?${params}`);
    if (!res.ok) {
      return {
        success: false,
        error: `Open-Meteo Marine returned ${res.status}: ${res.statusText}`,
        source: "open-meteo-marine",
      };
    }

    const json = await res.json();
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
