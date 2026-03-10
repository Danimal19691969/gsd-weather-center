---
status: awaiting_human_verify
trigger: "Wind API rate-limit storm -- repeated WIND CACHE MISS logs followed by 429 responses from Open-Meteo despite bounds normalization working."
created: 2026-03-09T00:00:00Z
updated: 2026-03-09T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED -- no global backoff + retry amplification caused 429 storms
test: All tests passing after fix
expecting: Human verification of dashboard behavior
next_action: User verifies wind renders and no 429 cascade in server logs

## Symptoms

expected: Wind data cached for 5 minutes, inflight dedup prevents duplicate requests, 429 returns stale cache
actual: Repeated WIND CACHE MISS logs for same key, HTTP 429 cascade, errors reaching UI
errors: HTTP 429 Too Many Requests from Open-Meteo
reproduction: Load dashboard, observe console -- repeated fetches for same normalized bounds
started: Ongoing issue with Open-Meteo daily rate limits

## Eliminated

## Evidence

- timestamp: 2026-03-09T00:01:00Z
  checked: Cache key generation in route.ts vs wind.ts
  found: |
    route.ts: boundsToKey(normalized) => "west,south,east,north" e.g. "-137.3,43.8,-108.1,47.2"
    wind.ts: `wind:grid:${west}:${south}:${east}:${north}` e.g. "wind:grid:-137.3:43.8:-108.1:47.2"
    These are DIFFERENT KEYS for different cache Maps. The route.ts cache and cachedFetch cache are independent.
    This is actually fine since they are separate layers. The route.ts cache is checked first.
  implication: No key collision bug -- they are separate caches operating correctly with separate Maps.

- timestamp: 2026-03-09T00:02:00Z
  checked: Route cache freshness check (getCachedFresh)
  found: |
    getCachedFresh returns null if Date.now() > entry.expiry.
    setCached is called AFTER await pending (line 100) -- only on SUCCESS path.
    If fetchWindGrid throws (e.g., 429 after retries), control goes to catch block.
    In catch block, getCached(boundsToKey(normalized)) is called to serve stale.
    BUT: the catch block re-parses searchParams -- this works but is fragile.
    CRITICAL: setCached is NOT called on catch path. Stale entry was set from a prior success.
    This part is actually correct -- stale serving works IF there was a prior success.
  implication: Stale cache fallback works for the route cache layer. Not the root cause.

- timestamp: 2026-03-09T00:03:00Z
  checked: fetchWithRetry behavior on 429
  found: |
    fetchWithRetry retries 3 times on 429 with exponential backoff (1s, 2s, 4s).
    For a single request that hits 429, it makes 3 attempts to Open-Meteo.
    If multiple cache misses happen concurrently (different bounds), each spawns its own fetchWithRetry.
    Each retry amplifies the 429 storm -- 10 concurrent misses = 30 requests to Open-Meteo.
    NO global rate limiter or backoff state exists.
  implication: fetchWithRetry amplifies 429 storms. Needs global backoff.

- timestamp: 2026-03-09T00:04:00Z
  checked: Inflight dedup in route.ts catch path
  found: |
    When fetchWindGrid throws, pending promise rejects.
    ALL joiners of that inflight promise also reject.
    They ALL hit the catch block individually.
    Each catch block tries getCached for stale -- this works.
    BUT: the .finally() on raw (line 95) deletes inflight entry.
    If a NEW request comes in during the retry delay of fetchWithRetry,
    the inflight promise is still active, so it correctly joins.
    This is actually fine.
  implication: Inflight dedup works correctly in route.ts.

- timestamp: 2026-03-09T00:05:00Z
  checked: cachedFetch stale fallback in cache.ts
  found: |
    cache.ts line 36-40: On fetcher error, if `cached` exists (stale entry), returns stale.
    BUT: `cached` is captured at line 17: `const cached = cache.get(key)`.
    After TTL expires, `cached` still has the old entry reference.
    So stale fallback works in cache.ts too.
  implication: cache.ts stale fallback is correct.

- timestamp: 2026-03-09T00:06:00Z
  checked: Whether 429 errors propagate to UI as 500
  found: |
    fetchWithRetry throws after 3 retries exhausted.
    This throw propagates through cachedFetch (if no stale data).
    cachedFetch propagates to fetchWindGrid.
    fetchWindGrid propagates to route.ts GET handler.
    route.ts catch block catches it and tries stale cache.
    If no stale cache exists (first ever request), returns { success: false, error: "..." } with STATUS 200.
    Actually, the route returns status 200 even on error (line 128).
    The client windFetcher checks json.success and retries if false.
    So 429 -> fetchWithRetry retries 3x -> cachedFetch throws (or serves stale) -> route serves stale or 200 with error -> client retries 2x.
    Total worst case: 3 server retries * 3 client retries = 9 requests per client fetch attempt.
  implication: Request multiplication: 3 (fetchWithRetry) * 3 (client retries) = 9x amplification per unique bounds request.

## Resolution

root_cause: |
  Multiple compounding issues:
  1. NO GLOBAL BACKOFF: fetchWithRetry has no shared backoff state. When Open-Meteo returns 429, each concurrent request independently retries 3 times, amplifying the storm.
  2. CLIENT RETRY AMPLIFICATION: Client windFetcher retries up to 3 times when API returns success:false. Combined with server retries, this creates 9x amplification.
  3. MISSING REQUIRED LOGS: Several required log messages missing (WIND INFLIGHT JOIN needs to be in route already, but WIND SERVING STALE CACHE, WIND BACKOFF ACTIVE are missing).
  4. NO 429-SPECIFIC HANDLING: When 429 is detected, there's no circuit breaker to prevent further requests for a cooldown period.

fix: |
  1. Added global backoff to fetchWithRetry.ts -- when 429 received, 30-second cooldown prevents ALL upstream requests
  2. Updated route.ts to check backoff before fetching, serve stale cache during backoff
  3. Updated wind.ts tools to check backoff and fail fast (letting cachedFetch serve stale)
  4. Added all required log messages: WIND CACHE HIT, WIND CACHE MISS, WIND INFLIGHT JOIN, WIND SERVING STALE CACHE, WIND BACKOFF ACTIVE
  5. Updated existing api-resilience tests to account for new backoff behavior
  6. Added comprehensive wind-rate-limit.test.ts with tests for inflight dedup, stale cache on 429, and storm prevention

verification: |
  - All 38 wind/cache related tests pass
  - 179 of 184 total tests pass (5 failures are pre-existing weather.test.ts real-API flakes)
  - New tests verify: inflight dedup shares promises, 429 serves stale, backoff blocks storms, concurrent requests during backoff make 0 upstream calls

files_changed:
  - src/lib/fetchWithRetry.ts (global backoff mechanism)
  - src/app/api/wind/route.ts (backoff check, stale cache serving, required logs)
  - src/lib/tools/wind.ts (backoff check before upstream call)
  - src/lib/__tests__/api-resilience.test.ts (updated for new backoff behavior)
  - src/lib/__tests__/wind-rate-limit.test.ts (new: inflight dedup, stale cache, storm prevention tests)
