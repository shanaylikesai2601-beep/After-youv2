import {
  agentPlanSchema,
  agentReasoningDecisionSchema,
  agentResultSchema,
  agentReviewSchema,
  type AgentExecutionContext,
  type AgentMessage,
  type AgentPlan,
  type AgentReasoningDecision,
  type AgentResult,
  type AgentReview,
  type AgentTask,
} from "@/types/agent";
import { BaseAgent } from "@/server/agents/agent";
import { normalizePlannerOutput } from "@/server/agents/normalize-planner-output";
import { determineAgentOutputType, normalizeAgentResultOutput } from "@/server/agents/normalize-output-type";
import { normalizeReasoningDecision } from "@/server/agents/normalize-reasoning-decision";
import { normalizeAgentReviewOutput } from "@/server/agents/normalize-review-output";

abstract class SpecialistAgent extends BaseAgent {
  async plan(context: AgentExecutionContext): Promise<AgentMessage<AgentPlan>> {
    return this.withExecutionLog(context, "plan", async () => {
      const plan = await this.generateStructured(
        context,
        "plan",
        `Current date: ${new Date().toISOString().slice(0, 10)}\nMission: ${context.goal}\nImportant: 2025 is a past year relative to the current date; research it as historical data, not a future event. Produce a compact plan with no more than 4 ordered specialist tasks; keep every title and instruction concise. Do not execute work. Return {"summary":"...","objectives":["..."],"tasks":[...]}.`,
        agentPlanSchema,
      );
      return this.message(context, "orchestrator", "plan", plan);
    });
  }

  async reason(context: AgentExecutionContext, task: AgentTask, step: number): Promise<AgentMessage<AgentReasoningDecision>> {
    return this.withExecutionLog(context, `reasoning step ${step}`, async () => {
      const raw = await this.generateJson(
        context,
        "reason",
        `Current date: ${new Date().toISOString().slice(0, 10)}\nMission goal: ${context.goal}\nTask: ${task.title}\nInstructions: ${task.instructions}\nRequired tools for this task: ${JSON.stringify(task.requiredTools)}\nReasoning step: ${step}\nAvailable tools: ${JSON.stringify(this.services.availableTools)}\nShared memory: ${JSON.stringify(context.memory)}\nRecent observations: ${JSON.stringify(context.toolObservations.slice(-8))}\nDecide the single best next action. Use a required tool when one is listed and its input can be formed from the task and observations. If enough evidence exists, set nextAction to complete and chosenTool to null. Otherwise select exactly one available tool and valid input. Never invent observations. Return {"reasoningSummary":"...","chosenTool":"... or null","toolInput":{},"whyTool":"...","observations":["..."],"confidence":0.0,"nextAction":"continue|complete|request_feedback"}.`,
      );
      const normalized = normalizeReasoningDecision(raw);
      if (process.env.NODE_ENV !== "production") console.info(`[Agent ${this.id}] Reasoning validation boundary`, { rawOutput: raw, normalizedOutput: normalized });
      const decision = agentReasoningDecisionSchema.parse(normalized);
      await this.services.missions.recordActivity(context.missionId, {
        stage: this.id === "research" || this.id === "browser" ? "researching" : this.id === "reviewer" ? "reviewing" : "executing",
        action: "Reasoning cycle",
        status: "info",
        metadata: { agent: this.id, reasoningSummary: decision.reasoningSummary, chosenTool: decision.chosenTool, whyTool: decision.whyTool, observations: decision.observations, confidence: decision.confidence, nextAction: decision.nextAction, step },
      });
      return this.message(context, "orchestrator", "reasoning", decision);
    });
  }

  async execute(context: AgentExecutionContext, task: AgentTask): Promise<AgentMessage<AgentResult>> {
    return this.withExecutionLog(context, "execute", async () => {
      const raw = await this.generateJson(
        context,
        "execute",
        `Mission goal: ${context.goal}\nTask: ${task.title}\nInstructions: ${task.instructions}\nExpected output: ${task.expectedOutput}\nTool observations: ${JSON.stringify(context.toolObservations)}\nSynthesize only claims supported by the observations. State uncertainty instead of filling gaps. This is an intermediate handoff; final files must be created by tools. Include every externally verifiable claim in citations with a real observed URL; otherwise return citations: []. Return {"summary":"...","content":"...","artifacts":[],"citations":[{"title":"...","url":"https://...","claim":"...","confidence":0.0}],"metadata":{"assumptions":[],"contradictions":[]}}. Do not include outputType; the runtime assigns it from the task.`,
      );
      const outputType = determineAgentOutputType(this.id, task, context.goal);
      const normalizedResult = normalizeAgentResultOutput(raw);
      const result = agentResultSchema.parse({ ...(normalizedResult as Record<string, unknown>), outputType });
      return this.message(context, "orchestrator", "result", result);
    });
  }

  async review(context: AgentExecutionContext, results: AgentMessage<AgentResult>[]): Promise<AgentMessage<AgentReview>> {
    return this.withExecutionLog(context, "review", async () => {
      const raw = await this.generateJson(
        context,
        "review",
        `Review these results against mission goal “${context.goal}”:\n${JSON.stringify(results.map((result) => result.payload))}\nOriginal plan/tasks (use these exact task ids and specialist agents for rework): ${JSON.stringify(context.previousMessages.find((message) => message.type === "plan")?.payload ?? {})}\nShared memory: ${JSON.stringify(context.memory)}\nScore evidence quality, completeness, correctness, relevance, and artifact usability from 0-100. Do not approve below the configured quality threshold. If quality is insufficient, you MUST return at least one targeted rework entry for the responsible specialist using an exact taskId from the original plan; do not leave rework empty when approved is false. Return {"approved":true,"qualityScore":0,"summary":"...","issues":[],"recommendations":[],"rework":[{"agent":"research","taskId":"task-1","feedback":"..."}]}.`,
      );
      const normalized = normalizeAgentReviewOutput(raw);
      if (process.env.NODE_ENV !== "production") console.info(`[Agent ${this.id}] Review normalized`, { raw, normalized });
      const candidate = normalized as AgentReview;
      if (!candidate.approved && candidate.rework.length === 0) {
        const plan = context.previousMessages.find((message) => message.type === "plan")?.payload as AgentPlan | undefined;
        const target = plan?.tasks.find((task) => task.targetAgent === "document") ?? plan?.tasks.find((task) => task.targetAgent === "research");
        if (target) candidate.rework = [{ agent: target.targetAgent, taskId: target.id, feedback: candidate.issues.join("; ") || "Improve evidence quality and completeness." }];
      }
      const review = agentReviewSchema.parse(candidate);
      return this.message(context, "orchestrator", "review", review);
    });
  }
}

export class PlannerAgent extends SpecialistAgent {
  readonly id = "planner" as const;
  protected readonly systemPrompt = "You are the AfterYou PlannerAgent. Decompose work into practical, ordered, independently verifiable objectives. Assign clear ownership, dependencies, expected evidence, and completion criteria. Do not execute work or assume tools will succeed.";

  override async plan(context: AgentExecutionContext): Promise<AgentMessage<AgentPlan>> {
    return this.withExecutionLog(context, "plan", async () => {
      const raw = await this.generateJson(
        context,
        "plan",
        `Current date: ${new Date().toISOString().slice(0, 10)}\nMission: ${context.goal}\nImportant: 2025 is a past year relative to the current date; research it as historical data, not a future event. Produce a compact plan with no more than 4 ordered specialist tasks; keep every title and instruction concise. Do not execute work. Return {"summary":"...","objectives":["..."],"tasks":[...]}.`,
      );
      await this.recordPlannerDiagnostic(context, "Planner raw response", { rawPlannerResponse: raw });
      const normalized = normalizePlannerOutput(raw);
      await this.recordPlannerDiagnostic(context, "Planner normalized response", { normalizedPlannerResponse: normalized });
      const validation = agentPlanSchema.safeParse(normalized);
      if (!validation.success) {
        const fields = [...new Set(validation.error.issues.map((issue) => issue.path.length > 0 ? issue.path.join(".") : "<root>"))];
        await this.recordPlannerDiagnostic(context, "Planner schema validation diagnostics", {
          normalizedPlannerResponse: normalized,
          zodValidationErrors: validation.error.issues,
          missingOrInvalidFields: fields,
        }, "failed");
        await this.services.missions.recordActivity(context.missionId, {
          stage: "planning",
          action: "Planner output normalization failed",
          status: "failed",
          metadata: { agent: this.id, originalAiResponse: raw, normalizedResponse: normalized, validationErrors: validation.error.issues },
        });
        throw new Error("Planner output could not be normalized to the required plan schema");
      }
      return this.message(context, "orchestrator", "plan", validation.data);
    });
  }

  private async recordPlannerDiagnostic(
    context: AgentExecutionContext,
    action: string,
    metadata: Record<string, unknown>,
    status: "info" | "failed" = "info",
  ): Promise<void> {
    if (process.env.NODE_ENV === "production") return;
    await this.services.missions.recordActivity(context.missionId, {
      stage: "planning",
      action,
      status,
      metadata: { agent: this.id, developmentDiagnostic: true, ...metadata },
    });
  }
}

export class ResearchAgent extends SpecialistAgent {
  readonly id = "research" as const;
  protected readonly systemPrompt = "You are the AfterYou ResearchAgent. Research iteratively: form focused queries, collect primary or authoritative sources, deduplicate normalized URLs, track citations claim-by-claim, compare independent sources for contradictions, and report calibrated confidence. Never present unsupported inference as fact.";
}

export class BrowserAgent extends SpecialistAgent {
  readonly id = "browser" as const;
  protected readonly systemPrompt = "You are the AfterYou BrowserAgent. Navigate with robust Playwright strategies: explicit waits, stable selectors, retryable navigation, screenshots for state verification, and saved sessions only when needed. Capture URLs and visible evidence. Do not claim a page interaction or download unless the browser observation proves it.";
}

export class CodingAgent extends SpecialistAgent {
  readonly id = "coding" as const;
  protected readonly systemPrompt = "You are the AfterYou CodingAgent. Work incrementally: inspect the relevant files first, make the smallest safe patch, run targeted checks, read compiler/test output, and repair failures before expanding scope. Never claim code works without a command or test observation supporting it.";
}

export class DocumentAgent extends SpecialistAgent {
  readonly id = "document" as const;
  protected readonly systemPrompt = "You are the AfterYou DocumentAgent. Build decision-ready documents: lead with an executive summary, render structured Markdown, use tables for comparable data, charts only when data makes a chart useful, preserve citations, and generate final PDF/DOCX artifacts through the document tool. Never fabricate sources or metrics.";
}

export class GitHubAgent extends SpecialistAgent {
  readonly id = "github" as const;
  protected readonly systemPrompt = "You are the AfterYou GitHubAgent. Own repository coordination with safe, reviewable commits. Inspect repository state, make minimal changes, run validation, and only push or open a pull request when the task and credentials authorize it.";
}

export class ReviewerAgent extends SpecialistAgent {
  readonly id = "reviewer" as const;
  protected readonly systemPrompt = "You are the AfterYou ReviewerAgent. Apply a strict numerical quality gate. Inspect evidence, citations, contradictions, execution logs, artifacts, and task completion criteria. Give actionable, owner-specific rework feedback and approve only when the configured threshold is genuinely reached.";
}
