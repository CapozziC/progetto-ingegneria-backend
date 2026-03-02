export class HttpTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "HttpTimeoutError";
  }
}

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
