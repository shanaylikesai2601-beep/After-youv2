import path from "node:path";
import { z } from "zod";

import type { RemoteBrowserProvider } from "@/server/tools/browser/tinyfish-browser-provider";
import type { Tool, ToolExecutionContext, ToolResult } from "@/server/tools/types";

const inputSchema = z.object({
  action: z.enum(["open", "click", "type", "scroll", "screenshot", "wait", "extractText", "download", "saveSession", "restoreSession", "close"]),
  sessionId: z.string().min(1).default("default"),
  url: z.string().url().optional(),
  selector: z.string().max(1_000).optional(),
  text: z.string().max(20_000).optional(),
  timeoutMs: z.number().int().min(100).max(60_000).default(15_000),
  retries: z.number().int().min(0).max(3).default(1),
  waitStrategy: z.enum(["domcontentloaded", "networkidle", "selector", "none"]).default("domcontentloaded"),
  scrollY: z.number().int().min(-20_000).max(20_000).default(600),
  downloadFilename: z.string().max(160).optional(),
});

interface BrowserSession {
  browser: import("playwright").Browser;
  context: import("playwright").BrowserContext;
  page: import("playwright").Page;
  remoteSessionId?: string;
}

export class BrowserTool implements Tool {
  readonly id = "browser";
  readonly description = "Controls a sandboxed Playwright browser with retryable navigation, screenshots, downloads, explicit waits, and persisted session state.";
  readonly inputSchema = inputSchema;
  private readonly sessions = new Map<string, BrowserSession>();

  constructor(private readonly remoteProvider?: RemoteBrowserProvider) {}

  async execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult> {
    const command = inputSchema.parse(input);
    if (command.action === "close") return this.close(command.sessionId);
    if (command.action === "restoreSession") return this.restoreSession(command, context);
    let session: BrowserSession | undefined;
    try {
      session = await this.getSession(command.sessionId, command.action === "open" ? command.url : undefined, command.timeoutMs);
      const activeSession = session;
      return await this.withRetries(command.retries, () => this.perform(command, activeSession, context));
    } catch (error) {
      const filename = `browser-failure-${command.sessionId}-${Date.now()}.png`;
      const filePath = path.join(context.artifactRoot, filename);
      await session?.page.screenshot({ path: filePath, fullPage: true }).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Browser operation failed";
      return {
        summary: "Browser operation failed",
        data: { success: false, error: message, sessionId: command.sessionId, action: command.action },
        artifacts: session ? [{ name: filename, kind: "file", path: filePath, mimeType: "image/png" }] : [],
      };
    }
  }

  private async perform(command: z.infer<typeof inputSchema>, session: BrowserSession, toolContext: ToolExecutionContext): Promise<ToolResult> {
    const page = session.page;
    if (command.action === "open") {
      if (!command.url) throw new Error("Browser open requires a url");
      await page.goto(command.url, { waitUntil: command.waitStrategy === "networkidle" ? "networkidle" : "domcontentloaded", timeout: command.timeoutMs });
      await this.waitForStrategy(page, command);
      return { summary: `Opened ${page.url()}`, data: { url: page.url(), title: await page.title(), waitStrategy: command.waitStrategy }, artifacts: [] };
    }
    if (command.action === "click") { await page.locator(this.selector(command)).click({ timeout: command.timeoutMs }); await this.waitForStrategy(page, command); return { summary: "Clicked browser element", data: { url: page.url() }, artifacts: [] }; }
    if (command.action === "type") { if (command.text === undefined) throw new Error("Browser type requires text"); await page.locator(this.selector(command)).fill(command.text, { timeout: command.timeoutMs }); return { summary: "Typed into browser element", data: { url: page.url() }, artifacts: [] }; }
    if (command.action === "scroll") { await page.evaluate((y) => window.scrollBy(0, y), command.scrollY); return { summary: "Scrolled browser page", data: { url: page.url(), scrollY: command.scrollY }, artifacts: [] }; }
    if (command.action === "wait") { await this.waitForStrategy(page, command); return { summary: "Wait strategy completed", data: { url: page.url(), waitStrategy: command.waitStrategy }, artifacts: [] }; }
    if (command.action === "extractText") { const text = await page.locator(command.selector ?? "body").innerText({ timeout: command.timeoutMs }); return { summary: "Extracted browser text", data: { url: page.url(), text }, artifacts: [] }; }
    if (command.action === "download") {
      const download = await Promise.all([page.waitForEvent("download", { timeout: command.timeoutMs }), page.locator(this.selector(command)).click({ timeout: command.timeoutMs })]).then(([value]) => value);
      const filename = command.downloadFilename ?? download.suggestedFilename();
      const filePath = path.join(toolContext.artifactRoot, filename);
      await download.saveAs(filePath);
      return { summary: `Downloaded ${filename}`, data: { url: page.url(), suggestedFilename: download.suggestedFilename() }, artifacts: [{ name: filename, kind: "file", path: filePath }] };
    }
    if (command.action === "saveSession") {
      const filename = `browser-session-${command.sessionId}.json`;
      const filePath = path.join(toolContext.artifactRoot, filename);
      await session.context.storageState({ path: filePath });
      return { summary: "Saved browser session", data: { sessionId: command.sessionId }, artifacts: [{ name: filename, kind: "file", path: filePath, mimeType: "application/json" }] };
    }
    const filename = `browser-${command.sessionId}-${Date.now()}.png`;
    const filePath = path.join(toolContext.artifactRoot, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    return { summary: "Captured browser screenshot", data: { url: page.url() }, artifacts: [{ name: filename, kind: "file", path: filePath, mimeType: "image/png" }] };
  }

  private async restoreSession(command: z.infer<typeof inputSchema>, context: ToolExecutionContext): Promise<ToolResult> {
    const existing = this.sessions.get(command.sessionId);
    if (existing) { await existing.context.close(); await existing.browser.close(); this.sessions.delete(command.sessionId); }
    const statePath = path.join(context.artifactRoot, `browser-session-${command.sessionId}.json`);
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext({ storageState: statePath, acceptDownloads: true });
    const page = await browserContext.newPage();
    this.sessions.set(command.sessionId, { browser, context: browserContext, page });
    return { summary: "Restored browser session", data: { sessionId: command.sessionId }, artifacts: [] };
  }

  private async getSession(id: string, initialUrl?: string, timeoutMs?: number): Promise<BrowserSession> {
    const existing = this.sessions.get(id);
    if (existing) return existing;
    const { chromium } = await import("playwright");
    if (this.remoteProvider) {
      try {
        const remote = await this.remoteProvider.start(initialUrl, timeoutMs ? Math.ceil(timeoutMs / 1_000) : undefined);
        const browser = await chromium.connectOverCDP(remote.cdpUrl);
        const context = browser.contexts()[0] ?? await browser.newContext({ acceptDownloads: true });
        const page = context.pages()[0] ?? await context.newPage();
        const session = { browser, context, page, remoteSessionId: remote.sessionId };
        this.sessions.set(id, session);
        return session;
      } catch {
        // The local sandbox remains a safe fallback when a remote browser cannot be provisioned.
      }
    }
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    const session = { browser, context, page };
    this.sessions.set(id, session);
    return session;
  }

  private async withRetries<T>(retries: number, work: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try { return await work(); } catch (error) { lastError = error; if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1))); }
    }
    throw lastError;
  }

  private async waitForStrategy(page: import("playwright").Page, command: z.infer<typeof inputSchema>): Promise<void> {
    if (command.waitStrategy === "networkidle") await page.waitForLoadState("networkidle", { timeout: command.timeoutMs });
    else if (command.waitStrategy === "selector") await page.locator(this.selector(command)).waitFor({ state: "visible", timeout: command.timeoutMs });
    else if (command.waitStrategy === "none") return;
  }

  private async close(id: string): Promise<ToolResult> {
    const session = this.sessions.get(id);
    if (session) {
      await session.browser.close();
      if (session.remoteSessionId && this.remoteProvider) await this.remoteProvider.stop(session.remoteSessionId).catch(() => undefined);
    }
    this.sessions.delete(id);
    return { summary: `Closed browser session ${id}`, data: { sessionId: id }, artifacts: [] };
  }
  private selector(command: z.infer<typeof inputSchema>): string { if (!command.selector) throw new Error(`Browser ${command.action} requires a selector`); return command.selector; }
}
