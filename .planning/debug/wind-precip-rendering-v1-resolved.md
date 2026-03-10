---
status: awaiting_human_verify
trigger: "Wind animation not showing, precipitation layer broken (square blocks, limited coverage, no time animation, blocks wind)"
created: 2026-03-09T00:00:00Z
updated: 2026-03-09T00:02:00Z
---

## Current Focus

hypothesis: Three root causes identified and fixed -- canvas sizing, block rendering, layer z-index
test: All 60 related tests pass, TypeScript compiles clean
expecting: User confirms wind particles visible and precip renders smoothly in browser
next_action: Await human verification

## Symptoms

expected:
- Wind: animated particle vectors covering entire viewport using u/v wind velocity fields, responsive to pan/zoom
- Precip: smooth precipitation patterns with full viewport coverage, correct colors for rain/snow/sleet/freezing rain, animated when time slider changes, should not obscure wind layer

actual:
- Wind: particles not visible at all
- Precip: square blocks instead of smooth gradients, only appears around Portland (selected location) not full viewport, does not animate with time slider, wind animation disappears when precip layer is active

errors:
- Open-Meteo returning HTTP 429 (rate limit exceeded)
- Server logs: "Open-Meteo wind: 429", "Wind service temporarily unavailable"

reproduction:
- Toggle wind ON - no particles appear
- Toggle precip ON - square blocks around Portland only
- Move time slider - precip doesn't change
- Enable both layers - wind disappears

started: Broke after adding weather icon system and precipitation visualization system.

## Eliminated

## Evidence

- timestamp: 2026-03-09T00:00:30Z
  checked: Canvas creation in WindParticleLayer.tsx and PrecipLayer.tsx
  found: Both canvases set canvas.width = mapCanvas.width (device pixels) but do NOT set canvas.style.width or canvas.style.height. On retina displays, mapCanvas.width is 2x the CSS container width. Without CSS sizing, the overlay canvas renders at device-pixel CSS dimensions (2x too large). Map project()/unproject() return CSS pixels, causing coordinate mismatch.
  implication: Wind particles spawn in device-pixel space but get projected in CSS-pixel space -- they appear outside the visible area or at wrong coordinates, making them invisible.

- timestamp: 2026-03-09T00:00:35Z
  checked: PrecipField.renderToBuffer() in PrecipField.ts
  found: STEP=4 samples every 4th pixel, then fills uniform STEP x STEP blocks. Combined with canvas oversizing, blocks appear as 8x8 CSS pixel squares with flat color.
  implication: Square block artifacts caused by fill-block approach instead of per-pixel interpolation.

- timestamp: 2026-03-09T00:00:40Z
  checked: Canvas z-index and layer stacking
  found: Neither canvas has z-index set. PrecipLayer canvas appended after WindParticleLayer canvas, so it sits on top. The oversized precip canvas completely covers the wind canvas.
  implication: Wind disappears when precip is active because the precip canvas occludes it.

- timestamp: 2026-03-09T00:00:45Z
  checked: Time slider pipeline
  found: precipField useMemo depends on [grid, currentHour]. renderPrecip useCallback depends on [precipField, enabled]. Effect re-renders on [renderPrecip]. Chain is correct -- when currentHour changes, a new PrecipField is built with different hour data, renderPrecip reference changes, effect re-fires. The rendering just wasn't visible due to canvas sizing issues.
  implication: Time slider animation should work once canvas sizing is fixed.

- timestamp: 2026-03-09T00:01:00Z
  checked: Viewport bounds usage in data fetching
  found: Both PrecipLayer.triggerFetch() and WindParticleLayer.maybeFetchWind() correctly use map.getBounds() to get viewport bounds. precipGrid.generateGridPoints() generates points across the full viewport at resolution-based intervals. Data pipeline is correct.
  implication: The "only around Portland" symptom was likely caused by canvas mismatch (rendering in device-pixel space showed only a portion of the map area as if zoomed in), not by incorrect data fetching.

- timestamp: 2026-03-09T00:01:30Z
  checked: TypeScript compilation and test suite
  found: tsc --noEmit clean. 60/60 related tests pass. 5 new tests added for smooth rendering and viewport bounds coverage.
  implication: Fixes are type-safe and verified by automated tests.

## Resolution

root_cause: |
  THREE ROOT CAUSES:

  1. CANVAS SIZING MISMATCH (wind invisible + precip mispositioned):
     Both overlay canvases set canvas.width/height = mapCanvas.width/height which returns
     device pixel dimensions (e.g., 1600x1200 on a 2x retina display for an 800x600 container).
     Without setting canvas.style.width/height, the canvas element renders at device-pixel CSS
     dimensions (2x too large). Meanwhile, map.project()/unproject() return CSS pixel coordinates.
     This mismatch caused:
     - Wind particles to spawn and draw at wrong coordinates (invisible)
     - Precipitation to render in a 2x-zoomed-in view (appearing as "only around Portland")

  2. BLOCK RENDERING IN PrecipField.renderToBuffer():
     Used STEP=4 with uniform block fill (every 4x4 pixel block gets identical color).
     This produced visible square artifacts instead of smooth gradients.

  3. NO Z-INDEX ON OVERLAY CANVASES:
     Both canvases lacked z-index. Precip canvas (appended second) sat directly on top of
     wind canvas. Combined with oversized canvas, precip completely occluded wind.

fix: |
  1. WindParticleLayer.tsx: Set canvas dimensions to CSS pixels (mapCanvas.clientWidth/clientHeight)
     instead of device pixels (mapCanvas.width/height). Added canvas.style.width/height to match.
     Added z-index: 1.

  2. PrecipLayer.tsx: Same CSS pixel sizing fix. Added z-index: 2.

  3. PrecipField.ts: Replaced block-fill renderer with bilinear interpolation between sample
     points. Still samples at STEP=4 intervals for performance, but interpolates smoothly
     between sample points to fill every pixel individually. No more square blocks.

  4. Both ResizeObservers updated to use clientWidth/clientHeight and set CSS dimensions.

verification: |
  - TypeScript compiles clean (npx tsc --noEmit)
  - 60/60 related tests pass (precip-field, precip-rendering, precip-grid, wind-visual, wind-fetch, wind-bounds)
  - 5 new tests verify: smooth gradient output, no block artifacts, viewport bounds coverage, hour-change responsiveness
  - Pre-existing weather.test.ts failures (5) are due to live API rate limiting, unrelated to changes

files_changed:
  - src/components/map/WindParticleLayer.tsx
  - src/components/map/PrecipLayer.tsx
  - src/lib/precip/PrecipField.ts
  - src/lib/__tests__/precip-rendering.test.ts (new)
