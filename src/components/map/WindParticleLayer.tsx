"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl";
import { WindParticleSystem } from "@/lib/wind/WindParticleSystem";
import { fetchWind } from "@/lib/wind/windFetcher";

// Longer initial delay lets the map fully settle (container resizing,
// responsive layout, initial tile load) before the first wind fetch.
// Subsequent moveend events use the shorter delay for responsive UX.
const INITIAL_STABILIZATION_MS = 2000;
const MOVEEND_STABILIZATION_MS = 400;

interface Props {
  enabled: boolean;
}

export function WindParticleLayer({ enabled }: Props) {
  const { current: map } = useMap();
  const systemRef = useRef<WindParticleSystem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef(map);

  mapRef.current = map;

  // -----------------------------------------------------------------------
  // Stabilization guard: only fetch wind after the viewport has been
  // unchanged for N ms. Every viewport change resets the timer, so
  // oscillating viewports A→B→A produce ONE fetch for the final position.
  // -----------------------------------------------------------------------
  const stabilizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChangeTime = useRef(0);
  const hasFetched = useRef(false);

  const clearStabilizeTimer = useCallback(() => {
    if (stabilizeTimer.current) {
      clearTimeout(stabilizeTimer.current);
      stabilizeTimer.current = null;
    }
  }, []);

  const maybeFetchWind = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    const rawBounds = m.getBounds();
    if (!rawBounds) return;

    const bounds = {
      west: rawBounds.getWest(),
      south: rawBounds.getSouth(),
      east: rawBounds.getEast(),
      north: rawBounds.getNorth(),
    };

    lastChangeTime.current = Date.now();
    clearStabilizeTimer();

    const capturedTime = lastChangeTime.current;
    const delay = hasFetched.current
      ? MOVEEND_STABILIZATION_MS
      : INITIAL_STABILIZATION_MS;

    stabilizeTimer.current = setTimeout(async () => {
      if (lastChangeTime.current !== capturedTime) return;

      const field = await fetchWind(bounds);
      if (field) {
        hasFetched.current = true;
        console.log("[wind] WIND FIELD SWAPPED bounds=", field.bounds);
        console.log("[wind] WIND VIEWPORT CHANGE ACCEPTED");
        systemRef.current?.setField(field);
      }
    }, delay);
  }, [clearStabilizeTimer]);

  // Create overlay canvas and particle system
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const mapCanvas = m.getCanvas();
    const container = mapCanvas.parentElement;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";

    // Use CSS pixel dimensions for canvas bitmap so that canvas coordinates
    // match map.project()/unproject() which return CSS pixels.
    const cssWidth = mapCanvas.clientWidth;
    const cssHeight = mapCanvas.clientHeight;
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    canvas.width = cssWidth;
    canvas.height = cssHeight;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const system = new WindParticleSystem(canvas);
    systemRef.current = system;

    const resizeObserver = new ResizeObserver(() => {
      const w = mapCanvas.clientWidth;
      const h = mapCanvas.clientHeight;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = w;
      canvas.height = h;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!map]);

  // Wind fetch: moveend only — no periodic refresh, no render-triggered fetches
  useEffect(() => {
    const m = mapRef.current;
    if (!enabled || !m) return;

    // moveend is the ONLY trigger for wind fetches.
    // Each moveend resets the stabilization timer; the fetch only fires
    // after the delay of quiet.
    const onMoveEnd = () => maybeFetchWind();
    m.on("moveend", onMoveEnd);

    // Kick one stabilized fetch for the current viewport
    maybeFetchWind();

    return () => {
      m.off("moveend", onMoveEnd);
      clearStabilizeTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, !!map, maybeFetchWind]);

  // Start/stop particle system
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const system = systemRef.current;
    if (!system) return;

    if (enabled) {
      system.setProjector({
        project: (lngLat) => m.project(lngLat),
        unproject: (point) => m.unproject(point),
      });
      system.start();
    } else {
      system.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, !!map]);

  // Projector sync on render (NO data fetching)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !enabled) return;

    const onRender = () => {
      systemRef.current?.setProjector({
        project: (lngLat) => m.project(lngLat),
        unproject: (point) => m.unproject(point),
      });
    };
    m.on("render", onRender);
    return () => {
      m.off("render", onRender);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!map, enabled]);

  return null;
}
