"use client";

import { create } from "zustand";
import type {
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  MarineWeather,
} from "@/lib/types/weather";

export interface AllWeatherResponse {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  marine: MarineWeather | null;
}

interface WeatherState {
  weather: AllWeatherResponse | null;
  loading: boolean;
  error: string | null;
  setWeather: (data: AllWeatherResponse) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: null,
  loading: false,
  error: null,
  setWeather: (data) => set({ weather: data, error: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
}));
