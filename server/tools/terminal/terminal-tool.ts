import { spawn } from "node:child_process";
import { z } from "zod";

import { resolveSafePath } from "@/server/tools/path-safety";
import type { Tool, ToolExecutionContext, ToolResult } from "@/server/tools/types";

const allowedCommands = ["npm", "npx", "node", "python3", "git", "rg", "ls", "pwd", "echo", "sed", "cat", "find", "mkdir", "cp", "mv"] as const;
const inputSchema = z.object({
  command: z.enum(allowedCommands),
  args: z.array(z.string().max(4_000)).max(40).default([]),
  cwd: z.string().default("."),
  timeoutMs: z.number().int().min(100).max(120_000).default(30_000),
  maxOutputChars: z.number().int().min(1_000).max(200_000).default(60_000),
});

export class TerminalTool implements Tool {
  readonly id = "terminal";
  readonly description = "Runs an allow-listed command without a shell in the mission workspace and captures streamed stdout/stderr.";
  readonly inputSchema = inputSchema;

  async execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult> {
    const command = inputSchema.parse(input);
    const cwd = resolveSafePath(context.workspaceRoot, command.cwd);
    if (command.args.some((argument) => argument.includes("\0"))) throw new Error("Terminal arguments cannot contain null bytes");
    const result = await this.run(command.command, command.args, cwd, command.timeoutMs, command.maxOutputChars);
    if (result.exitCode !== 0) throw new Error(`Command exited with ${result.exitCode}: ${result.stderr}`);
    return { summary: `Ran ${command.command} ${command.args.join(" ")}`.trim(), data: { ...result, command: command.command, args: command.args, cwd: command.cwd }, artifacts: [] };
  }

  private run(command: string, args: string[], cwd: string, timeoutMs: number, maxOutputChars: number): Promise<{ stdout: string; stderr: string; stdoutChunks: string[]; exitCode: number | null; timedOut: boolean }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      const stdoutChunks: string[] = [];
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, timeoutMs);
      child.stdout.on("data", (chunk: Buffer) => { const text = chunk.toString(); stdout = (stdout + text).slice(-maxOutputChars); stdoutChunks.push(text.slice(-maxOutputChars)); });
      child.stderr.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-maxOutputChars); });
      child.on("error", (error) => { clearTimeout(timeout); reject(error); });
      child.on("close", (exitCode) => { clearTimeout(timeout); resolve({ stdout, stderr, stdoutChunks, exitCode, timedOut }); });
    });
  }
}
