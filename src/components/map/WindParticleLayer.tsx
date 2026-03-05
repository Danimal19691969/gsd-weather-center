"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl";
import { WindField } from "@/lib/wind/WindField";
import { WindParticleSystem } from "@/lib/wind/WindParticleSystem";
import type { WindGrid } from "@/lib/types/wind";

interface Props {
  enabled: boolean;
}

interface WindGridJSON {
  west: number;
  south: number;
  east: number;
  north: number;
  cols: number;
  rows: number;
  dx: number;
  dy: number;
  u: number[];
  v: number[];
  speed: number[];
  timestamp: number;
}

export function WindParticleLayer({ enabled }: Props) {
  const { current: map } = useMap();
  const systemRef = useRef<WindParticleSystem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Create overlay canvas and particle system
  useEffect(() => {
    if (!map) return;
    const mapCanvas = map.getCanvas();
    const container = mapCanvas.parentElement;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.width = mapCanvas.width;
    canvas.height = mapCanvas.height;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const system = new WindParticleSystem(canvas);
    systemRef.current = system;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = mapCanvas.width;
      canvas.height = mapCanvas.height;
      system.resize(canvas.width, canvas.height);
    });
    resizeObserver.observe(mapCanvas);

    return () => {
      system.destroy();
      canvas.remove();
      canvasRef.current = null;
      systemRef.current = null;
      resizeObserver.disconnect();
    };
  }, [map]);

  // Fetch wind data and refresh every 10s + on moveend
  useEffect(() => {
    if (!enabled || !map) return;

    let cancelled = false;

    async function fetchAndUpdate() {
      if (!map) return;
      const bounds = map.getBounds();
      if (!bounds) return;

      try {
        const res = await fetch(
          `/api/wind?west=${bounds.getWest()}&south=${bounds.getSouth()}&east=${bounds.getEast()}&north=${bounds.getNorth()}`
        );
        const json = await res.json();
        if (cancelled || !json.success) return;

        const data: WindGridJSON = json.data;
        const grid: WindGrid = {
          ...data,
          u: new Float32Array(data.u),
          v: new Float32Array(data.v),
          speed: new Float32Array(data.speed),
        };
        const field = new WindField(grid);
        systemRef.current?.setField(field);
      } catch {
        // Silently fail — wind is a nice-to-have overlay
      }
    }

    fetchAndUpdate();
    const interval = setInterval(fetchAndUpdate, 10_000);

    const onMoveEnd = () => fetchAndUpdate();
    map.on("moveend", onMoveEnd);

    return () => {
      cancelled = true;
      clearInterval(interval);
      map.off("moveend", onMoveEnd);
    };
  }, [enabled, map]);

  // Start/stop particle system based on enabled
  useEffect(() => {
    if (!map) return;

    const system = systemRef.current;
    if (!system) return;

    if (enabled) {
      system.setProjector({
        project: (lngLat) => map.project(lngLat),
        unproject: (point) => map.unproject(point),
      });
      system.start();
    } else {
      system.stop();
    }
  }, [enabled, map]);

  // Update projector on map render for pan/zoom sync
  useEffect(() => {
    if (!map || !enabled) return;

    const onRender = () => {
      systemRef.current?.setProjector({
        project: (lngLat) => map.project(lngLat),
        unproject: (point) => map.unproject(point),
      });
    };
    map.on("render", onRender);
    return () => {
      map.off("render", onRender);
    };
  }, [map, enabled]);

  return null;
}
