# Plan 01-05 Summary: Caching Layer

**Status:** Complete
**Duration:** ~5 minutes

## What was done

### Task 1: Implement in-memory cache with TTL
- `cachedFetch<T>(key, fetcher, ttlMs)` — generic cache wrapper
- Default TTL: 5 minutes (300,000ms)
- In-flight request deduplication via separate Promise map
- Failed fetches NOT cached (removed from inflight, re-thrown)
- `clearCache(prefix?)` for targeted or full cache invalidation

### Task 2: Integrate cache into all tool functions
- **Weather tools**: cached with keys like `weather:current:45.5:-122.6`, 5-min TTL
- **Buoy tools**: cached with key `buoy:station:{stationId}`, 5-min TTL
  - getBuoyObservations and getBuoyHistory share the same fetch cache
- **Location tools**: cached with key `location:resolve:{query}`, 24-hour TTL

## Verification
- [x] `npx tsc --noEmit` passes
- [x] First getCurrentWeather call: 778ms, second call: 0ms (cached)
- [x] Same data returned on cache hit
- [x] Cache wraps raw fetch, not ToolResult (errors not cached)

## Artifacts produced
| File | Lines | Purpose |
|------|-------|---------|
| src/lib/cache.ts | 48 | In-memory cache with TTL + deduplication |
| src/lib/tools/weather.ts | (modified) | Added cachedFetch to all 3 fetch calls |
| src/lib/tools/buoys.ts | (modified) | Added cachedFetch via shared fetchStationText |
| src/lib/tools/location.ts | (modified) | Added cachedFetch with 24h TTL |
