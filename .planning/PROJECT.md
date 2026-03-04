# GSD Weather Center

## What This Is

A live weather intelligence dashboard that aggregates multiple data sources — weather APIs, NOAA buoy observations, and forecast models — into a sci-fi styled command center. Built for coastal users, outdoor enthusiasts, sailors, surfers, and fishermen who need richer environmental data than typical weather apps provide. Uses MCP servers as the primary data retrieval layer so an AI agent can dynamically call tools to fetch and analyze conditions.

## Core Value

Real-time, multi-source weather and ocean data unified in one dashboard with an AI assistant that can analyze conditions and answer natural language questions about the environment.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Live current weather lookup by location (temperature, humidity, wind, pressure, conditions)
- [ ] 7-day forecast with daily highs/lows, precipitation, and conditions
- [ ] Hourly forecast for the next 24-48 hours
- [ ] NOAA buoy data viewer (wave height, wave period, wind speed/direction, water temp, air pressure)
- [ ] Map view of nearby buoys with Mapbox GL (dark styled)
- [ ] Location search with geolocation support
- [ ] Environmental/weather alerts and warnings
- [ ] AI weather assistant powered by Claude API that can analyze conditions and answer questions
- [ ] MCP server architecture — one server per data source (weather, buoys, forecasts)
- [ ] Auto-refresh every 5 minutes aligned with NOAA update cycles
- [ ] Dark terminal/HUD sci-fi aesthetic (NASA mission control style)
- [ ] Buoy proximity search (e.g., "show buoys within 50 miles of Portland")
- [ ] AI agent that can find nearby buoys, fetch live readings, and summarize conditions

### Out of Scope

- Marine forecast maps — complexity, defer to v2+
- Swell direction visualization — requires specialized rendering, defer to v2+
- Surf condition scoring — needs validated scoring model, defer to v2+
- Weather model comparison (side-by-side ECMWF vs GFS) — defer to v2+
- Storm tracking — requires historical data pipeline, defer to v2+
- Mobile native app — web-first approach
- User accounts / authentication — not needed for v1
- Historical weather data / trends — defer to v2+

## Context

- **Data sources**: Open-Meteo (free weather API), Weather.gov (NWS forecasts/alerts), ECMWF model data, NOAA NDBC buoy network, NOAA wave models, coastal station observations
- **NOAA buoy data updates every 5-10 minutes** — refresh interval aligned to this cadence
- **MCP (Model Context Protocol) servers** are the primary integration pattern — the AI agent calls MCP tools dynamically rather than hardcoded API calls
- **Target users are coastal**: buoy data, wave conditions, and ocean observations are first-class features, not afterthoughts
- **Agent architecture**: User → Weather Center UI → Weather Agent → MCP Servers → Weather + Buoy Data

## Constraints

- **Tech stack**: Next.js + React, TypeScript, Tailwind CSS, Mapbox GL
- **AI**: Claude API via Anthropic SDK for the weather assistant
- **Data layer**: MCP servers (one per source) as primary data retrieval
- **Maps**: Mapbox GL JS with dark/sci-fi custom styling
- **Deployment**: Vercel
- **API costs**: Prefer free/open APIs (Open-Meteo, NOAA) to minimize costs
- **Refresh rate**: 5-minute intervals for auto-refresh

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + React | SSR capability, strong ecosystem for dashboards, Vercel-native | — Pending |
| One MCP server per data source | Modular, independently deployable, clean separation of concerns | — Pending |
| Claude API for AI assistant | Natural language analysis, tool use capability for MCP integration | — Pending |
| Mapbox GL for maps | Supports dark/sci-fi custom styling, 3D terrain, rich interactivity | — Pending |
| Dark terminal/HUD aesthetic | NASA mission control style — data-dense, neon accents, dark backgrounds | — Pending |
| 5-minute auto-refresh | Aligned with NOAA buoy update frequency (5-10 min) | — Pending |
| Open-Meteo as primary weather API | Free, no API key required, good coverage | — Pending |

---
*Last updated: 2026-03-04 after initialization*
