"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface BuoySelectionState {
  selectedBuoyId: string | null;
  setSelectedBuoy: (id: string | null) => void;
}

const BuoyContext = createContext<BuoySelectionState | null>(null);

export function BuoyProvider({ children }: { children: ReactNode }) {
  const [selectedBuoyId, setId] = useState<string | null>(null);
  const setSelectedBuoy = useCallback((id: string | null) => setId(id), []);

  return (
    <BuoyContext.Provider value={{ selectedBuoyId, setSelectedBuoy }}>
      {children}
    </BuoyContext.Provider>
  );
}

export function useSelectedBuoy(): BuoySelectionState {
  const ctx = useContext(BuoyContext);
  if (!ctx) throw new Error("useSelectedBuoy must be used within BuoyProvider");
  return ctx;
}
