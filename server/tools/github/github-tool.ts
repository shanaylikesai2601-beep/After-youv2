import { z } from "zod";

import type { TerminalTool } from "@/server/tools/terminal/terminal-tool";
import type { Tool, ToolExecutionContext, ToolResult } from "@/server/tools/types";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("clone"), repositoryUrl: z.string().url(), destination: z.string().min(1) }),
  z.object({ action: z.literal("commit"), repositoryPath: z.string().min(1), message: z.string().min(1).max(300) }),
  z.object({ action: z.literal("push"), repositoryPath: z.string().min(1), remote: z.string().default("origin"), branch: z.string().min(1) }),
  z.object({ action: z.literal("createPullRequest"), owner: z.string().min(1), repo: z.string().min(1), title: z.string().min(1), head: z.string().min(1), base: z.string().min(1), body: z.string().default("") }),
]);

export class GitHubTool implements Tool {
  readonly id = "github";
  readonly description = "Clones repositories, commits, pushes, and creates GitHub pull requests using injected credentials.";
  readonly inputSchema = inputSchema;

  constructor(private readonly terminal: TerminalTool, private readonly token?: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult> {
    const command = inputSchema.parse(input);
    if (command.action === "clone") return this.runGit(context, ["clone", command.repositoryUrl, command.destination], `Cloned ${command.repositoryUrl}`);
    if (command.action === "commit") {
      await this.runGit(context, ["-C", command.repositoryPath, "add", "-A"], "Staged repository changes");
      return this.runGit(context, ["-C", command.repositoryPath, "commit", "-m", command.message], "Created commit");
    }
    if (command.action === "push") return this.runGit(context, ["-C", command.repositoryPath, "push", command.remote, command.branch], "Pushed branch");
    if (!this.token) throw new Error("GitHub token is not configured");
    const response = await this.fetchImpl(`https://api.github.com/repos/${command.owner}/${command.repo}/pulls`, { method: "POST", headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${this.token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" }, body: JSON.stringify({ title: command.title, head: command.head, base: command.base, body: command.body }) });
    if (!response.ok) throw new Error(`GitHub PR creation failed (${response.status})`);
    const result = (await response.json()) as { html_url?: unknown; number?: unknown };
    return { summary: "Created GitHub pull request", data: { url: result.html_url, number: result.number }, artifacts: typeof result.html_url === "string" ? [{ name: "Pull request", kind: "link", url: result.html_url }] : [] };
  }

  private async runGit(context: ToolExecutionContext, args: string[], summary: string): Promise<ToolResult> {
    return this.terminal.execute({ command: "git", args, cwd: "." }, context).then((result) => ({ ...result, summary }));
  }
}
