export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface SearchProvider {
  readonly id: "tavily" | "exa" | "tinyfish";
  search(query: string, limit: number): Promise<SearchResult[]>;
}

export class TavilySearchProvider implements SearchProvider {
  readonly id = "tavily" as const;
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const response = await this.fetchImpl("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: this.apiKey, query, max_results: limit }) });
    if (!response.ok) throw new Error(`Tavily search failed (${response.status})`);
    const body = (await response.json()) as { results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }> };
    return (body.results ?? []).flatMap((result) => result.url ? [{ title: result.title ?? result.url, url: result.url, snippet: result.content ?? "", publishedAt: result.published_date }] : []);
  }
}

export class ExaSearchProvider implements SearchProvider {
  readonly id = "exa" as const;
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const response = await this.fetchImpl("https://api.exa.ai/search", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": this.apiKey }, body: JSON.stringify({ query, numResults: limit, contents: { text: true } }) });
    if (!response.ok) throw new Error(`Exa search failed (${response.status})`);
    const body = (await response.json()) as { results?: Array<{ title?: string; url?: string; text?: string; publishedDate?: string }> };
    return (body.results ?? []).flatMap((result) => result.url ? [{ title: result.title ?? result.url, url: result.url, snippet: result.text ?? "", publishedAt: result.publishedDate }] : []);
  }
}
