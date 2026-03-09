/**
 * Fetch with retry and exponential backoff for rate-limited APIs.
 * Retries on 429, 5xx, and network errors. Does NOT retry on other 4xx.
 */

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  options: RetryOptions & RequestInit = {}
): Promise<Response> {
  const { retries = DEFAULT_RETRIES, baseDelayMs = DEFAULT_BASE_DELAY_MS, ...fetchInit } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, fetchInit);

      if (res.ok) return res;

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
