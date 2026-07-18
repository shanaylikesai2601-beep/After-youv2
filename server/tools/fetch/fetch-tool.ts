import { writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type { RemoteFetchProvider } from "@/server/tools/fetch/tinyfish-fetch-provider";
import type { Tool, ToolExecutionContext, ToolResult } from "@/server/tools/types";

const inputSchema = z.object({ url: z.string().url(), method: z.enum(["GET", "POST"]).default("GET"), headers: z.record(z.string()).default({}), body: z.string().optional() });

export class FetchTool implements Tool {
  readonly id = "fetch";
  readonly description = "Downloads HTML, JSON, PDFs, and other URL resources into mission artifacts.";
  readonly inputSchema = inputSchema;

  constructor(private readonly fetchImpl: typeof fetch = fetch, private readonly remoteProvider?: RemoteFetchProvider) {}

  async execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult> {
    const request = inputSchema.parse(input);
    if (request.method === "GET" && this.remoteProvider) {
      try {
        const remote = await this.remoteProvider.fetch(request.url);
        return {
          summary: `Fetched ${remote.finalUrl} with TinyFish`,
          data: { url: remote.finalUrl, requestedUrl: request.url, title: remote.title, contentType: remote.contentType, content: remote.content, provider: "tinyfish" },
          artifacts: [],
        };
      } catch {
        // Preserve the existing direct-fetch behavior when a remote extractor is unavailable.
      }
    }
    const response = await this.fetchImpl(request.url, { method: request.method, headers: request.headers, body: request.body });
    if (!response.ok) throw new Error(`Fetch failed (${response.status})`);
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const isText = /text\/|json|xml|javascript/.test(contentType);
    if (isText) {
      const content = await response.text();
      return { summary: `Fetched ${request.url}`, data: { url: request.url, contentType, content }, artifacts: [] };
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const extension = contentType.includes("pdf") ? "pdf" : "bin";
    const filename = `fetched-${Date.now()}.${extension}`;
    const filePath = path.join(context.artifactRoot, filename);
    await writeFile(filePath, bytes);
    return { summary: `Downloaded ${request.url}`, data: { url: request.url, contentType, bytes: bytes.length }, artifacts: [{ name: filename, kind: "file", path: filePath, mimeType: contentType }] };
  }
}
