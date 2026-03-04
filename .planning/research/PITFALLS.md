# Pitfalls Research: Weather Intelligence Dashboard

**Researched:** 2026-03-04
**Domain:** Real-time weather dashboard with MCP, NOAA buoy data, AI assistant

## API / Data Pitfalls

### NOAA NDBC Data Format Quirks
- **The problem:** NDBC buoy data comes in fixed-width text format, NOT JSON. The "real-time" data at `ndbc.noaa.gov/data/realtime2/` uses `.txt` files with space-separated columns. Header rows use `#` comments. Station IDs mix alphanumeric formats (e.g., `46029`, `TTIW1`). Many fields use `MM` or `99.0` for missing data.
- **Warning signs:** Parser returns undefined/NaN values. Buoy data looks garbled.
- **Prevention:** Build a robust text parser with explicit missing-data handling. Map `MM` and sentinel values (99.0, 999.0) to null. Test with real station data files. Consider using the NDBC JSON API where available (`api.ndbc.noaa.gov`).
- **Phase:** Phase 2 (Buoy MCP server)

### Weather.gov API Reliability
- **The problem:** The NWS API (`api.weather.gov`) is free but can be slow or return 500 errors, especially during severe weather events when traffic spikes. Requires a User-Agent header with contact info. Uses a two-step lookup: coordinates → grid point → forecast.
- **Warning signs:** Intermittent 500/503 errors. Slow responses (>5s). Missing User-Agent causes 403.
- **Prevention:** Add retry logic with exponential backoff. Cache aggressively. Set proper User-Agent header. Have Open-Meteo as fallback for forecasts. Use Weather.gov primarily for alerts (where it's authoritative).
- **Phase:** Phase 1 (Weather MCP server)

### Open-Meteo Usage Limits
- **The problem:** Open-Meteo is free for non-commercial use but has undocumented rate limits. Heavy polling could get IP blocked. Commercial use requires their API subscription.
- **Warning signs:** 429 responses. Delayed/empty responses.
- **Prevention:** Cache responses for 5+ minutes. Deduplicate requests (SWR handles this). Consider their API subscription if traffic grows. Batch multiple data requests into single API calls where possible.
- **Phase:** Phase 1 (Weather MCP server)

### Stale Buoy Data
- **The problem:** Many NOAA buoy stations go offline for maintenance, storms, or equipment failure. Data can be hours or days old but still appears in "real-time" feeds. Some stations only report certain metrics.
- **Warning signs:** Timestamps are old. Key fields are all `MM` (missing).
- **Prevention:** Always display "last updated" timestamp prominently. Gray out or flag stale data (>30 min old). Show which metrics are available per station. Don't assume all buoys report all fields.
- **Phase:** Phase 2 (Buoy MCP server + UI)

### Time Zone Handling
- **The problem:** NOAA buoy data uses UTC. Weather.gov uses local time zones. Open-Meteo can return either. Users expect local time. Mixing time zones causes confusing displays.
- **Warning signs:** Times don't match between panels. Forecasts appear shifted.
- **Prevention:** Normalize all data to UTC internally. Convert to local time at display layer. Use a consistent date library (date-fns or Intl.DateTimeFormat). Always show timezone indicator.
- **Phase:** Phase 1 (data utilities)

### Unit Conversion
- **The problem:** NOAA uses metric AND imperial depending on the field. Wind in knots, temp in Celsius, pressure in hPa. Open-Meteo defaults to metric. Users may want imperial.
- **Warning signs:** Wind speeds seem wrong. Temperature scales mixed.
- **Prevention:** Normalize to one system internally (metric). Convert at display layer. Support user toggle (°F/°C, mph/knots). Create a unit conversion utility used everywhere.
- **Phase:** Phase 1 (data utilities)

## MCP Pitfalls

### MCP Server Lifecycle in Production
- **The problem:** MCP servers are designed for local tool calling. In a Vercel serverless environment, there's no persistent process to host MCP servers. Cold starts could add latency.
- **Warning signs:** First request after idle is slow. MCP connection errors.
- **Prevention:** For v1, run MCP server logic in-process within Next.js API routes (not as separate processes). The MCP SDK's tool definitions can be used as an abstraction layer without running a full MCP server process. Extract to separate services later if needed.
- **Phase:** Phase 1 (architecture decision)

### Tool Schema Design
- **The problem:** Too-granular tools (one per API field) means the AI makes many calls. Too-coarse tools (one "get everything" tool) returns too much data and wastes context.
- **Warning signs:** AI makes 10+ tool calls for simple questions. Or AI gets back huge JSON blobs.
- **Prevention:** Design tools around user intents, not API endpoints. `get_current_weather(lat, lon)` returns a complete weather snapshot. `list_nearby_buoys(lat, lon, radius)` returns a summary list. `get_buoy_details(station_id)` returns full readings for one buoy.
- **Phase:** Phase 1 (MCP server design)

### Error Handling When APIs Fail
- **The problem:** External APIs will fail. If an MCP tool throws, the AI agent may not handle it gracefully. It might hallucinate data or give unhelpful error messages.
- **Warning signs:** AI says "the weather is 72°F" when the API was down. Error messages leak to users.
- **Prevention:** MCP tools should return structured errors: `{ error: true, message: "NOAA NDBC unavailable", fallback: null }`. AI system prompt should instruct: "If a tool returns an error, tell the user which data source is unavailable and what you CAN provide."
- **Phase:** Phase 1 (MCP server error handling)

### MCP Connection Management
- **The problem:** If using MCP servers as separate processes, managing stdio/SSE connections in serverless is problematic. Connections drop on cold starts.
- **Warning signs:** Intermittent "connection refused" errors. Reconnection loops.
- **Prevention:** Use in-process MCP tool execution for v1 (skip server process entirely). Call the tool handler functions directly from API routes. This avoids all connection management issues.
- **Phase:** Phase 1 (architecture)

## Frontend Pitfalls

### Map Performance with Many Markers
- **The problem:** NOAA has 1,000+ buoy stations. Rendering all markers simultaneously tanks performance, especially on mobile.
- **Warning signs:** Map is slow to render. Markers overlap. Browser memory spikes.
- **Prevention:** Use Mapbox marker clustering. Only load buoys within the current viewport + buffer. Use GeoJSON source with cluster properties. Limit initial view to user's region.
- **Phase:** Phase 4 (Map integration)

### Auto-Refresh UI Flicker
- **The problem:** SWR revalidation can cause entire panels to re-render, creating flicker or losing scroll position. Loading states flash between refreshes.
- **Warning signs:** Dashboard "blinks" every 5 minutes. Scroll position resets.
- **Prevention:** Use SWR's `keepPreviousData` option. Only show loading indicators on initial load, not revalidation. Use React transitions for smooth updates. Diff new data against old — only update changed values.
- **Phase:** Phase 3 (Dashboard UI)

### Geolocation Permission Handling
- **The problem:** Browser geolocation requires user permission. If denied, the app needs a fallback. Permission prompts can be confusing or ignored.
- **Warning signs:** App shows empty state because geolocation was denied. No error message.
- **Prevention:** Default to a reasonable location (user's IP-based rough location or a major city). Show clear messaging when geolocation is denied. Always allow manual location search as primary interaction.
- **Phase:** Phase 5 (Location search)

### Mobile Responsiveness of HUD Layout
- **The problem:** Data-dense NASA-style grids don't translate well to mobile. Trying to fit 6+ panels on a phone screen makes everything unreadable.
- **Warning signs:** Panels are too small to read. Horizontal scroll on mobile. Text overflow.
- **Prevention:** Design mobile-first breakpoints: stack panels vertically on mobile, 2-column on tablet, full grid on desktop. Use collapsible panels. Prioritize: current weather → forecast → map → buoys → chat.
- **Phase:** Phase 3 (Dashboard UI)

## AI Assistant Pitfalls

### Claude API Rate Limits and Costs
- **The problem:** Each chat message costs tokens. Tool use adds more tokens (tool schemas in every request). Streaming responses have per-minute limits.
- **Warning signs:** 429 rate limit errors. Monthly bill surprises.
- **Prevention:** Use Claude Sonnet (not Opus) for the assistant — good quality at lower cost. Implement conversation history trimming (keep last N messages). Cache common queries. Add rate limiting per user session.
- **Phase:** Phase 6 (AI assistant)

### Tool Use Latency
- **The problem:** A single user question may trigger 3-5 tool calls. Each tool call means an API round-trip. Total latency can be 5-10 seconds.
- **Warning signs:** Chat feels slow. Users give up waiting.
- **Prevention:** Stream the response so users see partial output immediately. Optimize tool responses (return only needed fields). Consider parallel tool calls where possible. Show "Fetching weather data..." indicators.
- **Phase:** Phase 6 (AI assistant)

### Hallucinating Weather Data
- **The problem:** If the AI doesn't use tools for every weather claim, it may generate plausible but incorrect data from training data.
- **Warning signs:** AI gives specific numbers without making tool calls. Data doesn't match dashboard.
- **Prevention:** System prompt: "NEVER state weather conditions, temperatures, or ocean data without first calling the appropriate tool. If you cannot fetch data, say so explicitly." Include this as a hard rule in the AI agent configuration.
- **Phase:** Phase 6 (AI assistant system prompt)

### Context Window Management
- **The problem:** Long chat conversations accumulate tokens. Tool call results are verbose (full weather JSON). Context window fills up, responses degrade.
- **Warning signs:** Responses become less coherent. Earlier context is forgotten.
- **Prevention:** Trim conversation history to last 10-15 messages. Summarize tool results before adding to history. Reset conversation option in UI. Don't store raw API responses in chat history — only the AI's summary.
- **Phase:** Phase 6 (AI assistant)

## Deployment Pitfalls

### Vercel Serverless Cold Starts
- **The problem:** API routes on Vercel have cold start latency (100-500ms). First request after idle period is slower. MCP server initialization compounds this.
- **Warning signs:** First dashboard load is noticeably slow. Subsequent loads are fast.
- **Prevention:** Use edge runtime where possible. Keep MCP server initialization lightweight. Consider Vercel's "always warm" option for critical routes. Implement client-side optimistic UI while data loads.
- **Phase:** Phase 7 (Deployment)

### API Key Management
- **The problem:** Mapbox token and Anthropic API key need to be in environment variables. Mapbox token is exposed to the client (necessary for map rendering). Anthropic key must stay server-side.
- **Warning signs:** API key in source code. Anthropic calls from browser (key leaked).
- **Prevention:** Mapbox: use URL-restricted token (restrict to your domain). Anthropic: server-side only, never in `NEXT_PUBLIC_*` env vars. Use Vercel environment variables for all keys.
- **Phase:** Phase 7 (Deployment)

### CORS Issues with NOAA
- **The problem:** Browser-based NOAA API calls may hit CORS restrictions. NDBC endpoints don't always set proper CORS headers.
- **Warning signs:** Browser console shows CORS errors. Data fetches fail from client.
- **Prevention:** Always fetch NOAA data server-side through Next.js API routes. Never call NOAA endpoints directly from the browser. This also centralizes error handling and caching.
- **Phase:** Phase 1 (Architecture — server-side data fetching)

## Summary: Phase-Mapped Pitfalls

| Phase | Critical Pitfalls |
|-------|-------------------|
| Phase 1 | NDBC data format, Weather.gov reliability, MCP lifecycle, CORS |
| Phase 2 | Stale buoy data, time zones, unit conversion |
| Phase 3 | Auto-refresh flicker, mobile HUD layout |
| Phase 4 | Map marker performance |
| Phase 5 | Geolocation permissions |
| Phase 6 | AI hallucination, tool latency, context management, costs |
| Phase 7 | Cold starts, API key security |
