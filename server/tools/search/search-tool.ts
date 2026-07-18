import { z } from "zod";

import type { FetchTool } from "@/server/tools/fetch/fetch-tool";
import type { SearchProvider } from "@/server/tools/search/search-provider";
import type { Tool, ToolExecutionContext, ToolResult } from "@/server/tools/types";

const inputSchema = z.object({ query: z.string().min(2).max(2_000), limit: z.number().int().min(1).max(20).default(5) });

export class SearchTool implements Tool {
  readonly id = "search";
  readonly description = "Searches the web through an injected search provider.";
  readonly inputSchema = inputSchema;

  constructor(private readonly provider?: SearchProvider, private readonly fallbackFetch?: FetchTool) {}

  async execute(input: unknown, _: ToolExecutionContext): Promise<ToolResult> {
    if (!this.provider) throw new Error("No search provider is configured. Set TINYFISH_API_KEY, TAVILY_API_KEY, or EXA_API_KEY, or inject a SearchProvider.");
    const request = inputSchema.parse(input);
    let rawResults;
    try {
      rawResults = await this.provider.search(request.query, request.limit);
    } catch (error) {
      if (this.provider.id !== "tinyfish" || !this.fallbackFetch) throw error;
      const fallback = await this.fallbackFetch.execute({ url: `https://www.google.com/search?q=${encodeURIComponent(request.query)}` }, _);
      return {
        summary: "TinyFish Search was unavailable; fetched fallback search results",
        data: { provider: "fetch-fallback", query: request.query, results: [], fallback: true, fallbackOutput: fallback.data },
        artifacts: fallback.artifacts,
      };
    }
    const seen = new Set<string>();
    const results = rawResults.filter((result) => {
      const normalized = this.normalizeUrl(result.url);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    }).map((result) => ({ ...result, url: this.normalizeUrl(result.url) }));
    return { summary: `Found ${results.length} unique results for “${request.query}”`, data: { provider: this.provider.id, query: request.query, results }, artifacts: [] };
  }

  private normalizeUrl(value: string): string {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_") || key === "ref") url.searchParams.delete(key);
    return url.toString().replace(/\/$/, "");
  }
}
