# Stack Research: Weather Intelligence Dashboard

**Researched:** 2026-03-04
**Domain:** Real-time weather dashboard with MCP integration, NOAA buoy data, AI assistant

## Frontend Framework

| Choice | Version | Confidence |
|--------|---------|------------|
| **Next.js** | ^15.x (App Router) | High |
| **React** | ^19.x | High |
| **TypeScript** | ^5.x | High |

**Rationale:** Next.js App Router provides React Server Components for server-side data fetching, API routes for proxying MCP calls, and native Vercel deployment. React 19 brings improved Suspense, use() hook, and server actions.

**What NOT to use:**
- Pages Router — legacy pattern, App Router is the standard
- Remix — good framework but less Vercel-native
- Plain React SPA — loses SSR benefits for initial weather data load

## Styling

| Choice | Version | Confidence |
|--------|---------|------------|
| **Tailwind CSS** | ^4.x | High |

**Rationale:** Utility-first CSS ideal for the data-dense HUD layout. Custom theme tokens for sci-fi color palette (neon cyan, electric blue, dark backgrounds). Fast iteration on responsive grid layouts.

**HUD color palette guidance:**
- Background: slate-950, zinc-950
- Primary accents: cyan-400, cyan-500
- Secondary: emerald-400, amber-400 (for alerts)
- Text: slate-100, slate-300
- Borders/dividers: slate-700/800 with subtle glow effects

## Maps

| Choice | Version | Confidence |
|--------|---------|------------|
| **Mapbox GL JS** | ^3.x | High |
| **react-map-gl** | ^7.x | High |

**Rationale:** Best-in-class for dark/custom styling. Supports custom map styles (dark terrain), marker clustering for buoy density, GeoJSON layers, 3D terrain, and smooth animations. react-map-gl provides React bindings.

**What NOT to use:**
- Leaflet — less customizable styling, weaker for sci-fi aesthetic
- Google Maps — restrictive styling, less developer-friendly
- deck.gl — overkill unless adding 3D visualizations later

**Key features needed:**
- Custom dark map style (Mapbox Studio)
- Marker clustering for buoy stations
- Popup overlays for buoy data
- Geolocation control
- Fly-to animations on location search

## Data Fetching

| Choice | Version | Confidence |
|--------|---------|------------|
| **SWR** | ^2.x | High |
| **Next.js Server Actions** | built-in | High |

**Rationale:** SWR handles client-side polling with `refreshInterval: 300000` (5 min) aligned to NOAA update cycles. Built-in deduplication prevents redundant API calls. Server Actions for initial data fetch and form submissions.

**What NOT to use:**
- React Query/TanStack Query — heavier, SWR sufficient for polling pattern
- Raw fetch + setInterval — loses deduplication, error retry, cache benefits
- WebSockets — NOAA doesn't support them, polling is the right pattern

## MCP Servers

| Choice | Version | Confidence |
|--------|---------|------------|
| **@modelcontextprotocol/sdk** | ^1.x | Medium |

**Rationale:** Official SDK for building MCP servers. One server per data source (weather, buoys, forecasts). Each server exposes tools that the AI agent can call.

**Proposed MCP server structure:**
1. **weather-mcp** — Open-Meteo current conditions + forecasts
2. **buoy-mcp** — NOAA NDBC buoy observations, station search
3. **alerts-mcp** — Weather.gov alerts and warnings

**What NOT to use:**
- Direct API calls from frontend — bypasses MCP architecture
- Single monolithic MCP server — loses modularity

## AI Integration

| Choice | Version | Confidence |
|--------|---------|------------|
| **@anthropic-ai/sdk** | ^0.39.x+ | High |
| **Claude claude-sonnet-4-6** | latest | High |

**Rationale:** Claude's tool use capability enables the AI agent to call MCP tools dynamically. Sonnet for the assistant (good balance of speed/quality for interactive Q&A). Streaming responses for real-time chat UX.

**Tool use pattern:**
- Define MCP tools as Claude tool schemas
- Agent receives user question → decides which tools to call → fetches data → synthesizes response
- Example: "What are wave conditions near Cannon Beach?" → find_nearby_buoys → get_buoy_data → summarize

## Weather APIs

| Source | Cost | Key Required | Confidence |
|--------|------|-------------|------------|
| **Open-Meteo** | Free | No | High |
| **Weather.gov** | Free | No (User-Agent required) | High |
| **NOAA NDBC** | Free | No | High |

**Open-Meteo:**
- Current weather, hourly/daily forecasts
- Marine API for ocean data
- No rate limit documentation (generous for reasonable use)
- JSON responses, well-structured

**Weather.gov (NWS API):**
- Alerts and warnings by area
- Detailed forecasts
- Requires User-Agent header (contact email)
- Can be unreliable under load
- Point-based lookup: lat/lon → grid → forecast

**NOAA NDBC:**
- Real-time buoy observations
- Station list with lat/lon
- Text format (fixed-width columns) and RSS/XML
- JSON available via some endpoints
- Updates every 5-10 minutes

## Charts / Visualization

| Choice | Version | Confidence |
|--------|---------|------------|
| **Recharts** | ^2.x | High |

**Rationale:** React-native charting library, good for temperature trends, wind charts, wave height timelines. Customizable themes for dark HUD styling.

**Chart types needed:**
- Line chart: temperature, pressure trends
- Area chart: wave height over time
- Bar chart: hourly precipitation
- Wind rose / direction indicator (custom component)

## Deployment

| Choice | Confidence |
|--------|------------|
| **Vercel** | High |

**Rationale:** Native Next.js support, edge functions, preview deployments, easy environment variable management.

**Considerations:**
- MCP servers may need persistent processes (not serverless) — evaluate running as separate services or using Vercel's long-running functions
- API keys for Mapbox and Anthropic managed via environment variables
- ISR (Incremental Static Regeneration) for cacheable weather pages

## Summary

| Layer | Technology | Status |
|-------|-----------|--------|
| Framework | Next.js 15 + React 19 | Decided |
| Language | TypeScript 5 | Decided |
| Styling | Tailwind CSS 4 | Decided |
| Maps | Mapbox GL JS 3 + react-map-gl 7 | Decided |
| Data fetching | SWR 2 + Server Actions | Decided |
| MCP | @modelcontextprotocol/sdk 1.x | Decided |
| AI | @anthropic-ai/sdk + Claude Sonnet | Decided |
| Weather data | Open-Meteo + Weather.gov + NOAA NDBC | Decided |
| Charts | Recharts 2 | Decided |
| Deployment | Vercel | Decided |

## Open Questions

1. **MCP server hosting**: Vercel serverless or separate persistent service?
2. **NDBC data parsing**: Text files need custom parser — evaluate existing npm packages
3. **Mapbox token**: Need to set up account and configure URL restrictions
4. **Open-Meteo marine API**: Verify coverage for target coastal areas
