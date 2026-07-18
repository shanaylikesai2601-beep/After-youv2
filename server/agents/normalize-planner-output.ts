import { AGENT_IDS, type AgentId } from "@/types/agent";

type JsonRecord = Record<string, unknown>;

const toolIds = new Set(["browser", "filesystem", "terminal", "search", "fetch", "github", "document"]);
const agentIds = new Set<string>(AGENT_IDS);

/**
 * Adapts provider-specific planning JSON to the existing strict AgentPlan shape.
 * Validation remains the responsibility of agentPlanSchema after this boundary.
 */
export function normalizePlannerOutput(raw: unknown): unknown {
  const plan = record(raw);
  const rawTasks = array(plan.tasks ?? plan.task ?? plan.steps ?? plan.plan);
  const objectives = array(plan.objectives ?? plan.objective ?? plan.goals)
    .map(stringValue)
    .filter((objective): objective is string => Boolean(objective))
    .filter((objective) => objective.toLowerCase() !== "tasks");
  const tasks = rawTasks.length > 0
    ? rawTasks.map((rawTask, index) => normalizeTask(rawTask, index))
    : objectives.map((objective, index) => normalizeTask({ id: `task-${index + 1}`, instructions: objective }, index));
  const taskIdsByLabel = new Map<string, string>();
  for (const task of tasks) {
    const id = stringValue(task.id);
    const title = stringValue(task.title);
    if (id) {
      taskIdsByLabel.set(id.toLowerCase(), id);
      if (title) taskIdsByLabel.set(title.toLowerCase(), id);
    }
  }
  for (const task of tasks) {
    task.dependsOn = Array.isArray(task.dependsOn)
      ? task.dependsOn.map((dependency) => {
        const label = String(dependency).toLowerCase().trim();
        const direct = taskIdsByLabel.get(label);
        if (direct) return direct;
        const compact = label.replace(/^task\s+\d+\s*:\s*/, "");
        for (const [knownLabel, id] of taskIdsByLabel) {
          if (knownLabel.replace(/^task\s+\d+\s*:\s*/, "") === compact) return id;
        }
        return undefined;
      })
        .filter((dependency): dependency is string => typeof dependency === "string")
      : [];
  }
  const instructionObjectives = tasks.map((task) => task.instructions);

  return {
    summary: stringValue(plan.summary ?? plan.overview ?? plan.description) ?? "Mission execution plan",
    objectives: objectives.length > 0 ? objectives : instructionObjectives.length > 0 ? instructionObjectives : ["Complete the mission goal"],
    tasks,
  };
}

function normalizeTask(raw: unknown, index: number): JsonRecord {
  const task = record(raw);
  const baseInstructions = stringValue(task.instructions ?? task.instruction ?? task.description ?? task.prompt ?? task.objective ?? task.name) ?? stringValue(raw) ?? `Complete task ${index + 1}`;
  const evidence = stringValue(task.evidence);
  const completionCriteria = stringValue(task.completion_criteria ?? task.completionCriteria ?? task.criteria);
  const instructions = [baseInstructions, evidence ? `Required evidence: ${evidence}` : undefined, completionCriteria ? `Completion criteria: ${completionCriteria}` : undefined]
    .filter((part): part is string => Boolean(part)).join("\n");
  const requiredTools = array(task.requiredTools ?? task.required_tools ?? task.tools).map(normalizeTool).filter((tool): tool is JsonRecord => tool !== undefined);
  const normalizedTarget = normalizeAgent(task.targetAgent ?? task.target_agent ?? task.agent ?? task.role ?? task.assignee ?? task.owner, instructions, requiredTools);
  // Reviewer/planner are lifecycle agents, not executable task owners. Local models
  // occasionally assign them to a task; route that work to the appropriate specialist.
  const targetAgent = normalizedTarget === "reviewer" || normalizedTarget === "planner"
    ? (/document|pdf|docx|markdown|report|presentation|slide/i.test(instructions) ? "document" : "research")
    : normalizedTarget;
  if (targetAgent === "document" && /pdf|docx|markdown|report|document/i.test(instructions) && !requiredTools.some((tool) => tool.id === "document")) {
    requiredTools.push({ id: "document", phase: "before", input: {} });
  }
  const id = stringValue(task.id ?? task.taskId ?? task.task_id) ?? `task-${index + 1}`;
  return {
    id,
    title: stringValue(task.title ?? task.name) ?? titleFromInstructions(instructions),
    instructions,
    targetAgent,
    expectedOutput: stringValue(task.expectedOutput ?? task.expected_output ?? task.output ?? task.deliverable) ?? inferExpectedOutput(targetAgent, instructions, requiredTools),
    dependsOn: array(task.dependsOn ?? task.depends_on ?? task.dependencies).map(stringValue).filter((dependency): dependency is string => Boolean(dependency) && dependency !== id),
    requiredTools,
  };
}

function normalizeTool(raw: unknown): JsonRecord | undefined {
  const value = typeof raw === "string" ? { tool: raw } : record(raw);
  const rawId = stringValue(value.id ?? value.tool ?? value.name)?.toLowerCase();
  const id = rawId ? normalizeToolId(rawId) : undefined;
  if (!id) return undefined;
  return {
    id,
    phase: value.phase === "after" ? "after" : "before",
    input: record(value.input ?? value.arguments ?? value.params ?? {}),
  };
}

function normalizeToolId(value: string): string | undefined {
  if (toolIds.has(value)) return value;
  if (/search|database|analyst|news|filing|crunchbase|pitchbook|linkedin|source/.test(value)) return "search";
  if (/pdf|document|word processor|layout|visualization|grammar|style/.test(value)) return "document";
  if (/browser|website|navigate|click|web page/.test(value)) return "browser";
  if (/github|repository|repo/.test(value)) return "github";
  if (/terminal|shell|command/.test(value)) return "terminal";
  if (/file|filesystem|directory/.test(value)) return "filesystem";
  return undefined;
}

function normalizeAgent(value: unknown, instructions: string, tools: JsonRecord[]): string {
  const candidate = stringValue(value)?.toLowerCase().replace(/\s+/g, " ");
  const aliases: Record<string, AgentId> = { researcher: "research", "research analyst": "research", "research specialist": "research", researchagent: "research", browseragent: "browser", codingagent: "coding", developer: "coding", documentagent: "document", "content specialist": "document", "formatting specialist": "document", "report writer": "document", writer: "document", reviewer: "research", "review specialist": "research", revieweragent: "reviewer", planneragent: "planner" };
  if (candidate && agentIds.has(candidate)) return candidate;
  if (candidate && aliases[candidate]) return aliases[candidate];
  const text = `${instructions} ${tools.map((tool) => tool.id).join(" ")}`.toLowerCase();
  if (/code|implement|refactor|test|compile|terminal|filesystem/.test(text)) return "coding";
  if (/document|pdf|docx|markdown|report|presentation|slide/.test(text)) return "document";
  if (/browse|navigate|click|screenshot|website/.test(text)) return "browser";
  if (/review|verify|quality|audit/.test(text)) return "reviewer";
  return "research";
}

function inferExpectedOutput(agent: string, instructions: string, tools: JsonRecord[]): string {
  const text = `${agent} ${instructions} ${tools.map((tool) => tool.id).join(" ")}`.toLowerCase();
  if (/code|implement|refactor|test|compile/.test(text)) return "Code Changes";
  if (/document|pdf|docx|markdown|report|slide/.test(text)) return "Generated Document";
  if (/browser|browse|navigate|screenshot/.test(text)) return "Browser Results";
  return "Research Report";
}

function titleFromInstructions(instructions: string): string {
  const compact = instructions.replace(/\s+/g, " ").trim();
  const sentence = compact.split(/[.!?]/, 1)[0] ?? compact;
  return sentence.slice(0, 120) || "Mission task";
}

function record(value: unknown): JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]; }
function stringValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (["", "null", "none", "n/a", "na", "undefined"].includes(normalized.toLowerCase())) return undefined;
    return normalized;
  }
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return undefined;
}
