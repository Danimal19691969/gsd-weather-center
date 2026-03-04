# Architecture Research: Weather Intelligence Dashboard

**Researched:** 2026-03-04
**Domain:** Real-time weather dashboard with MCP integration

## System Components

### 1. Next.js Frontend (App Router)

```
src/
├── app/
│   ├── layout.tsx          # Root layout with HUD theme
│   ├── page.tsx            # Dashboard home
│   ├── api/
│   │   ├── weather/        # Weather data proxy routes
│   │   ├── buoys/          # Buoy data proxy routes
│   │   ├── alerts/         # Alert proxy routes
│   │   └── chat/           # AI assistant endpoint
│   └── components/
│       ├── dashboard/      # Main dashboard panels
│       ├── map/            # Mapbox components
│       ├── weather/        # Weather display components
│       ├── buoy/           # Buoy data components
│       ├── chat/           # AI assistant chat UI
│       └── ui/             # Shared HUD components
├── lib/
│   ├── mcp/               # MCP client connections
│   ├── weather/            # Weather data types + utils
│   ├── buoy/              # Buoy data types + utils
│   └── ai/                # Claude integration
└── mcp-servers/
    ├── weather/            # Weather MCP server
    ├── buoy/              # Buoy MCP server
    └── alerts/            # Alerts MCP server
```

### 2. MCP Server Layer

Three independent MCP servers, each responsible for one data domain:

**Weather MCP Server** (`mcp-servers/weather/`)
- Tools:
  - `get_current_weather(lat, lon)` → Current conditions from Open-Meteo
  - `get_hourly_forecast(lat, lon, hours)` → Hourly forecast
  - `get_daily_forecast(lat, lon, days)` → 7-day forecast
  - `get_marine_weather(lat, lon)` → Ocean conditions from Open-Meteo Marine API

**Buoy MCP Server** (`mcp-servers/buoy/`)
- Tools:
  - `list_buoy_stations(lat, lon, radius_miles)` → Find nearby buoys
  - `get_buoy_observations(station_id)` → Latest readings for a buoy
  - `get_buoy_details(station_id)` → Station metadata (name, location, type)
  - `search_buoys_by_region(region)` → Buoys in a named region

**Alerts MCP Server** (`mcp-servers/alerts/`)
- Tools:
  - `get_active_alerts(lat, lon)` → Current NWS alerts for a location
  - `get_alert_details(alert_id)` → Full alert text
  - `get_marine_warnings(zone)` → Marine-specific warnings

### 3. AI Agent Layer

```
User message
    ↓
Next.js API route (/api/chat)
    ↓
Claude API (claude-sonnet-4-6 with tool use)
    ↓
Tool calls → MCP Server tools
    ↓
Data returned → Claude synthesizes response
    ↓
Streamed response → Chat UI
```

The AI agent has access to all MCP tools and decides which to call based on the user's question. Multi-step reasoning: "What are conditions for sailing near Portland?" → find location → get weather → find nearby buoys → get buoy data → synthesize answer.

### 4. Map Layer

- Mapbox GL JS with custom dark style
- GeoJSON source for buoy stations
- Marker clustering for dense areas
- Popup overlays with live buoy data
- Geolocation control
- Fly-to animation on location search

## Data Flow

### Dashboard Data Flow (Polling)

```
Browser                    Next.js Server              External APIs
  │                            │                            │
  │─── SWR fetch (5 min) ────►│                            │
  │                            │── Open-Meteo API ─────────►│
  │                            │◄── JSON weather data ──────│
  │                            │── NOAA NDBC ──────────────►│
  │                            │◄── Buoy observations ──────│
  │                            │── Weather.gov ────────────►│
  │                            │◄── Alerts JSON ────────────│
  │◄── Aggregated response ────│                            │
  │                            │                            │
```

### AI Chat Data Flow

```
Browser                    Next.js Server              Claude API           MCP Servers
  │                            │                          │                    │
  │── Chat message ───────────►│                          │                    │
  │                            │── Messages + tools ─────►│                    │
  │                            │                          │── Tool call ──────►│
  │                            │                          │◄── Tool result ────│
  │                            │                          │── Tool call ──────►│
  │                            │                          │◄── Tool result ────│
  │                            │◄── Streamed response ────│                    │
  │◄── SSE stream ─────────────│                          │                    │
```

## Caching Strategy

| Data Source | Cache Duration | Strategy |
|------------|---------------|----------|
| Open-Meteo current | 5 min | SWR client-side + API route cache |
| Open-Meteo forecast | 15 min | ISR or stale-while-revalidate |
| NOAA buoy observations | 5 min | SWR client-side (aligned to update cycle) |
| NOAA station list | 24 hours | Static/ISR (stations rarely change) |
| Weather.gov alerts | 2 min | Short cache — safety critical |
| Mapbox tiles | Browser default | Mapbox handles tile caching |

## Component Boundaries

### What Talks to What

```
┌─────────────────────────────────────────────────┐
│                  BROWSER                         │
│                                                  │
│  Dashboard ◄──► SWR Cache ◄──► API Routes       │
│  Map ◄──────────────────────► Mapbox CDN         │
│  Chat UI ◄──────────────────► /api/chat          │
│                                                  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│               NEXT.JS SERVER                     │
│                                                  │
│  /api/weather/* ──────► Weather MCP Server       │
│  /api/buoys/*  ──────► Buoy MCP Server           │
│  /api/alerts/* ──────► Alerts MCP Server         │
│  /api/chat     ──────► Claude API (+ MCP tools)  │
│                                                  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│            EXTERNAL SERVICES                     │
│                                                  │
│  Open-Meteo API (weather + marine)               │
│  NOAA NDBC (buoy observations + station list)    │
│  Weather.gov API (alerts + forecasts)            │
│  Claude API (AI assistant)                       │
│  Mapbox (map tiles + geocoding)                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Key Boundaries

1. **MCP servers never call each other** — they're independent data sources
2. **Only Claude API calls MCP tools directly** — frontend uses API routes
3. **API routes can call MCP servers OR external APIs directly** — MCP isn't mandatory for simple fetches
4. **Map layer is client-only** — Mapbox GL runs in the browser
5. **Chat is server-mediated** — browser never talks directly to Claude API (API key protection)

## Build Order (Dependencies)

```
Phase 1: MCP Servers (data foundation)
    │
    ├── Weather MCP (Open-Meteo integration)
    ├── Buoy MCP (NOAA NDBC integration)
    └── Alerts MCP (Weather.gov integration)
    │
Phase 2: API Routes + Data Layer
    │
    ├── /api/weather/* routes
    ├── /api/buoys/* routes
    ├── Data types + utilities
    └── SWR hooks for client polling
    │
Phase 3: Core Dashboard UI
    │
    ├── HUD layout shell
    ├── Current conditions panel
    ├── Forecast panels (hourly + daily)
    └── Alerts panel
    │
Phase 4: NOAA Buoy UI + Map
    │
    ├── Mapbox map component (dark theme)
    ├── Buoy markers + clustering
    ├── Buoy detail panels
    └── Location search + geolocation
    │
Phase 5: AI Weather Assistant
    │
    ├── /api/chat route (Claude + MCP tools)
    ├── Chat UI component
    ├── Tool use integration
    └── Streaming response handler
    │
Phase 6: Polish + Deploy
    │
    ├── Responsive design
    ├── Error handling + loading states
    ├── Performance optimization
    └── Vercel deployment
```

## MCP Server Hosting Decision

**Option A: In-process (Recommended for v1)**
- MCP servers run as Node.js modules within Next.js API routes
- Pros: Simple deployment, no separate services, no network overhead
- Cons: Can't scale independently, coupled to Next.js process

**Option B: Separate processes**
- MCP servers run as standalone services
- Pros: Independent scaling, true microservice architecture
- Cons: Deployment complexity, network latency, Vercel doesn't support long-running processes

**Recommendation:** Start with Option A (in-process). Extract to Option B only if scaling requires it.
