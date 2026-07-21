import { jsonError } from "@/lib/http";
import { suggestPlanSchema } from "@/lib/mission-validation";
import type { MissionPlanStage } from "@/types/mission";
import { getAgentOrchestrator } from "@/server/mission-container";

export const runtime = "nodejs";

// The plan is deliberately returned as editable data. Execution still uses the
// existing planner and orchestrator after the user accepts the plan.
export async function POST(request: Request): Promise<Response> {
  try {
    const { goal } = suggestPlanSchema.parse(await request.json());
    let stages: MissionPlanStage[];
    try {
      const orchestrator = await getAgentOrchestrator();
      const plan = await orchestrator.suggestPlan(goal);
      const planTasks = plan.tasks as Array<{ id: string; title: string; instructions: string; expectedOutput: string; targetAgent: string; dependsOn: string[] }>;
      stages = planTasks.slice(0, 4).map((task, index, tasks) => {
        const id = `stage-${index + 1}` as const;
        const dependencyIndexes = task.dependsOn.map((dependency) => tasks.findIndex((candidate) => candidate.id === dependency)).filter((dependencyIndex) => dependencyIndex >= 0 && dependencyIndex < index);
        return { id, title: task.title, objective: task.instructions, explanation: task.expectedOutput, complexity: (task.targetAgent === "coding" ? "high" : "medium") as MissionPlanStage["complexity"], estimatedDuration: Math.max(2, Math.min(30, Math.ceil(task.instructions.length / 120) + 4)), dependencies: dependencyIndexes.map((dependencyIndex) => `stage-${dependencyIndex + 1}`) };
      });
      if (stages.length === 0) stages = suggestStages(goal);
    } catch {
      // A planning preview remains usable when the configured provider is unavailable.
      // Execution still uses the normal provider-backed planner and contracts.
      stages = suggestStages(goal);
    }
    return Response.json({ data: { originalGoal: goal, stages } });
  } catch (error) { return jsonError(error); }
}

function suggestStages(goal: string): MissionPlanStage[] {
  const implementation = /build|create|develop|implement|website|landing|app|application|dashboard/i.test(goal);
  const stages: MissionPlanStage[] = implementation
    ? [
      ["Build the core experience", "Implement the primary user-facing experience and required files.", "high", 12],
      ["Add interactive functionality", "Connect navigation, forms, states, and requested interactions on the existing implementation.", "medium", 8],
      ["Verify and harden the result", "Run checks, repair issues, and verify every requested feature against the source.", "medium", 7],
      ["Polish and document", "Improve accessibility, responsiveness, performance, and document how to use the result.", "low", 5],
    ].map(([title, explanation, complexity, duration], index) => ({ id: `stage-${index + 1}`, title: String(title), objective: `${title}: ${goal}`, explanation: String(explanation), complexity: complexity as MissionPlanStage["complexity"], estimatedDuration: Number(duration), dependencies: index ? [`stage-${index}`] : [] }))
    : [
      ["Understand the goal", "Gather the relevant context and define the decision criteria.", "medium", 6],
      ["Produce the primary result", "Complete the main deliverable using the established criteria.", "high", 12],
      ["Verify the result", "Check the deliverable for correctness, completeness, and usability.", "medium", 6],
    ].map(([title, explanation, complexity, duration], index) => ({ id: `stage-${index + 1}`, title: String(title), objective: `${title}: ${goal}`, explanation: String(explanation), complexity: complexity as MissionPlanStage["complexity"], estimatedDuration: Number(duration), dependencies: index ? [`stage-${index}`] : [] }));
  return stages;
}
