"use client";

import { useState, useCallback } from "react";
import { Source, Layer, Popup, type MapLayerMouseEvent, type LayerProps } from "react-map-gl";
import { useLocation } from "@/lib/context/LocationContext";
import { useNearbyBuoys } from "@/lib/hooks/useBuoys";
import type { BuoyStation } from "@/lib/types/buoy";
import type { GeoJSON } from "geojson";

interface BuoyWithDistance extends BuoyStation {
  distanceMiles: number;
}

function toGeoJSON(buoys: BuoyWithDistance[]): GeoJSON {
  return {
    type: "FeatureCollection",
    features: buoys.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.lon, b.lat] },
      properties: {
        id: b.id,
        name: b.name,
        type: b.type,
        distanceMiles: b.distanceMiles,
      },
    })),
  };
}

const clusterLayer: LayerProps = {
  id: "buoy-clusters",
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#0e7490",
    "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 30, 25] as unknown as number,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#06b6d4",
  },
};

const clusterCountLayer: LayerProps = {
  id: "buoy-cluster-count",
  type: "symbol",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 11,
  },
  paint: {
    "text-color": "#e2e8f0",
  },
};

const markerLayer: LayerProps = {
  id: "buoy-markers",
  type: "circle",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#06b6d4",
    "circle-radius": 5,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#0e7490",
  },
};

interface PopupInfo {
  lon: number;
  lat: number;
  name: string;
  id: string;
  type: string;
  distanceMiles: number;
}

export function BuoyMarkers() {
  const { lat, lon } = useLocation();
  const { data } = useNearbyBuoys(lat, lon);
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || !feature.properties) return;

    if (feature.properties.cluster) return;

    const coords = (feature.geometry as unknown as { coordinates: [number, number] }).coordinates;
    setPopup({
      lon: coords[0],
      lat: coords[1],
      name: feature.properties.name,
      id: feature.properties.id,
      type: feature.properties.type,
      distanceMiles: feature.properties.distanceMiles,
    });
  }, []);

  if (!data?.success || data.data.length === 0) return null;

  return (
    <>
      <Source
        id="buoys"
        type="geojson"
        data={toGeoJSON(data.data)}
        cluster
        clusterMaxZoom={12}
        clusterRadius={40}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...markerLayer} />
      </Source>

      {popup && (
        <Popup
          longitude={popup.lon}
          latitude={popup.lat}
          anchor="bottom"
          onClose={() => setPopup(null)}
          closeButton={false}
          className="buoy-popup"
        >
          <div className="rounded bg-hud-panel p-2 font-mono text-xs text-hud-text">
            <div className="font-bold text-hud-accent">{popup.name}</div>
            <div className="mt-1 text-hud-text-dim">
              Station {popup.id} &middot; {popup.type}
            </div>
            <div className="text-hud-text-dim">
              {popup.distanceMiles} mi away
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
