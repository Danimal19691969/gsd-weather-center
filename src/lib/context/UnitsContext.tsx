"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type UnitSystem = "metric" | "imperial";

interface UnitsState {
  units: UnitSystem;
  toggleUnits: () => void;
}

const UnitsContext = createContext<UnitsState | null>(null);

const STORAGE_KEY = "gsd-units";

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UnitSystem>("metric");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "imperial") setUnits("imperial");
  }, []);

  const toggleUnits = useCallback(() => {
    setUnits((prev) => {
      const next = prev === "metric" ? "imperial" : "metric";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <UnitsContext.Provider value={{ units, toggleUnits }}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits(): UnitsState {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within UnitsProvider");
  return ctx;
}
