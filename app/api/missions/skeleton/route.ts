import { jsonError } from "@/lib/http";
import { getMissionService } from "@/server/mission-container";
import { runPlanner, createFallbackPlan } from "@/server/ai/agents/planner";
import { getAIProvider } from "@/server/ai/provider-factory";
import type { MissionPlanStage } from "@/types/mission";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { missionId } = await request.json() as { missionId: string };
    if (!missionId) return Response.json({ error: "missionId is required" }, { status: 400 });

    const svc = await getMissionService();
    const mission = await svc.get(missionId);
    const goal = mission.goal;

    let tasks: Array<{ title: string; goal: string; expectedOutput: string; suggestedTools: string[]; dependencies: string[]; completionCriteria: string[] }>;

    try {
      const provider = getAIProvider();
      const plan = await runPlanner({ goal, missionId, title: mission.title, description: mission.description, workspacePath: mission.workspace?.workspacePath ?? "", memory: [], toolResults: [] }, provider);
      tasks = JSON.parse(plan.content).tasks;
    } catch {
      const fallback = createFallbackPlan(goal);
      tasks = JSON.parse(fallback.content).tasks;
    }

    const stages: MissionPlanStage[] = tasks.map((t, i) => ({
      id: `stage-${i + 1}`,
      title: t.title,
      objective: t.goal,
      explanation: t.expectedOutput,
      complexity: t.suggestedTools.length > 2 ? "high" : t.suggestedTools.length > 1 ? "medium" : "low" as MissionPlanStage["complexity"],
      estimatedDuration: Math.max(2, Math.min(30, Math.ceil(t.goal.length / 120) + 4)),
      dependencies: t.dependencies.map((dep) => {
        const idx = tasks.findIndex((ot) => ot.title === dep);
        return idx >= 0 ? `stage-${idx + 1}` : "";
      }).filter(Boolean),
      suggestedTools: t.suggestedTools,
      completionCriteria: t.completionCriteria,
    }));

    await svc.update(missionId, { finalPlan: stages });

    return Response.json({ data: { tasks: stages, total: stages.length } });
  } catch (error) {
    return jsonError(error);
  }
}
