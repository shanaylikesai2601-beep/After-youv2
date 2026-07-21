import fs from "node:fs/promises";
import path from "node:path";
import { resolveSafePath } from "./path-safety";

export interface ToolHandler {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(input: Record<string, unknown>, workspacePath: string): Promise<string>;
}

const terminalAllowList = new Set([
  "npm", "npx", "node", "python3", "git", "rg", "ls", "pwd", "echo", "mkdir", "cp", "mv", "cat", "find",
]);

const tools: ToolHandler[] = [
  {
    name: "filesystem",
    description: "Create, read, write, move, or delete files in the mission workspace.",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["create", "read", "write", "move", "delete"],
          description: "The file operation to perform",
        },
        path: {
          type: "string",
          description: "File path relative to workspace root",
        },
        content: {
          type: "string",
          description: "File content for create/write operations",
        },
        destination: {
          type: "string",
          description: "Destination path for move operation",
        },
      },
      required: ["operation", "path"],
    },
    async execute(input: Record<string, unknown>, workspacePath: string): Promise<string> {
      const operation = String(input.operation ?? "");
      const filePath = String(input.path ?? "");
      const resolved = resolveSafePath(workspacePath, filePath);
      const dir = path.dirname(resolved);

      switch (operation) {
        case "create":
        case "write": {
          await fs.mkdir(dir, { recursive: true });
          const content = String(input.content ?? "");
          await fs.writeFile(resolved, content, "utf-8");
          return `File ${operation}d: ${filePath} (${content.length} bytes)`;
        }
        case "read": {
          const content = await fs.readFile(resolved, "utf-8");
          return content;
        }
        case "move": {
          const dest = String(input.destination ?? "");
          if (!dest) throw new Error("destination required for move");
          const resolvedDest = resolveSafePath(workspacePath, dest);
          await fs.mkdir(path.dirname(resolvedDest), { recursive: true });
          await fs.rename(resolved, resolvedDest);
          return `Moved ${filePath} → ${dest}`;
        }
        case "delete": {
          await fs.rm(resolved, { force: true, recursive: true });
          return `Deleted: ${filePath}`;
        }
        default:
          throw new Error(`Unknown filesystem operation: ${operation}`);
      }
    },
  },
  {
    name: "terminal",
    description: "Run an allow-listed command in the mission workspace. Allowed: npm, npx, node, python3, git, ls, pwd, mkdir, cp, mv, cat, find, rg, echo.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Command to run",
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Command arguments",
        },
        timeoutMs: {
          type: "number",
          description: "Timeout in milliseconds (max 120000)",
        },
      },
      required: ["command"],
    },
    async execute(input: Record<string, unknown>, workspacePath: string): Promise<string> {
      const cmd = String(input.command ?? "");
      const base = cmd.split(/\s+/)[0];
      if (!terminalAllowList.has(base)) {
        throw new Error(`Command not allowed: ${base}`);
      }
      const args = input.args as string[] ?? cmd.split(/\s+/).slice(1);
      const timeout = Math.min(Number(input.timeoutMs ?? 30000), 120000);

      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execFileAsync = promisify(execFile);

      try {
        const { stdout, stderr } = await execFileAsync(base, args, {
          cwd: workspacePath,
          timeout,
          maxBuffer: 10 * 1024 * 1024,
        });
        let output = stdout;
        if (stderr) output += `\nstderr:\n${stderr}`;
        return output || "(no output)";
      } catch (err: unknown) {
        const error = err as Error & { stdout?: string; stderr?: string };
        return `Command failed: ${error.message}\nstdout: ${error.stdout ?? ""}\nstderr: ${error.stderr ?? ""}`;
      }
    },
  },
  {
    name: "search",
    description: "Search the web for information. Returns up to 10 results.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        limit: {
          type: "number",
          description: "Max results (1-10)",
        },
      },
      required: ["query"],
    },
    async execute(input: Record<string, unknown>): Promise<string> {
      const query = String(input.query ?? "");
      const limit = Math.min(Number(input.limit ?? 5), 10);
      const encoded = encodeURIComponent(query);
      const url = `https://html.duckduckgo.com/html/?q=${encoded}`;
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "AfterYou/2.0" },
          signal: AbortSignal.timeout(10000),
        });
        const html = await response.text();
        const results: string[] = [];
        const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
        const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
        let match: RegExpExecArray | null;
        let idx = 0;
        while ((match = linkRegex.exec(html)) !== null && idx < limit) {
          const title = match[2].replace(/<[^>]+>/g, "").trim();
          results.push(`${idx + 1}. ${title}\n   ${match[1].replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, "")}`);
          idx++;
        }
        return results.length ? results.join("\n\n") : "No results found.";
      } catch (err) {
        return `Search error: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    },
  },
  {
    name: "fetch",
    description: "Download content from a URL.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch" },
      },
      required: ["url"],
    },
    async execute(input: Record<string, unknown>): Promise<string> {
      const url = String(input.url ?? "");
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const text = await response.text();
      return text.length > 10000 ? text.slice(0, 10000) + "\n... (truncated)" : text;
    },
  },
];

export function getToolHandlers(): ToolHandler[] {
  return tools;
}

export function getToolSchemas() {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  workspacePath: string
): Promise<{ output: string; error?: string }> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { output: "", error: `Unknown tool: ${name}` };
  try {
    const output = await tool.execute(input, workspacePath);
    return { output };
  } catch (err) {
    return { output: "", error: err instanceof Error ? err.message : String(err) };
  }
}
