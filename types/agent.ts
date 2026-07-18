import { z } from "zod";

export const AGENT_IDS = ["planner", "research", "browser", "coding", "document", "github", "reviewer"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const agentToolCallSchema = z.object({
  id: z.enum(["browser", "filesystem", "terminal", "search", "fetch", "github", "document"]),
  phase: z.enum(["before", "after"]),
  input: z.record(z.string(), z.unknown()),
});
export type AgentToolCall = z.infer<typeof agentToolCallSchema>;

export const agentReasoningDecisionSchema = z.object({
  reasoningSummary: z.string().min(1).max(4_000),
  chosenTool: z.enum(["browser", "filesystem", "terminal", "search", "fetch", "github", "document"]).nullable(),
  toolInput: z.record(z.string(), z.unknown()),
  whyTool: z.string().min(1).max(2_000),
  observations: z.array(z.string().max(2_000)),
  confidence: z.number().min(0).max(1),
  nextAction: z.enum(["continue", "complete", "request_feedback"]),
});
export type AgentReasoningDecision = z.infer<typeof agentReasoningDecisionSchema>;

export const agentTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().min(1),
  targetAgent: z.enum(AGENT_IDS),
  expectedOutput: z.string().min(1),
  dependsOn: z.array(z.string()),
  requiredTools: z.array(agentToolCallSchema),
});
export type AgentTask = z.infer<typeof agentTaskSchema>;

export const agentPlanSchema = z.object({
  summary: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  tasks: z.array(agentTaskSchema).min(1),
});
export type AgentPlan = z.infer<typeof agentPlanSchema>;

export const agentResultSchema = z.object({
  summary: z.string().min(1),
  content: z.string().min(1),
  outputType: z.enum(["document", "markdown", "code", "slides", "image", "summary", "research", "link", "file"]),
  artifacts: z.array(z.object({ name: z.string().min(1), kind: z.enum(["file", "link", "generated"]), url: z.string().url().optional(), mimeType: z.string().optional() })),
  citations: z.array(z.object({ title: z.string().min(1), url: z.string().url(), claim: z.string().min(1), confidence: z.number().min(0).max(1) })),
  metadata: z.record(z.string(), z.unknown()),
});
export type AgentResult = z.infer<typeof agentResultSchema>;

export const agentReviewSchema = z.object({
  approved: z.boolean(),
  qualityScore: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
  rework: z.array(z.object({ agent: z.enum(AGENT_IDS), taskId: z.string().min(1), feedback: z.string().min(1) })),
});
export type AgentReview = z.infer<typeof agentReviewSchema>;

export const agentHandoffSchema = z.object({
  from: z.enum(AGENT_IDS),
  to: z.enum(AGENT_IDS),
  summary: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});
export type AgentHandoff = z.infer<typeof agentHandoffSchema>;

export interface AgentMessage<T> {
  id: string;
  missionId: string;
  sender: AgentId;
  recipient: AgentId | "orchestrator";
  type: "plan" | "reasoning" | "result" | "review" | "handoff";
  createdAt: string;
  payload: T;
}

export interface AgentExecutionContext {
  missionId: string;
  title: string;
  description: string;
  goal: string;
  previousMessages: AgentMessage<unknown>[];
  toolObservations: Array<{ toolId: string; summary: string; data: Record<string, unknown> }>;
  memory: Array<{ key: string; value: string; source: string }>;
  runtime: AgentRuntimeMeter;
}

export interface AgentRuntimeMeter {
  beginReasoningStep(): void;
  assertCanGenerate(): void;
  recordModelUsage(usage?: { inputTokens?: number; outputTokens?: number }): void;
  assertCanCallTool(): void;
  recordToolCall(): void;
}
