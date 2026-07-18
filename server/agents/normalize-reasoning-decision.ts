const SENTINELS = new Set(["", "null", "none", "n/a", "na", "undefined"]);
const TOOL_NAMES = new Set(["browser", "filesystem", "terminal", "search", "fetch", "github", "document"]);

export function normalizeSentinel(value: unknown): unknown {
  return typeof value === "string" && SENTINELS.has(value.trim().toLowerCase()) ? undefined : value;
}

export function normalizeChosenTool(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (SENTINELS.has(trimmed.toLowerCase())) return undefined;
  const canonical = trimmed.toLowerCase();
  return TOOL_NAMES.has(canonical) ? canonical : undefined;
}

/** Supplies only structurally required reasoning fields omitted by some providers. */
export function normalizeReasoningDecision(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const value = { ...(raw as Record<string, unknown>) };
  const reasoningSummary = typeof value.reasoningSummary === "string" && value.reasoningSummary.trim()
    ? value.reasoningSummary.trim()
    : "The agent evaluated the current task state and selected the next bounded action.";
  const normalizedChosenTool = normalizeChosenTool(value.chosenTool);
  const chosenToolValue = typeof normalizedChosenTool === "string" ? normalizedChosenTool.toLowerCase().trim() : "";
  const compactChosenTool = chosenToolValue.replace(/[^a-z]/g, "");
  const chosenTool = typeof normalizedChosenTool === "string" && chosenToolValue.length > 0 && !/^(no tool)(\b|\s|\.)/.test(chosenToolValue)
    && !["null", "none", "na", "undefined"].includes(compactChosenTool)
    ? normalizedChosenTool
    : null;
  const nextAction = value.nextAction === "complete" || value.nextAction === "request_feedback" || value.nextAction === "continue"
    ? value.nextAction
    : "continue";
  const confidence = typeof value.confidence === "number" && Number.isFinite(value.confidence)
    ? Math.max(0, Math.min(1, value.confidence))
    : 0.5;
  const whyTool = typeof value.whyTool === "string" && value.whyTool.trim()
    ? value.whyTool
    : chosenTool
      ? `Selected ${chosenTool} as the next execution tool.`
      : nextAction === "complete"
        ? "The agent marked the task complete based on its current evidence."
        : "No tool was selected; the agent is requesting feedback or another reasoning step.";
  const observations = Array.isArray(value.observations)
    ? value.observations.map((observation) => typeof observation === "string" ? observation : JSON.stringify(observation))
    : [];
  const toolInput = typeof value.toolInput === "object" && value.toolInput !== null && !Array.isArray(value.toolInput)
    ? value.toolInput
    : {};
  const normalized = { ...value, reasoningSummary, chosenTool, whyTool, observations, toolInput, confidence, nextAction };
  if (process.env.NODE_ENV !== "production" && normalized.chosenTool === "null") {
    throw new Error("normalizeReasoningDecision failed to normalize chosenTool");
  }
  return normalized;
}
