"use client";

import { useState, useCallback } from "react";
import Map, { NavigationControl, type ViewStateChangeEvent } from "react-map-gl";
import { useLocation } from "@/lib/context/LocationContext";
import { Panel } from "@/components/ui/Panel";
import { BuoyMarkers } from "./BuoyMarkers";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function WeatherMap() {
  const { lat, lon } = useLocation();
  const [viewState, setViewState] = useState({
    longitude: lon,
    latitude: lat,
    zoom: 8,
  });

  const onMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  // Re-center when location changes
  const [prevLat, setPrevLat] = useState(lat);
  const [prevLon, setPrevLon] = useState(lon);
  if (lat !== prevLat || lon !== prevLon) {
    setPrevLat(lat);
    setPrevLon(lon);
    setViewState((v) => ({ ...v, latitude: lat, longitude: lon }));
  }

  if (!MAPBOX_TOKEN) {
    return (
      <Panel title="Tactical Map">
        <div className="flex h-64 items-center justify-center text-hud-text-dim font-mono text-xs">
          Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Tactical Map">
      <div className="h-72 overflow-hidden rounded">
        <Map
          {...viewState}
          onMove={onMove}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          interactiveLayerIds={["buoy-markers", "buoy-clusters"]}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <BuoyMarkers />
        </Map>
      </div>
    </Panel>
  );
}
