"use client";

import useSWR from "swr";
import type { ToolResult } from "@/lib/types/tool-result";
import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  MarineWeather,
} from "@/lib/types/weather";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SWR_OPTIONS = {
  refreshInterval: 300_000, // 5 minutes
  revalidateOnFocus: false,
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
