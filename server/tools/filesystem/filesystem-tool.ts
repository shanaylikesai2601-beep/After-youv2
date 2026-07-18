import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { relativeArtifactPath, resolveSafePath } from "@/server/tools/path-safety";
import type { Tool, ToolExecutionContext, ToolResult } from "@/server/tools/types";

const inputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), path: z.string().min(1), content: z.string() }),
  z.object({ operation: z.literal("read"), path: z.string().min(1) }),
  z.object({ operation: z.literal("edit"), path: z.string().min(1), find: z.string(), replace: z.string() }),
  z.object({ operation: z.literal("move"), path: z.string().min(1), destination: z.string().min(1) }),
  z.object({ operation: z.literal("delete"), path: z.string().min(1) }),
]);

export class FilesystemTool implements Tool {
  readonly id = "filesystem";
  readonly description = "Safely create, read, edit, move, and delete files within the mission workspace.";
  readonly inputSchema = inputSchema;

  async execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult> {
    const command = inputSchema.parse(input);
    const source = resolveSafePath(context.workspaceRoot, command.path);
    if (command.operation === "read") {
      const content = await readFile(source, "utf8");
      return { summary: `Read ${command.path}`, data: { content }, artifacts: [] };
    }
    if (command.operation === "create") {
      await mkdir(path.dirname(source), { recursive: true });
      await writeFile(source, command.content, "utf8");
      return this.fileResult(context, source, `Created ${command.path}`);
    }
    if (command.operation === "edit") {
      const original = await readFile(source, "utf8");
      if (!original.includes(command.find)) throw new Error("Edit target was not found in the file");
      await writeFile(source, original.replace(command.find, command.replace), "utf8");
      return this.fileResult(context, source, `Edited ${command.path}`);
    }
    if (command.operation === "move") {
      const destination = resolveSafePath(context.workspaceRoot, command.destination);
      await mkdir(path.dirname(destination), { recursive: true });
      await rename(source, destination);
      return this.fileResult(context, destination, `Moved ${command.path} to ${command.destination}`);
    }
    await rm(source, { recursive: true, force: false });
    return { summary: `Deleted ${command.path}`, data: { path: command.path }, artifacts: [] };
  }

  private fileResult(context: ToolExecutionContext, absolutePath: string, summary: string): ToolResult {
    return {
      summary,
      data: { path: relativeArtifactPath(context.workspaceRoot, absolutePath) },
      artifacts: [{ name: path.basename(absolutePath), kind: "file", path: absolutePath }],
    };
  }
}
