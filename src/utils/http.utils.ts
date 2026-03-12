/**
 * Custom error class representing a timeout error that occurs when an HTTP request takes longer than the specified timeout duration.
 *  This error is thrown when a request exceeds the allowed time limit, allowing for better error handling and debugging 
 * in scenarios where network latency or server response times may be an issue.
 * @extends Error 
 */
export class HttpTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "HttpTimeoutError";
  }
}
/**
 * Fetches JSON data from a URL with a timeout.
 * @param url The URL to fetch data from.
 * @param opts Options for the fetch request, including a timeout duration.
 * @returns A promise resolving to the fetched data or an error.
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  opts: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; json?: T; text?: string }> {
  const { timeoutMs = 12_000, ...init } = opts;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const json = (await res.json()) as T;
      return { ok: res.ok, status: res.status, json };
    }

    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") throw new HttpTimeoutError();
    throw e;
  } finally {
    clearTimeout(id);
  }
}
