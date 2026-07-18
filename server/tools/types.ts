import type { ZodType } from "zod";

import type { MissionArtifact } from "@/types/mission";

export interface ToolArtifact {
  name: string;
  kind: MissionArtifact["kind"];
  path?: string;
  url?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolRetryAttempt {
  attempt: number;
  startedAt: string;
  finishedAt: string;
  error?: string;
}

export interface ToolResult {
  summary: string;
  data: Record<string, unknown>;
  artifacts: ToolArtifact[];
  tokenUsage?: { inputTokens?: number; outputTokens?: number };
  costEstimateUsd?: number;
}

export interface ToolExecutionRecord extends ToolResult {
  toolId: string;
  executionTimeMs: number;
  retryHistory: ToolRetryAttempt[];
}

export interface ToolExecutionContext {
  missionId: string;
  workspaceRoot: string;
  artifactRoot: string;
  signal?: AbortSignal;
}

export interface Tool {
  readonly id: string;
  readonly description: string;
  readonly inputSchema: ZodType<unknown>;
  execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult>;
}

export interface ToolCall {
  id: string;
  input: Record<string, unknown>;
  phase: "before" | "after";
}
