"use client";

import useSWR from "swr";
import type { ToolResult } from "@/lib/types/tool-result";
import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  MarineWeather,
} from "@/lib/types/weather";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

const SWR_OPTIONS = {
  refreshInterval: 0, // disabled — useLoadWeather handles refresh
  dedupingInterval: 600_000, // 10 minutes
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  keepPreviousData: true,
};

export function useCurrentWeather(lat: number, lon: number) {
  return useSWR<ToolResult<CurrentWeather>>(
    `/api/weather?tool=current&lat=${lat}&lon=${lon}`,
    fetcher,
    SWR_OPTIONS
  );
}

export function useDailyForecast(lat: number, lon: number) {
  return useSWR<ToolResult<DailyForecast[]>>(
    `/api/weather?tool=forecast&lat=${lat}&lon=${lon}&type=daily`,
    fetcher,
    SWR_OPTIONS
  );
}

export function useHourlyForecast(lat: number, lon: number) {
  return useSWR<ToolResult<HourlyForecast[]>>(
    `/api/weather?tool=forecast&lat=${lat}&lon=${lon}&type=hourly`,
    fetcher,
    SWR_OPTIONS
  );
}

export function useMarineWeather(lat: number, lon: number) {
  return useSWR<ToolResult<MarineWeather>>(
    `/api/weather?tool=marine&lat=${lat}&lon=${lon}`,
    fetcher,
    SWR_OPTIONS
  );
}

// ---------------------------------------------------------------------------
// Unified hook — fetches all weather data once, distributes to panels
// ---------------------------------------------------------------------------

export interface WeatherBundle {
  current: ToolResult<CurrentWeather> | undefined;
  hourly: ToolResult<HourlyForecast[]> | undefined;
  daily: ToolResult<DailyForecast[]> | undefined;
  marine: ToolResult<MarineWeather> | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export function useWeather(lat: number, lon: number): WeatherBundle {
  const current = useSWR<ToolResult<CurrentWeather>>(
    `/api/weather?tool=current&lat=${lat}&lon=${lon}`,
    fetcher,
    SWR_OPTIONS
  );

  const hourly = useSWR<ToolResult<HourlyForecast[]>>(
    `/api/weather?tool=forecast&lat=${lat}&lon=${lon}&type=hourly`,
    fetcher,
    SWR_OPTIONS
  );

  const daily = useSWR<ToolResult<DailyForecast[]>>(
    `/api/weather?tool=forecast&lat=${lat}&lon=${lon}&type=daily`,
    fetcher,
    SWR_OPTIONS
  );

  const marine = useSWR<ToolResult<MarineWeather>>(
    `/api/weather?tool=marine&lat=${lat}&lon=${lon}`,
    fetcher,
    SWR_OPTIONS
  );

  return {
    current: current.data,
    hourly: hourly.data,
    daily: daily.data,
    marine: marine.data,
    isLoading:
      current.isLoading || hourly.isLoading || daily.isLoading || marine.isLoading,
    error: current.error || hourly.error || daily.error || marine.error,
  };
}
