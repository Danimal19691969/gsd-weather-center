"use client";

import useSWR from "swr";
import type { ToolResult } from "@/lib/types/tool-result";
import type { BuoyStation, BuoyObservation } from "@/lib/types/buoy";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

const SWR_OPTIONS = {
  refreshInterval: 300_000,
  dedupingInterval: 300_000,
  revalidateOnFocus: false,
  keepPreviousData: true,
};

export function useNearbyBuoys(lat: number, lon: number, radius: number = 200) {
  return useSWR<ToolResult<(BuoyStation & { distanceMiles: number })[]>>(
    `/api/buoys?tool=nearby&lat=${lat}&lon=${lon}&radius=${radius}`,
    fetcher,
    SWR_OPTIONS
  );
}

export function useBuoyObservation(stationId: string | null) {
  return useSWR<ToolResult<BuoyObservation>>(
    stationId ? `/api/buoys?tool=observations&stationId=${stationId}` : null,
    fetcher,
    SWR_OPTIONS
  );
}

export function useBuoyHistory(stationId: string | null) {
  return useSWR<ToolResult<BuoyObservation[]>>(
    stationId ? `/api/buoys?tool=history&stationId=${stationId}` : null,
    fetcher,
    SWR_OPTIONS
  );
}
