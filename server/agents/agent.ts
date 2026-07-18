import type { z } from "zod";

import type { AIProvider } from "@/server/ai/types";
import type { MissionService } from "@/server/mission-service";
import type {
  AgentExecutionContext,
  AgentHandoff,
  AgentId,
  AgentMessage,
  AgentPlan,
  AgentReasoningDecision,
  AgentResult,
  AgentReview,
  AgentTask,
} from "@/types/agent";

export interface AgentRuntimeServices {
  provider: AIProvider;
  missions: MissionService;
  availableTools: Array<{ id: string; description: string }>;
}

export interface Agent {
  readonly id: AgentId;
  plan(context: AgentExecutionContext): Promise<AgentMessage<AgentPlan>>;
  reason(context: AgentExecutionContext, task: AgentTask, step: number): Promise<AgentMessage<AgentReasoningDecision>>;
  execute(context: AgentExecutionContext, task: AgentTask): Promise<AgentMessage<AgentResult>>;
  review(context: AgentExecutionContext, results: AgentMessage<AgentResult>[]): Promise<AgentMessage<AgentReview>>;
  handoff(context: AgentExecutionContext, target: AgentId, payload: Record<string, unknown>): Promise<AgentMessage<AgentHandoff>>;
}

export abstract class BaseAgent implements Agent {
  abstract readonly id: AgentId;
  protected abstract readonly systemPrompt: string;

  constructor(protected readonly services: AgentRuntimeServices) {}

  abstract plan(context: AgentExecutionContext): Promise<AgentMessage<AgentPlan>>;
  abstract reason(context: AgentExecutionContext, task: AgentTask, step: number): Promise<AgentMessage<AgentReasoningDecision>>;
  abstract execute(context: AgentExecutionContext, task: AgentTask): Promise<AgentMessage<AgentResult>>;
  abstract review(context: AgentExecutionContext, results: AgentMessage<AgentResult>[]): Promise<AgentMessage<AgentReview>>;

  async handoff(
    context: AgentExecutionContext,
    target: AgentId,
    payload: Record<string, unknown>,
  ): Promise<AgentMessage<AgentHandoff>> {
    return this.withExecutionLog(context, "handoff", async () =>
      this.message(context, target, "handoff", {
        from: this.id,
        to: target,
        summary: `Handoff from ${this.id} to ${target}.`,
        payload,
      }),
    );
  }

  protected async generateStructured<T>(
    context: AgentExecutionContext,
    action: string,
    prompt: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const parsed = await this.generateJson(context, action, prompt);
    return schema.parse(parsed);
  }

  protected async generateJson(context: AgentExecutionContext, action: string, prompt: string): Promise<unknown> {
    context.runtime.assertCanGenerate();
    const request = {
      system: `${this.systemPrompt}\nReturn only a valid JSON object. Do not use markdown code fences.`,
      prompt,
      temperature: 0.2,
      metadata: { missionId: context.missionId, agent: this.id, action },
    };
    const response = await this.services.provider.generate(request);
    context.runtime.recordModelUsage(response.usage);
    try {
      return this.parseJson(response.text);
    } catch {
      const retry = await this.services.provider.generate({
        ...request,
        prompt: `${prompt}\n\nThe previous response was invalid JSON. Retry once. Return a compact valid JSON object only: no reasoning prose, no markdown, no unescaped quotation marks inside strings.`,
        metadata: { ...request.metadata, retry: "1" },
      });
      context.runtime.recordModelUsage(retry.usage);
      return this.parseJson(retry.text);
    }
  }

  protected message<T>(
    context: AgentExecutionContext,
    recipient: AgentId | "orchestrator",
    type: AgentMessage<T>["type"],
    payload: T,
  ): AgentMessage<T> {
    return {
      id: crypto.randomUUID(),
      missionId: context.missionId,
      sender: this.id,
      recipient,
      type,
      createdAt: new Date().toISOString(),
      payload,
    };
  }

  protected withExecutionLog<T>(
    context: AgentExecutionContext,
    action: string,
    work: () => Promise<T>,
  ): Promise<T> {
    return this.logExecution(context, action, work);
  }

  private async logExecution<T>(context: AgentExecutionContext, action: string, work: () => Promise<T>): Promise<T> {
    const stage = this.stage();
    await this.services.missions.recordActivity(context.missionId, {
      stage,
      action: `Agent ${action} started`,
      status: "started",
      metadata: { agent: this.id, provider: this.services.provider.id },
    });
    try {
      const result = await work();
      await this.services.missions.recordActivity(context.missionId, {
        stage,
        action: `Agent ${action} completed`,
        status: "succeeded",
        metadata: { agent: this.id, provider: this.services.provider.id },
      });
      return result;
    } catch (error) {
      await this.services.missions.recordActivity(context.missionId, {
        stage,
        action: `Agent ${action} failed`,
        status: "failed",
        metadata: { agent: this.id, message: error instanceof Error ? error.message : "Unknown agent error" },
      });
      throw error;
    }
  }

  private stage() {
    if (this.id === "planner") return "planning" as const;
    if (this.id === "research" || this.id === "browser") return "researching" as const;
    if (this.id === "reviewer") return "reviewing" as const;
    return "executing" as const;
  }

  protected parseJson(text: string): unknown {
    const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      return JSON.parse(clean) as unknown;
    } catch {
      try {
        const repaired = this.repairUnescapedQuotes(clean).replace(/\"toolInput\s*:/g, '\"toolInput\":');
        return JSON.parse(repaired) as unknown;
      } catch {
        // Some small local models concatenate multiple JSON objects. Accept the
        // first complete object only; schema validation still decides whether it
        // is usable, and the normal retry path remains active on failure.
        const start = clean.indexOf("{");
        if (start >= 0) {
          let depth = 0; let inString = false; let escaped = false;
          for (let index = start; index < clean.length; index += 1) {
            const character = clean[index];
            if (character === "\\" && inString && !escaped) { escaped = true; continue; }
            if (character === '"' && !escaped) inString = !inString;
            escaped = false;
            if (inString) continue;
            if (character === "{") depth += 1;
            if (character === "}") { depth -= 1; if (depth === 0) {
              try { return JSON.parse(clean.slice(start, index + 1)) as unknown; } catch { break; }
            }}
          }
        }
      if (process.env.NODE_ENV !== "production") console.error(`[Agent ${this.id}] Invalid JSON response:`, text);
      throw new Error(`Agent ${this.id} returned invalid JSON: ${text}`);
      }
    }
  }

  private repairUnescapedQuotes(value: string): string {
    let result = "";
    let inString = false;
    let escaped = false;
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      if (character === "\\" && inString && !escaped) { result += character; escaped = true; continue; }
      if (character === '"') {
        if (!inString) {
          inString = true;
        } else if (!escaped) {
          let next = index + 1;
          while (/\s/.test(value[next] ?? "")) next += 1;
          if (![",", ":", "]", "}"].includes(value[next] ?? "") && next < value.length) result += "\\";
          else inString = false;
        }
      }
      result += character;
      escaped = false;
    }
    return result;
  }
}
