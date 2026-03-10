"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useMap } from "react-map-gl";
import { usePrecipStore } from "@/store/precipStore";
import { useLoadPrecipGrid } from "@/hooks/useLoadPrecip";
import { PrecipField, type PrecipSample } from "@/lib/precip/PrecipField";

interface Props {
  enabled: boolean;
}

export function PrecipLayer({ enabled }: Props) {
  const { current: map } = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef(map);
  mapRef.current = map;

  const { fetchGrid, clearTimer } = useLoadPrecipGrid();
  const { grid, currentHour } = usePrecipStore();

  // --- Fetch grid on moveend (debounced) ---
  const triggerFetch = useCallback(() => {
    const m = mapRef.current;
    if (!m || !enabled) return;
    const rawBounds = m.getBounds();
    if (!rawBounds) return;

    fetchGrid({
      west: rawBounds.getWest(),
      south: rawBounds.getSouth(),
      east: rawBounds.getEast(),
      north: rawBounds.getNorth(),
      zoom: m.getZoom(),
    });
  }, [enabled, fetchGrid]);

  // Create overlay canvas
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const mapCanvas = m.getCanvas();
    const container = mapCanvas.parentElement;
    if (!container) return;

    console.log("[precip] PRECIP LAYER MOUNT");
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "2";

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

    const resizeObserver = new ResizeObserver(() => {
      const w = mapCanvas.clientWidth;
      const h = mapCanvas.clientHeight;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = w;
      canvas.height = h;
    });
    resizeObserver.observe(mapCanvas);

    return () => {
      canvas.remove();
      canvasRef.current = null;
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!map]);

  // Bind moveend for viewport-triggered fetches
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !enabled) return;

    const onMoveEnd = () => triggerFetch();
    m.on("moveend", onMoveEnd);

    // Initial fetch for current viewport
    triggerFetch();

    return () => {
      m.off("moveend", onMoveEnd);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, !!map, triggerFetch]);

  // Build PrecipField from grid cells at current hour
  const precipField = useMemo(() => {
    if (!grid || grid.length === 0) {
      console.log("[precip] PRECIP NO GRID DATA");
      return null;
    }

    const samples: PrecipSample[] = [];
    let nonZeroCount = 0;
    for (const cell of grid) {
      const hourIndex = Math.min(currentHour, cell.hours.length - 1);
      const h = cell.hours[hourIndex];
      if (!h) continue;
      if (h.precipitation > 0) nonZeroCount++;
      samples.push({
        lat: cell.lat,
        lon: cell.lon,
        value: h.precipitation,
        color: h.color,
      });
    }

    if (samples.length < 4) {
      console.log(`[precip] PRECIP TOO FEW SAMPLES: ${samples.length}`);
      return null;
    }

    if (nonZeroCount === 0) {
      console.log("[precip] PRECIP NO VISIBLE CELLS (all zero precipitation at hour", currentHour, ")");
    }

    console.log(`[precip] PRECIP FIELD READY samples=${samples.length} nonZero=${nonZeroCount} hour=${currentHour}`);
    return new PrecipField(samples);
  }, [grid, currentHour]);

  // --- Render smooth precipitation heatmap ---
  const renderPrecip = useCallback(() => {
    const canvas = canvasRef.current;
    const m = mapRef.current;
    if (!canvas || !m) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!enabled || !precipField) return;

    // Build projector adapter for PrecipField
    const projector = {
      unproject: (pt: [number, number]) => {
        const geo = m.unproject(pt);
        return { lat: geo.lat, lng: geo.lng };
      },
    };

    const buf = precipField.renderToBuffer(w, h, projector);

    // Count non-transparent pixels for diagnostics
    let visiblePixels = 0;
    for (let i = 3; i < buf.length; i += 4) {
      if (buf[i] > 0) visiblePixels++;
    }

    if (visiblePixels === 0) {
      console.log("[precip] PRECIP NO VISIBLE CELLS in rendered buffer");
    } else {
      console.log(`[precip] PRECIP DRAW COMPLETE visiblePixels=${visiblePixels} canvas=${w}x${h}`);
    }

    const imageData = ctx.createImageData(w, h);
    imageData.data.set(buf);
    ctx.putImageData(imageData, 0, 0);
  }, [precipField, enabled]);

  // Re-render on field/enable changes
  useEffect(() => {
    renderPrecip();
  }, [renderPrecip]);

  // Re-render on map movement (panning/zooming)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !enabled) return;

    const onRender = () => renderPrecip();
    m.on("render", onRender);
    return () => {
      m.off("render", onRender);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!map, enabled, renderPrecip]);

  // Clear canvas when disabled
  useEffect(() => {
    if (!enabled && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [enabled]);

  return null;
}
