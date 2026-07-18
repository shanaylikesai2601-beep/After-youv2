import type { AgentRuntimeMeter } from "@/types/agent";

export interface AgentRuntimeLimits {
  maxReasoningSteps: number;
  maxToolCalls: number;
  runtimeLimitMs: number;
  tokenBudget: number;
  highConfidenceThreshold: number;
  maxReviewCycles: number;
  reviewQualityThreshold: number;
}

export const defaultAgentRuntimeLimits: AgentRuntimeLimits = {
  maxReasoningSteps: 12,
  maxToolCalls: 16,
  runtimeLimitMs: 30 * 60_000,
  tokenBudget: 120_000,
  highConfidenceThreshold: 0.92,
  maxReviewCycles: 2,
  reviewQualityThreshold: 85,
};

/** Per-mission budget guard shared by every agent and tool decision. */
export class RuntimeBudget implements AgentRuntimeMeter {
  private readonly startedAt = Date.now();
  private reasoningSteps = 0;
  private toolCalls = 0;
  private tokens = 0;

  constructor(readonly limits: AgentRuntimeLimits) {}

  beginReasoningStep(): void {
    this.assertRuntime();
    if (this.reasoningSteps >= this.limits.maxReasoningSteps) throw new Error("Reasoning-step budget exhausted");
    this.reasoningSteps += 1;
  }

  assertCanGenerate(): void { this.assertRuntime(); if (this.tokens >= this.limits.tokenBudget) throw new Error("Token budget exhausted"); }
  recordModelUsage(usage?: { inputTokens?: number; outputTokens?: number }): void {
    this.tokens += (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
    if (this.tokens > this.limits.tokenBudget) throw new Error("Token budget exhausted");
  }
  assertCanCallTool(): void { this.assertRuntime(); if (this.toolCalls >= this.limits.maxToolCalls) throw new Error("Tool-call budget exhausted"); }
  recordToolCall(): void { this.toolCalls += 1; }

  snapshot(): { reasoningSteps: number; toolCalls: number; tokens: number; elapsedMs: number } {
    return { reasoningSteps: this.reasoningSteps, toolCalls: this.toolCalls, tokens: this.tokens, elapsedMs: Date.now() - this.startedAt };
  }

  private assertRuntime(): void { if (Date.now() - this.startedAt > this.limits.runtimeLimitMs) throw new Error("Mission runtime limit exhausted"); }
}
