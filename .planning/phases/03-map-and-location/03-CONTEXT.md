# Phase 3: Map and Location — Context

## What Exists
- Dashboard shell with hardcoded Portland, OR (45.5152, -122.6784)
- Geocoding MCP tool (`src/lib/tools/location.ts`) — resolveLocation via Mapbox API
- Buoy MCP tools (`src/lib/tools/buoys.ts`) — getNearbyBuoys, getBuoyObservations
- API routes: `/api/location?q=`, `/api/buoys?tool=nearby&lat=&lon=`
- 255 buoy stations in `src/data/buoy-stations.json`
- SWR hooks for weather data in `src/lib/hooks/useWeather.ts`
- UI components: Panel, StatBlock, LoadingPanel, ErrorPanel
- HUD theme tokens in globals.css

## What This Phase Adds
- Location context provider (React Context) to replace hardcoded lat/lon
- Mapbox GL map with dark styling
- Location search bar with geocoding autocomplete
- Browser geolocation ("Use My Location")
- Buoy markers on the map with clustering and popups

## Key Integration Points
- Dashboard.tsx currently passes hardcoded lat/lon to all panels → will use LocationProvider context
- All weather panels accept `lat`/`lon` props → will consume from context
- Mapbox token comes from `NEXT_PUBLIC_MAPBOX_TOKEN` env var
- getNearbyBuoys returns stations with distanceMiles for marker placement

## Dependencies
- react-map-gl and mapbox-gl already installed
- Mapbox token must be in `.env.local`
