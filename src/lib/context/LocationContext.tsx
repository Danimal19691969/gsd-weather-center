"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface LocationState {
  lat: number;
  lon: number;
  locationName: string;
  setLocation: (lat: number, lon: number, name: string) => void;
}

const LocationContext = createContext<LocationState | null>(null);

const DEFAULT_LAT = 45.5152;
const DEFAULT_LON = -122.6784;
const DEFAULT_NAME = "Portland, OR";

export function LocationProvider({ children }: { children: ReactNode }) {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [locationName, setLocationName] = useState(DEFAULT_NAME);

  const setLocation = useCallback((newLat: number, newLon: number, name: string) => {
    setLat(newLat);
    setLon(newLon);
    setLocationName(name);
  }, []);

  return (
    <LocationContext.Provider value={{ lat, lon, locationName, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
