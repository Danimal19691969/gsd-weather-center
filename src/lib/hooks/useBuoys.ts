"use client";

import useSWR from "swr";
import type { ToolResult } from "@/lib/types/tool-result";
import type { BuoyStation } from "@/lib/types/buoy";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SWR_OPTIONS = {
  refreshInterval: 300_000,
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
