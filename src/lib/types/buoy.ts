export interface BuoyStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: "buoy" | "land" | "ship";
  owner?: string;
}

export interface BuoyObservation {
  stationId: string;
  timestamp: string;
  waveHeight: number | null;
  wavePeriod: number | null;
  avgWavePeriod: number | null;
  meanWaveDirection: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  gustSpeed: number | null;
  waterTemp: number | null;
  airTemp: number | null;
  pressure: number | null;
  dewpoint: number | null;
  visibility: number | null;
}

export interface BuoyHistory {
  stationId: string;
  observations: BuoyObservation[];
}
