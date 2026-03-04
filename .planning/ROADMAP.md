# Roadmap: GSD Weather Center

## Overview

Build a live weather intelligence dashboard that aggregates weather APIs, NOAA buoy observations, and forecast models into a sci-fi styled command center. The build follows a data-first order: stand up the MCP server data layer first, then build the UI on top of proven data foundations, add map and location context, integrate NOAA buoy data with spatial views, layer in the AI assistant, and finish with streaming, responsive polish, and deployment.

## Phases

- [ ] **Phase 1: MCP Data Foundation** - Build and validate all MCP tool servers (weather, buoys, geocoding) with server-side API routes
- [ ] **Phase 2: Core Dashboard UI** - Implement the HUD shell and all weather data display (current conditions, forecasts)
- [ ] **Phase 3: Map and Location** - Integrate Mapbox map, location search, geolocation, and buoy markers
- [ ] **Phase 4: NOAA Buoy Integration** - Add buoy data display, history charts, and proximity search
- [ ] **Phase 5: AI Weather Assistant** - Wire in Claude API with tool use for natural language weather Q&A
- [ ] **Phase 6: Polish and Deployment** - Streaming responses, responsive layout, auto-refresh, performance, and Vercel deploy

---

## Phase Details

### Phase 1: MCP Data Foundation

**Goal**: Functioning MCP tool servers for all three data sources (weather, NOAA buoys, geocoding) behind server-side API routes, with validated data parsing and time-zone normalization. No UI required — this phase proves data reliability before building on it.

**Depends on**: None (first phase)

**Requirements**: INFRA-01, INFRA-03, INFRA-04

**Success Criteria** (what must be TRUE):
  1. Calling the weather MCP tool returns current conditions JSON for a given lat/lon without error
  2. Calling the buoy MCP tool returns parsed buoy observations (wave height, water temp, etc.) with `MM`/sentinel values handled gracefully
  3. All external API calls are server-side — no direct browser-to-NOAA or browser-to-Open-Meteo requests
  4. NOAA NDBC fixed-width text format is parsed correctly into structured data objects
  5. Data caching layer with 5-minute TTL is in place — repeated requests within TTL return cached data

**Plans**: 6 plans

Plans:
- [ ] 01-01: Scaffold Next.js 15 project with TypeScript, Tailwind CSS 4, and project structure (app router, MCP sdk, Anthropic sdk dependencies installed)
- [ ] 01-02: Build Weather MCP server — Open-Meteo current conditions + 7-day + hourly forecast tools with server-side API route
- [ ] 01-03: Build NOAA Buoy MCP server — fetch from https://www.ndbc.noaa.gov/data/realtime2/, NDBC text parser, buoy observations tool, station metadata tool, with robust `MM`/`99.0` sentinel handling
- [ ] 01-04: Build Geocoding MCP server — location-to-coordinates tool and reverse geocode tool using a free geocoding API
- [ ] 01-05: Build data caching layer — 5-minute TTL cache for all API responses, deduplication of concurrent requests (INFRA-04)
- [ ] 01-06: Write integration tests against live APIs to validate all three MCP servers return well-formed data

---

### Phase 2: Core Dashboard UI

**Goal**: A functional weather dashboard with the HUD sci-fi visual identity displaying current conditions, 7-day forecast, and hourly forecast for any location. Users can see real weather data in the styled interface.

**Depends on**: Phase 1 (MCP data foundation)

**Requirements**: WX-01, WX-02, WX-03, WX-04, UI-01

**Success Criteria** (what must be TRUE):
  1. User sees current temperature, feels-like, humidity, wind, pressure, UV index, and visibility for the default location on page load
  2. User sees a 7-day forecast strip with daily highs/lows, precipitation chance, and condition icons
  3. User sees an hourly timeline for the next 24-48 hours (temp, precipitation, wind)
  4. User sees marine conditions panel (sea surface temp, wind waves, swell) for coastal locations
  5. The UI has the dark terminal/HUD aesthetic with neon accents on a dark background throughout

**Plans**: 5 plans

Plans:
- [ ] 02-01: Build HUD shell layout — dark background, grid structure, panel components, typography system, neon accent color tokens
- [ ] 02-02: Build current conditions panel — all WX-01 fields displayed with HUD styling and live data from weather MCP
- [ ] 02-03: Build 7-day forecast panel — daily cards with highs/lows, precipitation, condition summary (WX-02)
- [ ] 02-04: Build hourly forecast timeline — scrollable 24-48 hour strip with temp/precip/wind (WX-03)
- [ ] 02-05: Build marine conditions panel — sea surface temp, wind waves, swell data from Open-Meteo marine endpoint (WX-04)

---

### Phase 3: Map and Location

**Goal**: Interactive Mapbox map with dark styling, buoy markers, location search (city/zip/coordinates), and browser geolocation support. Users can set their dashboard location, see spatial context, and explore buoy locations on the map.

**Depends on**: Phase 2 (dashboard shell)

**Requirements**: BUOY-04, LOC-01, LOC-02, UI-03

**Success Criteria** (what must be TRUE):
  1. User can type a city name, zip code, or coordinates into a search field and the dashboard updates to that location (LOC-01)
  2. User can click "Use My Location" and the dashboard geolocates them, with a visible fallback message if permission is denied (LOC-02)
  3. Map uses a custom dark/sci-fi Mapbox style consistent with the HUD aesthetic (UI-03)
  4. User sees buoy stations as markers on the Mapbox map with clustering; clicking a marker shows a popup with key readings (BUOY-04)
  5. Location changes propagate to all dashboard panels (weather updates for new location)

**Plans**: 4 plans

Plans:
- [ ] 03-01: Integrate Mapbox GL JS + react-map-gl — dark custom style, viewport state, location context provider (UI-03)
- [ ] 03-02: Build location search — geocoding MCP tool integration, search input with autocomplete, updates dashboard location context (LOC-01)
- [ ] 03-03: Add browser geolocation — "Use My Location" button with permission handling and fallback to default location (LOC-02)
- [ ] 03-04: Add buoy marker layer to Mapbox map — GeoJSON source, marker clustering, popup on click with key readings (BUOY-04)

---

### Phase 4: NOAA Buoy Integration

**Goal**: Full buoy data experience — live observations, proximity search, detail panels, and 24-hour history charts. Coastal users can find and inspect nearby buoys through search and detail views.

**Depends on**: Phase 1 (MCP data foundation), Phase 3 (map and location)

**Requirements**: BUOY-01, BUOY-02, BUOY-03, BUOY-05

**Success Criteria** (what must be TRUE):
  1. User can see live buoy observations (wave height, wave period, wind, water temp, air pressure) for a selected station (BUOY-01)
  2. User can search for buoys within a user-specified distance (e.g., 50 miles) of a location and see a list of results (BUOY-02)
  3. User can click a buoy (in list or on map) to open a detail view with full station readings and metadata (BUOY-03)
  4. User can view a 24-hour history chart for any buoy reading (wave height, water temp, etc.) rendered with Recharts (BUOY-05)

**Plans**: 4 plans

Plans:
- [ ] 04-01: Build buoy list/search panel — proximity search UI backed by buoy MCP, results list with key stats per station (BUOY-02)
- [ ] 04-02: Build buoy observation display — live readings card with all BUOY-01 fields for a selected station
- [ ] 04-03: Build buoy detail view — expanded station info, full readings, station metadata panel (BUOY-03)
- [ ] 04-04: Build buoy history charts — Recharts time-series graphs for last 24 hours of readings per station (BUOY-05)

---

### Phase 5: AI Weather Assistant

**Goal**: A chat interface powered by Claude API with tool use wired to all MCP servers. Users can ask natural language questions about conditions, get buoy summaries, and receive activity-specific advice.

**Depends on**: Phase 1 (MCP data foundation), Phase 4 (buoy + location context)

**Requirements**: AI-01, AI-02, AI-03

**Success Criteria** (what must be TRUE):
  1. User can type a weather question and receive an accurate answer grounded in live data from the MCP tools (AI-01)
  2. User can ask the AI to find nearby buoys and the AI calls the buoy MCP tool, retrieves results, and summarizes ocean conditions (AI-02)
  3. User can ask an activity-specific question (e.g., "Is it safe to sail today near Portland?") and receive a specific, actionable answer (AI-03)

**Plans**: 4 plans

Plans:
- [ ] 05-01: Wire Claude API with tool use — system prompt that forces tool use for all weather claims, register all MCP tools as Claude tools
- [ ] 05-02: Build chat UI panel — message display, input field, message history, HUD-styled chat bubbles
- [ ] 05-03: Implement weather Q&A flow — Claude calls weather MCP tools to answer current conditions, forecast, and marine questions (AI-01, AI-03)
- [ ] 05-04: Implement buoy discovery flow — Claude calls buoy proximity + observation tools to find and summarize nearby ocean conditions (AI-02)

---

### Phase 6: Polish and Deployment

**Goal**: Production-ready application on Vercel with streaming AI responses, full responsive layout, 5-minute auto-refresh, performance optimization, and all final QA. Every requirement is verified end-to-end.

**Depends on**: All previous phases

**Requirements**: AI-04, INFRA-02, UI-02

**Success Criteria** (what must be TRUE):
  1. AI responses stream in real-time — characters appear as Claude generates them, not delivered as a single block (AI-04)
  2. Dashboard auto-refreshes weather and buoy data every 5 minutes without user action, aligned with NOAA update cadence (INFRA-02)
  3. Dashboard is fully usable on mobile (stacked layout), tablet (2-column), and desktop (full grid) — no broken layouts or overflow (UI-02)
  4. Application deploys successfully to Vercel with all environment variables configured and all data sources returning live data in production

**Plans**: 5 plans

Plans:
- [ ] 06-01: Implement streaming AI responses — SSE stream from Claude API to chat UI, real-time character rendering (AI-04)
- [ ] 06-02: Implement SWR 5-minute polling — auto-refresh all weather and buoy data on interval, loading states during refresh (INFRA-02)
- [ ] 06-03: Implement responsive layout — mobile stacked, tablet 2-column, desktop full grid using Tailwind breakpoints (UI-02)
- [ ] 06-04: Performance pass — Mapbox marker clustering optimization, image optimization, bundle analysis, edge runtime where appropriate
- [ ] 06-05: Vercel deployment — environment variable setup, production build validation, smoke test all data sources live in production

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. MCP Data Foundation | 0/6 | Not started | - |
| 2. Core Dashboard UI | 0/5 | Not started | - |
| 3. Map and Location | 0/4 | Not started | - |
| 4. NOAA Buoy Integration | 0/4 | Not started | - |
| 5. AI Weather Assistant | 0/4 | Not started | - |
| 6. Polish and Deployment | 0/5 | Not started | - |
