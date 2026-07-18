import type { TinyFishConfig } from "@/server/tinyfish/config";
import { tinyFishServiceUrl } from "@/server/tinyfish/config";
import { logTinyFishRequest, parseTinyFishBody, tinyFishErrorBody } from "@/server/tinyfish/request-utils";
import type { SearchProvider, SearchResult } from "@/server/tools/search/search-provider";

interface TinyFishSearchResponse {
  results?: Array<{ title?: unknown; url?: unknown; snippet?: unknown; published_date?: unknown }>;
}

/** TinyFish Search adapter kept behind the existing SearchProvider boundary. */
export class TinyFishSearchProvider implements SearchProvider {
  readonly id = "tinyfish" as const;

  constructor(private readonly config: TinyFishConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const url = new URL(tinyFishServiceUrl(this.config, "search"));
    url.searchParams.set("query", query);
    const endpoint = url.toString();
    logTinyFishRequest(endpoint, { query });
    const response = await this.fetchImpl(url, { headers: { "X-API-Key": this.config.apiKey } });
    const body = await parseTinyFishBody(response);
    logTinyFishRequest(endpoint, { query }, { status: response.status, body });
    if (!response.ok) throw new Error(`TinyFish search failed (${response.status}): ${tinyFishErrorBody(body)}`);
    if (!isSearchResponse(body)) throw new Error(`TinyFish search returned an invalid response: ${tinyFishErrorBody(body)}`);
    return (body.results ?? []).flatMap((result) => typeof result.url === "string" ? [{
      title: typeof result.title === "string" ? result.title : result.url,
      url: result.url,
      snippet: typeof result.snippet === "string" ? result.snippet : "",
      publishedAt: typeof result.published_date === "string" ? result.published_date : undefined,
    }] : []).slice(0, limit);
  }
}

function isSearchResponse(value: unknown): value is TinyFishSearchResponse { return typeof value === "object" && value !== null; }
