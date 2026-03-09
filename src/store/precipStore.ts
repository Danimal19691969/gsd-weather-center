"use client";

import { create } from "zustand";
import type { PrecipType } from "@/lib/precip/precipClassifier";
import type { PrecipIntensity } from "@/lib/precip/precipIntensity";

export interface PrecipGridCell {
  lat: number;
  lon: number;
  hours: {
    precipitation: number;
    type: PrecipType;
    intensity: PrecipIntensity;
    color: string;
  }[];
}

interface PrecipState {
  grid: PrecipGridCell[] | null;
  loading: boolean;
  error: string | null;
  currentHour: number;
  playing: boolean;
  setGrid: (grid: PrecipGridCell[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setCurrentHour: (hour: number) => void;
  setPlaying: (v: boolean) => void;
}

export const usePrecipStore = create<PrecipState>((set) => ({
  grid: null,
  loading: false,
  error: null,
  currentHour: 0,
  playing: false,
  setGrid: (grid) => set({ grid, error: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
  setCurrentHour: (hour) => set({ currentHour: Math.max(0, Math.min(168, hour)) }),
  setPlaying: (v) => set({ playing: v }),
}));
