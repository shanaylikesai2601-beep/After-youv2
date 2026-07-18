import type { MissionService } from "@/server/mission-service";
import { BrowserTool } from "@/server/tools/browser/browser-tool";
import { TinyFishBrowserProvider } from "@/server/tools/browser/tinyfish-browser-provider";
import { DocumentTool } from "@/server/tools/document/document-tool";
import { FetchTool } from "@/server/tools/fetch/fetch-tool";
import { TinyFishFetchProvider } from "@/server/tools/fetch/tinyfish-fetch-provider";
import { FilesystemTool } from "@/server/tools/filesystem/filesystem-tool";
import { GitHubTool } from "@/server/tools/github/github-tool";
import { ExaSearchProvider, TavilySearchProvider, type SearchProvider } from "@/server/tools/search/search-provider";
import { SearchTool } from "@/server/tools/search/search-tool";
import { TinyFishSearchProvider } from "@/server/tools/search/tinyfish-search-provider";
import { tinyFishConfigFromEnvironment, type TinyFishConfig } from "@/server/tinyfish/config";
import { TerminalTool } from "@/server/tools/terminal/terminal-tool";
import { ToolRegistry } from "@/server/tools/registry";
import type { Tool } from "@/server/tools/types";

export interface ToolRuntimeDependencies {
  missions: MissionService;
  workspaceRoot: string;
  fetchImpl?: typeof fetch;
  searchProvider?: SearchProvider;
  githubToken?: string;
  tinyFishConfig?: TinyFishConfig;
}

export function createDefaultSearchProvider(fetchImpl: typeof fetch = fetch): SearchProvider | undefined {
  if (process.env.TAVILY_API_KEY) return new TavilySearchProvider(process.env.TAVILY_API_KEY, fetchImpl);
  if (process.env.EXA_API_KEY) return new ExaSearchProvider(process.env.EXA_API_KEY, fetchImpl);
  return undefined;
}

export function createDefaultTools(dependencies: ToolRuntimeDependencies): Tool[] {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const terminal = new TerminalTool();
  const tinyFishConfig = dependencies.tinyFishConfig ?? tinyFishConfigFromEnvironment();
  const fallbackFetch = new FetchTool(fetchImpl);
  const fetchTool = tinyFishConfig ? new FetchTool(fetchImpl, new TinyFishFetchProvider(tinyFishConfig, fetchImpl)) : fallbackFetch;
  const searchProvider = dependencies.searchProvider ?? (tinyFishConfig ? new TinyFishSearchProvider(tinyFishConfig, fetchImpl) : createDefaultSearchProvider(fetchImpl));
  return [
    new BrowserTool(tinyFishConfig ? new TinyFishBrowserProvider(tinyFishConfig, fetchImpl) : undefined),
    new FilesystemTool(),
    terminal,
    new SearchTool(searchProvider, fallbackFetch),
    fetchTool,
    new GitHubTool(terminal, dependencies.githubToken, fetchImpl),
    new DocumentTool(),
  ];
}

export function createDefaultToolRegistry(dependencies: ToolRuntimeDependencies): ToolRegistry {
  return new ToolRegistry(createDefaultTools(dependencies), dependencies.missions, { workspaceRoot: dependencies.workspaceRoot });
}
