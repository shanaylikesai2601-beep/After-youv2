import type { TinyFishConfig } from "@/server/tinyfish/config";
import { tinyFishServiceUrl } from "@/server/tinyfish/config";
import { logTinyFishRequest, parseTinyFishBody, tinyFishErrorBody, validTinyFishUrl } from "@/server/tinyfish/request-utils";

export interface RemoteBrowserSession {
  sessionId: string;
  cdpUrl: string;
}

export interface RemoteBrowserProvider {
  start(url?: string, timeoutSeconds?: number): Promise<RemoteBrowserSession>;
  stop(sessionId: string): Promise<void>;
}

interface TinyFishBrowserResponse { session_id?: unknown; cdp_url?: unknown; }

/** Provides Playwright-compatible TinyFish Browser sessions over CDP. */
export class TinyFishBrowserProvider implements RemoteBrowserProvider {
  constructor(private readonly config: TinyFishConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  async start(url?: string, timeoutSeconds?: number): Promise<RemoteBrowserSession> {
    const endpoint = tinyFishServiceUrl(this.config, "browser");
    const targetUrl = validTinyFishUrl(url);
    const payload = { ...(targetUrl ? { url: targetUrl } : {}), ...(timeoutSeconds ? { timeout_seconds: timeoutSeconds } : {}) };
    logTinyFishRequest(endpoint, payload);
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: { "X-API-Key": this.config.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await parseTinyFishBody(response);
    logTinyFishRequest(endpoint, payload, { status: response.status, body });
    if (!response.ok || !isBrowserResponse(body) || typeof body.session_id !== "string" || typeof body.cdp_url !== "string") throw new Error(`TinyFish Browser failed (${response.status}): ${tinyFishErrorBody(body)}`);
    return { sessionId: body.session_id, cdpUrl: body.cdp_url };
  }

  async stop(sessionId: string): Promise<void> {
    const endpoint = `${tinyFishServiceUrl(this.config, "browser")}/${encodeURIComponent(sessionId)}`;
    logTinyFishRequest(endpoint, {});
    const response = await this.fetchImpl(endpoint, { method: "DELETE", headers: { "X-API-Key": this.config.apiKey } });
    const body = await parseTinyFishBody(response);
    logTinyFishRequest(endpoint, {}, { status: response.status, body });
    if (!response.ok && response.status !== 404) throw new Error(`TinyFish Browser session cleanup failed (${response.status}): ${tinyFishErrorBody(body)}`);
  }
}

function isBrowserResponse(value: unknown): value is TinyFishBrowserResponse { return typeof value === "object" && value !== null; }
