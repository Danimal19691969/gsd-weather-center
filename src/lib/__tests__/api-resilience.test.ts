import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Tests for API resilience: retry with backoff, stale cache serving
// ---------------------------------------------------------------------------

describe("fetchWithRetry", () => {
  let fetchWithRetry: typeof import("@/lib/fetchWithRetry").fetchWithRetry;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/lib/fetchWithRetry");
    fetchWithRetry = mod.fetchWithRetry;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data on successful first attempt", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "ok" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("https://example.com/api");
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds on second attempt", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: "Too Many Requests" })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "ok" }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("https://example.com/api", {
      retries: 2,
      baseDelayMs: 10,
    });
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 server errors", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Internal Server Error" })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "ok" }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("https://example.com/api", {
      retries: 2,
      baseDelayMs: 10,
    });
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchWithRetry("https://example.com/api", { retries: 3, baseDelayMs: 10 })
    ).rejects.toThrow("429");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 4xx errors other than 429", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchWithRetry("https://example.com/api", { retries: 3, baseDelayMs: 10 })
    ).rejects.toThrow("400");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on network errors (fetch rejection)", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "ok" }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetchWithRetry("https://example.com/api", {
      retries: 2,
      baseDelayMs: 10,
    });
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("Wind API stale cache", () => {
  it("wind route serves stale cache when upstream returns 429", async () => {
    // This test verifies the wind API route's cache behavior
    // The wind route should serve stale data when the upstream API fails
    // Rather than returning 500

    // This tests the cached response behavior
    const { cachedFetch, clearCache } = await import("@/lib/cache");
    clearCache();

    // First call succeeds — populate cache
    let callCount = 0;
    const result1 = await cachedFetch(
      "test-stale",
      async () => {
        callCount++;
        return { value: "fresh" };
      },
      50 // short TTL to expire quickly
    );
    expect(result1).toEqual({ value: "fresh" });
    expect(callCount).toBe(1);

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 100));

    // Second call fails — should serve stale data
    const result2 = await cachedFetch(
      "test-stale",
      async () => {
        callCount++;
        throw new Error("429 rate limited");
      },
      50
    );
    expect(result2).toEqual({ value: "fresh" }); // stale data served
    expect(callCount).toBe(2);
  });
});

describe("Client wind fetcher retry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("wind fetcher retries on failed API response", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: false, error: "rate limited" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              west: -123,
              south: 45,
              east: -122,
              north: 46,
              cols: 2,
              rows: 2,
              dx: 1,
              dy: 1,
              u: [1, 2, 3, 4],
              v: [1, 2, 3, 4],
              speed: [1, 2, 3, 4],
              timestamp: Date.now(),
            },
          }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const fetcher = createWindFetcher();
    const fieldPromise = fetcher(
      { west: -123, south: 45, east: -122, north: 46 },
      true
    );

    // Advance past the retry delay
    await vi.advanceTimersByTimeAsync(10_000);

    const field = await fieldPromise;
    expect(field).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
