"use client";

import { useState } from "react";
import { useLocation } from "@/lib/context/LocationContext";

export function GeolocationButton() {
  const { setLocation } = useLocation();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const onClick = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(pos.coords.latitude, pos.coords.longitude, "My Location");
        setStatus("idle");
      },
      () => {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={onClick}
      disabled={status === "loading"}
      className="shrink-0 rounded border border-hud-border bg-hud-panel px-3 py-1.5 font-mono text-xs text-hud-text-dim hover:border-hud-accent hover:text-hud-accent disabled:opacity-50"
    >
      {status === "loading" && "Locating..."}
      {status === "error" && "Location denied"}
      {status === "idle" && "Use My Location"}
    </button>
  );
}
