# Research Summary: GSD Weather Center

**Synthesized:** 2026-03-04
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Recommended Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 (dark HUD theme) |
| Maps | Mapbox GL JS 3 + react-map-gl 7 |
| Data fetching | SWR 2 (5-min polling) + Server Actions |
| MCP | @modelcontextprotocol/sdk 1.x (in-process for v1) |
| AI | @anthropic-ai/sdk + Claude Sonnet |
| Weather | Open-Meteo (free) + Weather.gov (alerts) |
| Ocean | NOAA NDBC (buoy observations) |
| Charts | Recharts 2 |
| Deployment | Vercel |

## Key Findings

### Table Stakes Features
- Current conditions, 7-day forecast, hourly forecast, location search, weather alerts
- These are baseline — every weather app has them
- Low to medium complexity individually

### Differentiators (What Makes This Special)
1. **NOAA buoy data as a first-class feature** — most weather apps ignore ocean data entirely
2. **Buoy map + proximity search** — "show buoys within 50 miles" is the killer feature
3. **AI weather assistant** — natural language analysis of conditions with tool-calling
4. **Sci-fi HUD aesthetic** — NASA mission control visual identity
5. **Multi-source data aggregation** — Open-Meteo + NOAA + Weather.gov unified

### Architecture Decisions
- **MCP servers in-process** (not separate services) — simplifies v1 deployment on Vercel
- **Server-side data fetching** — avoids CORS issues with NOAA, protects API keys
- **SWR polling at 5-min intervals** — aligned with NOAA buoy update frequency
- **Claude Sonnet for AI assistant** — good quality/cost balance for interactive Q&A

### Critical Pitfalls to Watch
1. **NOAA NDBC text format** — fixed-width columns, not JSON. Need custom parser with missing-data handling (`MM`, `99.0` sentinel values)
2. **Weather.gov unreliability** — use primarily for alerts, Open-Meteo as primary weather source
3. **MCP in serverless** — run tool logic in-process, not as separate MCP server processes
4. **AI hallucination risk** — system prompt must force tool use for ALL weather data claims
5. **Mobile HUD layout** — data-dense grids need careful responsive design
6. **Time zones** — NOAA uses UTC, Weather.gov uses local. Normalize to UTC internally.

## Build Order Recommendation

```
1. MCP Servers (weather + buoy data layer)
2. API Routes + Data Utilities (time zones, units, caching)
3. Dashboard UI (HUD shell, conditions, forecasts)
4. NOAA Buoy UI + Map (Mapbox, markers, proximity)
5. Location Search + Alerts
6. AI Weather Assistant (Claude + tool use)
7. Polish + Deployment (responsive, performance, Vercel)
```

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| NOAA data parsing | High | Build robust parser early, test with real data |
| Weather.gov downtime | Medium | Use as fallback, Open-Meteo primary |
| AI costs at scale | Medium | Use Sonnet, trim context, cache common queries |
| Map performance | Medium | Marker clustering, viewport-based loading |
| Vercel cold starts | Low | Edge runtime, lightweight initialization |
