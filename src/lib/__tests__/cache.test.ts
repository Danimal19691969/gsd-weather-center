import { describe, it, expect, vi, beforeEach } from "vitest";
import { cachedFetch, clearCache } from "@/lib/cache";

describe("Cache Layer", () => {
  beforeEach(() => clearCache());

  it("returns fetcher result on cache miss", async () => {
    const result = await cachedFetch("test:1", async () => "hello");
    expect(result).toBe("hello");
  });

  it("returns cached result on cache hit", async () => {
    const fetcher = vi.fn().mockResolvedValue("data");
    await cachedFetch("test:2", fetcher);
    await cachedFetch("test:2", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns fresh data after TTL expires", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce("old")
      .mockResolvedValueOnce("new");

    const r1 = await cachedFetch("test:3", fetcher, 50); // 50ms TTL
    expect(r1).toBe("old");

    await new Promise((r) => setTimeout(r, 100)); // wait for expiry

    const r2 = await cachedFetch("test:3", fetcher, 50);
    expect(r2).toBe("new");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent requests", async () => {
    let resolvePromise: (v: string) => void;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<string>((r) => { resolvePromise = r; })
    );

    const p1 = cachedFetch("test:4", fetcher);
    const p2 = cachedFetch("test:4", fetcher);

    resolvePromise!("shared");

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("shared");
    expect(r2).toBe("shared");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not cache failed fetches", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("success");

    await expect(cachedFetch("test:5", fetcher)).rejects.toThrow("fail");
    const result = await cachedFetch("test:5", fetcher);
    expect(result).toBe("success");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clearCache removes all entries", async () => {
    const fetcher = vi.fn().mockResolvedValue("data");
    await cachedFetch("test:6a", fetcher);
    await cachedFetch("test:6b", fetcher);

    clearCache();

    await cachedFetch("test:6a", fetcher);
    await cachedFetch("test:6b", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("clearCache with prefix removes only matching entries", async () => {
    const fetcher = vi.fn().mockResolvedValue("data");
    await cachedFetch("weather:1", fetcher);
    await cachedFetch("buoy:1", fetcher);

    clearCache("weather:");

    await cachedFetch("weather:1", fetcher); // should re-fetch
    await cachedFetch("buoy:1", fetcher); // should be cached
    expect(fetcher).toHaveBeenCalledTimes(3); // 2 initial + 1 re-fetch
  });
});
