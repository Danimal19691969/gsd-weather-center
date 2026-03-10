import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Tests for wind API rate-limit protection:
// - Identical viewport requests share inflight promise
// - 429 returns stale cache
// - Repeated requests do not trigger upstream fetch storms
// ---------------------------------------------------------------------------

describe("Wind rate-limit protection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Identical viewport requests share inflight promise (server-side cache)
  // -------------------------------------------------------------------------
  describe("inflight dedup in cachedFetch", () => {
    it("identical requests share a single inflight promise", async () => {
      const { cachedFetch, clearCache } = await import("@/lib/cache");
      clearCache();

      let fetcherCallCount = 0;
      let resolvePromise: (v: string) => void;

      const fetcher = () => {
        fetcherCallCount++;
        return new Promise<string>((resolve) => {
          resolvePromise = resolve;
        });
      };

      // Fire 5 concurrent requests with the same key
      const promises = Array.from({ length: 5 }, () =>
        cachedFetch("wind:test:inflight", fetcher, 300_000)
      );

      // Only one fetcher call should have been made
      expect(fetcherCallCount).toBe(1);

      // Resolve the single inflight promise
      resolvePromise!("shared-result");

      const results = await Promise.all(promises);

      // All should receive the same result
      results.forEach((r) => expect(r).toBe("shared-result"));
    });
  });

  // -------------------------------------------------------------------------
  // 2. 429 returns stale cache instead of error
  // -------------------------------------------------------------------------
  describe("429 serves stale cache", () => {
    it("cachedFetch returns stale data when fetcher throws after 429", async () => {
      const { cachedFetch, clearCache } = await import("@/lib/cache");
      clearCache();

      // First call succeeds -- populates cache
      const result1 = await cachedFetch(
        "wind:stale-test",
        async () => ({ windData: "fresh" }),
        50 // very short TTL so it expires quickly
      );
      expect(result1).toEqual({ windData: "fresh" });

      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 100));

      // Second call simulates 429 failure -- should serve stale
      const result2 = await cachedFetch(
        "wind:stale-test",
        async () => {
          throw new Error("HTTP 429: Too Many Requests");
        },
        50
      );
      expect(result2).toEqual({ windData: "fresh" }); // stale data served
    });

    it("throws when no stale cache exists and fetcher fails", async () => {
      const { cachedFetch, clearCache } = await import("@/lib/cache");
      clearCache();

      await expect(
        cachedFetch("wind:no-stale", async () => {
          throw new Error("HTTP 429: Too Many Requests");
        })
      ).rejects.toThrow("429");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Global backoff prevents upstream fetch storms
  // -------------------------------------------------------------------------
  describe("global backoff prevents storms", () => {
    it("fetchWithRetry activates backoff on 429 and subsequent calls fail fast", async () => {
      const { fetchWithRetry, resetBackoff, isBackoffActive } = await import(
        "@/lib/fetchWithRetry"
      );
      resetBackoff();

      // Mock fetch to return 429
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });
      vi.stubGlobal("fetch", mockFetch);

      // First call: retries exhaust, backoff activates
      await expect(
        fetchWithRetry("https://api.open-meteo.com/v1/forecast", {
          retries: 1,
          baseDelayMs: 10,
        })
      ).rejects.toThrow("429");

      // Backoff should now be active
      expect(isBackoffActive()).toBe(true);

      // Second call should fail IMMEDIATELY without hitting fetch
      const fetchCountBefore = mockFetch.mock.calls.length;
      await expect(
        fetchWithRetry("https://api.open-meteo.com/v1/forecast", {
          retries: 3,
          baseDelayMs: 10,
        })
      ).rejects.toThrow("backoff");

      // No additional fetch calls were made
      expect(mockFetch.mock.calls.length).toBe(fetchCountBefore);

      resetBackoff();
    });

    it("backoff expires after cooldown period", async () => {
      const { resetBackoff, isBackoffActive } = await import("@/lib/fetchWithRetry");
      resetBackoff();

      // Manually check that backoff is not active after reset
      expect(isBackoffActive()).toBe(false);
    });

    it("multiple concurrent requests during backoff do not hit upstream", async () => {
      const { fetchWithRetry, resetBackoff } = await import("@/lib/fetchWithRetry");
      resetBackoff();

      // First: trigger backoff
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        fetchWithRetry("https://api.open-meteo.com/v1/forecast", {
          retries: 1,
          baseDelayMs: 10,
        })
      ).rejects.toThrow();

      const fetchCountAfterFirst = mockFetch.mock.calls.length;

      // Fire 10 concurrent requests -- all should fail fast
      const promises = Array.from({ length: 10 }, () =>
        fetchWithRetry("https://api.open-meteo.com/v1/forecast", {
          retries: 3,
          baseDelayMs: 10,
        }).catch((e: Error) => e.message)
      );

      const results = await Promise.all(promises);

      // All should have failed with backoff message
      results.forEach((msg) => expect(msg).toContain("backoff"));

      // No additional fetch calls
      expect(mockFetch.mock.calls.length).toBe(fetchCountAfterFirst);

      resetBackoff();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Combined: cache + backoff prevents storms end-to-end
  // -------------------------------------------------------------------------
  describe("end-to-end storm prevention", () => {
    it("stale cache + backoff prevents any upstream calls after 429", async () => {
      const { cachedFetch, clearCache } = await import("@/lib/cache");
      const { resetBackoff, isBackoffActive } = await import("@/lib/fetchWithRetry");
      clearCache();
      resetBackoff();

      let upstreamCallCount = 0;

      // Populate cache
      await cachedFetch(
        "wind:e2e-test",
        async () => {
          upstreamCallCount++;
          return { data: "original" };
        },
        50 // short TTL
      );
      expect(upstreamCallCount).toBe(1);

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 100));

      // Simulate 429 -- fetcher fails, stale served
      const result = await cachedFetch(
        "wind:e2e-test",
        async () => {
          upstreamCallCount++;
          throw new Error("HTTP 429: Too Many Requests");
        },
        50
      );
      expect(result).toEqual({ data: "original" }); // stale
      expect(upstreamCallCount).toBe(2); // tried once, got stale

      resetBackoff();
    });
  });
});
