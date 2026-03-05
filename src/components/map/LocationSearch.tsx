"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "@/lib/context/LocationContext";
import type { ToolResult } from "@/lib/types/tool-result";
import type { GeocodingResult } from "@/lib/types/location";

export function LocationSearch() {
  const { setLocation } = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/location?q=${encodeURIComponent(q)}`);
      const data: ToolResult<GeocodingResult[]> = await res.json();
      if (data.success) {
        setResults(data.data);
        setIsOpen(data.data.length > 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onInput = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  };

  const onSelect = (result: GeocodingResult) => {
    setLocation(result.coordinates.lat, result.coordinates.lon, result.placeName);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        type="text"
        value={query}
        onChange={(e) => onInput(e.target.value)}
        placeholder="Search location..."
        className="w-full rounded border border-hud-border bg-hud-panel px-3 py-1.5 font-mono text-xs text-hud-text placeholder:text-hud-text-dim focus:border-hud-accent focus:outline-none"
      />
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="h-3 w-3 animate-spin rounded-full border border-hud-accent border-t-transparent" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded border border-hud-border bg-hud-panel shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => onSelect(r)}
                className="w-full px-3 py-2 text-left font-mono text-xs text-hud-text hover:bg-hud-border/30"
              >
                {r.placeName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
