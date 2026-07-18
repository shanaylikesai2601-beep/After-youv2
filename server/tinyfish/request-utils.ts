/** Returns a URL only when it is an absolute HTTP(S) URL suitable for TinyFish APIs. */
export function validTinyFishUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function parseTinyFishBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

/** Development-only diagnostics intentionally omit request headers and API keys. */
export function logTinyFishRequest(endpoint: string, payload: unknown, response?: { status: number; body: unknown }): void {
  if (process.env.NODE_ENV === "production") return;
  console.info("[TinyFish] request", { endpoint, payload, ...(response ? { responseStatus: response.status, responseBody: response.body } : {}) });
}

export function tinyFishErrorBody(body: unknown): string {
  try { return JSON.stringify(body); } catch { return String(body); }
}
