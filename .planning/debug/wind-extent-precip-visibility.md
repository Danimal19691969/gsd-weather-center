---
status: awaiting_human_verify
trigger: "Wind animation stays confined to initial rectangle on zoom-out; precip toggle renders nothing"
created: 2026-03-09T00:00:00Z
updated: 2026-03-09T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED - Both wind and precip have a "poisoned viewport key" bug where failed fetches set the cache key before the fetch completes, blocking all future retries for the same viewport.
test: Wrote failing test that confirmed the poisoned key behavior, then fixed and verified.
expecting: After fix, failed fetches allow retries and successful fetches correctly set the key.
next_action: Await human verification of fix in browser.

## Symptoms

expected: Wind fills viewport after zoom-out; precip renders when toggled on
actual: Wind stays in original rectangle; precip invisible
errors: No console errors - silent rendering failures
reproduction: Load map, toggle wind on (see rectangle), zoom out (stays confined). Toggle precip on (nothing visible).
started: After recent rate-limit fixes

## Eliminated

- hypothesis: Wind field interpolation bounds are wrong after zoom
  evidence: WindField.interpolate() correctly uses grid bounds from API response; field bounds match requested viewport
  timestamp: 2026-03-09T00:00:30Z

- hypothesis: moveend event doesn't fire or fires with stale bounds
  evidence: moveend handler correctly captures current bounds via m.getBounds(); stabilization timer correctly debounces
  timestamp: 2026-03-09T00:00:30Z

- hypothesis: PrecipField rendering math is broken
  evidence: All existing precip-field.test.ts and precip-rendering.test.ts tests pass; renderToBuffer produces correct RGBA output
  timestamp: 2026-03-09T00:00:30Z

## Evidence

- timestamp: 2026-03-09T00:00:10Z
  checked: windFetcher.ts fetchWind() function
  found: state.lastViewportKey is set to the new key BEFORE the async fetch completes (line 119). If fetch fails (returns null), the key remains set, blocking all future retries for the same viewport.
  implication: This is the root cause of wind staying confined - if initial fetch at zoomed-out bounds fails (rate limit, network error), the key is poisoned and subsequent moveend events at the same viewport skip the fetch entirely.

- timestamp: 2026-03-09T00:00:10Z
  checked: windFetcher.ts createWindFetcher() function
  found: Same poisoned-key pattern: lastKey = key is set before fetch completes (line 157).
  implication: Both the global fetchWind and the test-isolated createWindFetcher have the same bug.

- timestamp: 2026-03-09T00:00:15Z
  checked: useLoadPrecip.ts fetchGrid callback
  found: lastKeyRef.current = key is set inside setTimeout but BEFORE the fetch promise resolves (line 38). If the API call fails, the key is poisoned and subsequent calls with the same bounds are skipped.
  implication: Same poisoned-key bug as wind. If the first precip grid fetch fails, the precip grid is never loaded for that viewport.

- timestamp: 2026-03-09T00:00:20Z
  checked: Wrote failing test "failed fetch does not poison viewport key for future fetches"
  found: Test confirmed the bug - second call with same bounds returned null (SKIP) even though the first fetch failed. Console output showed "WIND VIEWPORT UNCHANGED - SKIP FETCH" on second attempt.
  implication: Bug definitively confirmed via test.

- timestamp: 2026-03-09T00:00:40Z
  checked: Fixed both fetchers, re-ran test
  found: All 11 new tests pass. Full suite of 195 tests passes with 0 failures.
  implication: Fix is correct and introduces no regressions.

## Resolution

root_cause: Both wind and precip fetchers set their "last viewport key" (cache/dedup key) BEFORE the async fetch completes. When a fetch fails (due to rate limiting, network errors, or API errors), the key is already recorded as "done." Subsequent calls with the same viewport bounds match the poisoned key and are skipped, preventing the data from ever being fetched for that viewport. This explains both bugs: wind stays confined to the initial field (zoomed-out viewport key gets poisoned on failure) and precip never renders (grid fetch key gets poisoned on failure).

fix: Moved the key assignment to AFTER successful fetch completion in all three locations:
1. windFetcher.ts fetchWind() - state.lastViewportKey = key moved inside the async callback, only on success
2. windFetcher.ts createWindFetcher() - lastKey = key moved inside the async callback, only on success
3. useLoadPrecip.ts fetchGrid() - lastKeyRef.current = key moved inside the .then() success branch
Added diagnostic logging throughout both wind and precip paths for future debugging.

verification: All 195 tests pass (including 11 new tests). The key "failed fetch does not poison viewport key" test now passes, confirming the fix prevents key poisoning.

files_changed:
- src/lib/wind/windFetcher.ts (key assignment moved to after successful fetch)
- src/hooks/useLoadPrecip.ts (key assignment moved to after successful fetch, added logging)
- src/components/map/WindParticleLayer.tsx (added diagnostic logging)
- src/components/map/PrecipLayer.tsx (added diagnostic logging)
- src/lib/__tests__/wind-extent.test.ts (new: 6 tests for wind field regeneration)
- src/lib/__tests__/precip-visibility.test.ts (new: 5 tests for precip rendering)
