import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { MissionService } from "@/server/mission-service";
import type { Tool, ToolExecutionContext, ToolExecutionRecord, ToolRetryAttempt } from "@/server/tools/types";

export interface ToolRegistryOptions {
  workspaceRoot: string;
  maxRetries?: number;
}

/** Executes validated tools with consistent observability and retry semantics. */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();
  private readonly maxRetries: number;

  constructor(
    tools: Tool[],
    private readonly missions: MissionService,
    private readonly options: ToolRegistryOptions,
  ) {
    for (const tool of tools) {
      if (this.tools.has(tool.id)) throw new Error(`Tool '${tool.id}' is already registered`);
      this.tools.set(tool.id, tool);
    }
    this.maxRetries = options.maxRetries ?? 1;
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }

  async execute(missionId: string, toolId: string, input: Record<string, unknown>): Promise<ToolExecutionRecord> {
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Tool '${toolId}' is not registered`);
    const parsedInput = tool.inputSchema.parse(input);
    const artifactRoot = path.join(this.options.workspaceRoot, "artifacts", "missions", missionId);
    await mkdir(artifactRoot, { recursive: true });
    const context: ToolExecutionContext = { missionId, workspaceRoot: this.options.workspaceRoot, artifactRoot };
    const started = Date.now();
    const retries: ToolRetryAttempt[] = [];

    await this.missions.recordActivity(missionId, {
      stage: "executing",
      action: "Tool execution started",
      status: "started",
      metadata: { toolId, input: this.safeLogInput(input) },
    });

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      const attemptStarted = new Date().toISOString();
      try {
        const result = await tool.execute(parsedInput, context);
        retries.push({ attempt, startedAt: attemptStarted, finishedAt: new Date().toISOString() });
        const record: ToolExecutionRecord = { ...result, toolId, executionTimeMs: Date.now() - started, retryHistory: retries };
        await this.missions.recordActivity(missionId, {
          stage: "executing",
          action: "Tool execution completed",
          status: "succeeded",
          metadata: {
            toolId,
            executionTimeMs: record.executionTimeMs,
            tokenUsage: record.tokenUsage ?? {},
            costEstimateUsd: record.costEstimateUsd ?? 0,
            retryHistory: retries,
            artifactList: result.artifacts.map((artifact) => ({ name: artifact.name, kind: artifact.kind, path: artifact.path, url: artifact.url })),
          },
        });
        return record;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown tool error";
        retries.push({ attempt, startedAt: attemptStarted, finishedAt: new Date().toISOString(), error: message });
        if (attempt > this.maxRetries) {
          await this.missions.recordActivity(missionId, {
            stage: "executing",
            action: "Tool execution failed",
            status: "failed",
            metadata: { toolId, executionTimeMs: Date.now() - started, retryHistory: retries },
          });
          throw error;
        }
      }
    }
    throw new Error("Tool execution exhausted retries");
  }

  private safeLogInput(input: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, /token|key|secret|password/i.test(key) ? "[redacted]" : value]));
  }
}
