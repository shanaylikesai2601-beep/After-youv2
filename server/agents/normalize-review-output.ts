import type { AgentId, AgentReview } from "@/types/agent";

const SENTINELS = new Set(["", "null", "none", "undefined", "n/a", "na", "unknown"]);

function isAbsent(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && SENTINELS.has(value.trim().toLowerCase()));
}

function asText(value: unknown): string | null {
  if (isAbsent(value)) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return null;
}

function listOfText(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter((item): item is string => Boolean(item));
}

function normalizeAgent(value: unknown): AgentId | null {
  const text = asText(value)?.toLowerCase().trim();
  if (!text) return null;
  const aliases: Record<string, AgentId> = {
    planner: "planner", research: "research", researcher: "research", browser: "browser",
    coding: "coding", coder: "coding", document: "document", documents: "document",
    github: "github", reviewer: "reviewer", review: "reviewer",
  };
  return aliases[text];
}

/** Converts common local-model review variants to the strict AgentReview shape. */
export function normalizeAgentReviewOutput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const value = raw as Record<string, unknown>;
  const reworkRaw = value.rework ?? value.reworkTasks ?? value.revisions ?? [];
  const rework = Array.isArray(reworkRaw)
    ? reworkRaw.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const item = entry as Record<string, unknown>;
      const agent = normalizeAgent(item.agent ?? item.owner ?? item.targetAgent);
      const taskId = asText(item.taskId ?? item.task ?? item.id);
      const feedback = asText(item.feedback ?? item.instruction ?? item.description ?? item.reason);
      return agent && taskId && feedback ? { agent, taskId, feedback } : null;
    }).filter((item): item is { agent: AgentId; taskId: string; feedback: string } => Boolean(item))
    : [];

  const scoreValue = value.qualityScore ?? value.score ?? value.quality ?? 0;
  const score = typeof scoreValue === "number" ? scoreValue : Number.parseInt(String(scoreValue), 10);
  const approvedValue = value.approved ?? value.approve ?? value.passed ?? false;
  const approved = typeof approvedValue === "boolean"
    ? approvedValue
    : ["true", "yes", "approved", "pass", "passed"].includes(String(approvedValue).trim().toLowerCase());

  return {
    approved,
    qualityScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
    summary: asText(value.summary ?? value.overview ?? value.conclusion) ?? "Review completed.",
    issues: listOfText(value.issues ?? value.problems ?? value.errors),
    recommendations: listOfText(value.recommendations ?? value.recommendation ?? value.nextSteps),
    rework,
  } satisfies AgentReview;
}
