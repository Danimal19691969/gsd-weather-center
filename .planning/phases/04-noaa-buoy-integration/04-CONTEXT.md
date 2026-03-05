# Phase 4: NOAA Buoy Integration — Context

## What Exists
- Buoy MCP tools: getNearbyBuoys, getBuoyObservations, getBuoyHistory
- API route: /api/buoys (nearby, observations, history tools)
- useBuoys hook for nearby buoys
- BuoyMarkers on map with popups showing station name and distance
- BuoyObservation type with 12 measurement fields (all number | null)
- 255 stations in buoy-stations.json

## What This Phase Adds
- Buoy list/search panel with proximity search UI
- Live buoy observation display card
- Buoy detail view with full readings
- 24-hour history charts using Recharts

## Key Integration Points
- useNearbyBuoys hook already exists, needs hooks for observations and history
- Recharts already installed
- Dashboard needs new panel area for buoy data
