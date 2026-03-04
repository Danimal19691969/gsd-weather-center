# Phase 1: MCP Data Foundation - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase builds the entire data layer — three MCP tool servers (weather, buoy, geocoding) as in-process TypeScript functions, server-side API routes, a data caching layer, and integration tests. No UI is built. The output is a proven, testable data foundation that all subsequent phases build on.
</domain>

<decisions>
## Implementation Decisions

### MCP Runtime Architecture
- **In-process tool functions** — MCP tool logic implemented as plain TypeScript functions, called directly from Next.js API routes. No separate MCP server processes for v1.
- Tool functions live in `src/lib/mcp/` organized by server (weather, buoy, geocoding).
- Each tool function takes typed parameters and returns typed results.
- API routes in `src/app/api/` call tool functions directly.

### Tool Surface Design

**Weather Server** (`src/lib/mcp/weather/`)
- `getCurrentWeather(lat: number, lon: number)` → Current conditions from Open-Meteo (temp, feels-like, humidity, wind speed/direction, pressure, UV, visibility, conditions)
- `getForecast(lat: number, lon: number, type: 'hourly' | 'daily')` → Single tool with type parameter. Returns hourly (24-48h) or daily (7-day) forecast.
- `getMarineWeather(lat: number, lon: number)` → Sea surface temp, wind waves, swell from Open-Meteo Marine API

**Buoy Server** (`src/lib/mcp/buoy/`)
- `getNearbyBuoys(lat: number, lon: number, radiusMiles?: number, limit?: number)` → Find buoys within radius, return closest N. Both parameters optional with defaults (radius: 100, limit: 10).
- `getBuoyObservations(stationId: string)` → Latest readings from NDBC realtime2 endpoint (wave height, wave period, wind speed/direction, water temp, air pressure)
- `getBuoyHistory(stationId: string)` → Last 24 hours of readings from NDBC realtime2

**Location Server** (`src/lib/mcp/geocoding/`)
- `resolveLocation(query: string)` → Geocode a city name, zip code, or coordinate string to lat/lon using Mapbox Geocoding API. Returns top results with display names.

### Data Sources
- **Open-Meteo**: Free, no API key. Base URL: `https://api.open-meteo.com/v1/`
  - Current: `/forecast?current=...`
  - Hourly: `/forecast?hourly=...`
  - Daily: `/forecast?daily=...`
  - Marine: `/marine?...`
- **NOAA NDBC**: Free, no API key. Endpoint: `https://www.ndbc.noaa.gov/data/realtime2/`
  - Per-station text files: `{stationId}.txt` (standard meteorological)
  - Fixed-width column format with 2 header rows
  - Missing data: `MM` or sentinel values (99.0, 999.0, 9999.0)
- **Mapbox Geocoding**: Requires Mapbox token (already have for maps). Free tier: 100k requests/month.

### Buoy Station List
- **Static JSON bundled in app** — NDBC station list (~1000 stations) as a JSON file at `src/data/buoy-stations.json`
- Contains: station ID, name, lat, lon, type (buoy/land/ship)
- Used by `getNearbyBuoys()` for distance calculations
- Station list rarely changes — no live fetching needed

### Buoy Proximity Search — Great-Circle Distance
- **Must use Haversine formula** for `getNearbyBuoys()` distance calculations — NOT simple lat/lon subtraction
- Simple coordinate subtraction distorts heavily at higher latitudes and over ocean distances
- Implement a `haversineDistance(lat1, lon1, lat2, lon2): number` utility that returns distance in miles
- This is critical for accurate ocean proximity (e.g., "buoys within 50 miles of Portland")

### Caching Layer
- **In-memory Map with TTL** — `Map<string, { data: any, expiry: number }>`
- 5-minute TTL aligned with NOAA update frequency
- Cache key = tool name + serialized params (e.g., `weather:getCurrentWeather:45.5:-122.6`)
- Deduplication: if a request is in-flight for the same key, return the same promise
- Resets on Vercel deploy (acceptable for v1)

### NOAA NDBC Parser
- Parse fixed-width text from realtime2 endpoint
- Two header rows: first is column names, second is units
- Map columns to typed fields (waveHeight, wavePeriod, windSpeed, etc.)
- Handle missing data: `MM` → null, sentinel values (99.0, 999.0) → null
- Timestamps in UTC — normalize all data to UTC internally
- Return typed `BuoyObservation` objects

### Unit Handling
- All data stored internally in metric (Celsius, m/s, meters, hPa)
- Unit conversion happens at the display layer (Phase 2+), not in MCP tools
- Tool responses include a `units` field documenting what system is used

### Error Handling
- Tool functions return structured results: `{ success: true, data: ... }` or `{ success: false, error: string, source: string }`
- Never throw — always return error objects
- API routes return appropriate HTTP status codes
- Cached errors are NOT cached (only successful responses)

### Claude's Discretion
- Exact file/folder naming within the patterns above
- Internal utility function design
- Test framework choice (vitest, jest, or Node test runner)
- Specific Open-Meteo query parameter selection
- Error retry strategy details
</decisions>

<specifics>
## Specific Implementation Notes

### NDBC Realtime2 Format Example
```
#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE
#yr  mo dy hr mn deg  m/s  m/s     m   sec   sec deg    hPa  degC  degC  degC  nmi  hPa    ft
2024 01 15 18 00 270  5.1  6.2   1.5   8.0   5.5 280 1013.2  12.1  13.5  10.2   MM   MM    MM
```

### Open-Meteo Current Weather Fields
Request: `temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,uv_index,visibility`

### Mapbox Geocoding API
Endpoint: `https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?access_token={token}`
Returns GeoJSON FeatureCollection with coordinates and place names.
</specifics>

<deferred>
## Deferred Ideas

- MCP server process extraction (separate from Next.js) — defer to scaling needs
- Redis/KV persistent caching — defer to v2 if in-memory proves insufficient
- Weather.gov NWS API integration — defer alerts to v2 per roadmap
- ECMWF model data — defer to v2
- Live station list refresh from NOAA — defer, static list sufficient
</deferred>
