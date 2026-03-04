import stationsData from "./buoy-stations.json";
import type { BuoyStation } from "@/lib/types/buoy";

export const buoyStations: BuoyStation[] = stationsData as BuoyStation[];
