import type { TinyFishConfig } from "@/server/tinyfish/config";
import { tinyFishServiceUrl } from "@/server/tinyfish/config";
import { logTinyFishRequest, parseTinyFishBody, tinyFishErrorBody, validTinyFishUrl } from "@/server/tinyfish/request-utils";

export interface RemoteFetchResult {
  content: string;
  contentType: string;
  finalUrl: string;
  title?: string;
}

export interface RemoteFetchProvider {
  fetch(url: string): Promise<RemoteFetchResult>;
}

interface TinyFishFetchResponse {
  results?: Array<{ url?: unknown; final_url?: unknown; title?: unknown; text?: unknown }>;
  errors?: Array<{ url?: unknown; error?: unknown; message?: unknown }>;
}

/** Maps the generic fetch tool to TinyFish's extraction API for GET requests. */
export class TinyFishFetchProvider implements RemoteFetchProvider {
  constructor(private readonly config: TinyFishConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  async fetch(url: string): Promise<RemoteFetchResult> {
    const validUrl = validTinyFishUrl(url);
    if (!validUrl) throw new Error("TinyFish Fetch requires an absolute http(s) URL");
    const endpoint = tinyFishServiceUrl(this.config, "fetch");
    const payload = { urls: [validUrl], format: "markdown", links: true, image_links: true };
    logTinyFishRequest(endpoint, payload);
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: { "X-API-Key": this.config.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await parseTinyFishBody(response);
    logTinyFishRequest(endpoint, payload, { status: response.status, body });
    if (!isFetchResponse(body)) throw new Error(`TinyFish fetch returned an invalid response: ${tinyFishErrorBody(body)}`);
    const result = body.results?.[0];
    if (!response.ok || !result || typeof result.text !== "string") {
      const error = body.errors?.[0];
      const message = typeof error?.message === "string" ? error.message : typeof error?.error === "string" ? error.error : "No content returned";
      throw new Error(`TinyFish fetch failed (${response.status}): ${message}; response=${tinyFishErrorBody(body)}`);
    }
    return {
      content: result.text,
      contentType: "text/markdown",
      finalUrl: typeof result.final_url === "string" ? result.final_url : typeof result.url === "string" ? result.url : url,
      title: typeof result.title === "string" ? result.title : undefined,
    };
  }
}

function isFetchResponse(value: unknown): value is TinyFishFetchResponse { return typeof value === "object" && value !== null; }
