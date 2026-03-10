/**
 * Fetch with retry and exponential backoff for rate-limited APIs.
 * Retries on 429, 5xx, and network errors. Does NOT retry on other 4xx.
 *
 * Includes a global backoff mechanism: when a 429 is received, ALL requests
 * through this module respect a cooldown period before hitting the upstream.
 */

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Global backoff state — prevents request storms when upstream returns 429.
// Survives HMR via globalThis.
// ---------------------------------------------------------------------------
const BACKOFF_KEY = "__fetchWithRetryBackoff";
const BACKOFF_DURATION_MS = 30_000; // 30-second cooldown after 429

interface BackoffState {
  until: number; // timestamp when backoff expires
}

function getBackoffState(): BackoffState {
  const g = globalThis as Record<string, unknown>;
  if (!g[BACKOFF_KEY]) {
    g[BACKOFF_KEY] = { until: 0 };
  }
  return g[BACKOFF_KEY] as BackoffState;
}

/** Check if global backoff is active. */
export function isBackoffActive(): boolean {
  return Date.now() < getBackoffState().until;
}

/** Activate global backoff for the configured duration. */
function activateBackoff(): void {
  const state = getBackoffState();
  state.until = Date.now() + BACKOFF_DURATION_MS;
  console.log("WIND BACKOFF ACTIVE — cooling down for", BACKOFF_DURATION_MS / 1000, "seconds");
}

/** Reset backoff (for testing). */
export function resetBackoff(): void {
  getBackoffState().until = 0;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  options: RetryOptions & RequestInit = {}
): Promise<Response> {
  const { retries = DEFAULT_RETRIES, baseDelayMs = DEFAULT_BASE_DELAY_MS, ...fetchInit } = options;

  // If global backoff is active, fail fast — let caller serve stale cache
  if (isBackoffActive()) {
    throw new Error("HTTP 429: Global backoff active — skipping upstream request");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    // Check backoff before each retry too
    if (attempt > 0 && isBackoffActive()) {
      throw new Error("HTTP 429: Global backoff activated during retries");
    }

    try {
      const res = await fetch(url, fetchInit);

      if (res.ok) return res;

      if (res.status === 429) {
        activateBackoff();
      }

      if (!isRetryable(res.status)) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Network errors are retryable — non-retryable HTTP errors were already thrown above
      if (lastError.message.startsWith("HTTP 4") && !lastError.message.startsWith("HTTP 429")) {
        throw lastError;
      }
    }

    // Exponential backoff before retry
    if (attempt < retries - 1) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error("fetchWithRetry: all retries exhausted");
}
