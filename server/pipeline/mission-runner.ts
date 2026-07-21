import type { MissionRepository } from "@/server/storage/mission-repository";
import type { PlannerTask } from "@/server/ai/types";
import { runPlanner, createFallbackPlan } from "@/server/ai/agents/planner";
import { runCodingAgent } from "@/server/ai/agents/coding";
import { runReviewer } from "@/server/ai/agents/reviewer";
import { getAIProvider } from "@/server/ai/provider-factory";

function topologicalSort(tasks: PlannerTask[]): PlannerTask[] {
  const byTitle = new Map<string, PlannerTask>();
  for (const t of tasks) byTitle.set(t.title, t);

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const sorted: PlannerTask[] = [];
  const unvisited = new Set(tasks.map((t) => t.title));

  function visit(title: string) {
    if (visited.has(title)) return;
    if (inStack.has(title)) return;
    inStack.add(title);
    const task = byTitle.get(title);
    if (task) {
      for (const dep of task.dependencies) {
        if (byTitle.has(dep) && !visited.has(dep)) {
          visit(dep);
        }
      }
    }
    inStack.delete(title);
    visited.add(title);
    unvisited.delete(title);
    if (task) sorted.push(task);
  }

  while (unvisited.size > 0) {
    visit(unvisited.values().next().value as string);
  }

  return sorted;
}

export class MissionRunner {
  private activeRuns = new Set<string>();

  constructor(private repository: MissionRepository) {}

  async run(missionId: string): Promise<void> {
    console.log("[mission-runner] run() called for mission", missionId);
    if (this.activeRuns.has(missionId)) return;
    this.activeRuns.add(missionId);

    try {
      console.log("[mission-runner] calling execute()");
      await this.execute(missionId);
    } catch (err) {
      await this.repository.addLog(missionId, {
        stage: "failed",
        action: "Mission failed",
        status: "failed",
        metadata: { message: err instanceof Error ? err.message : String(err) },
      });
      await this.repository.update(missionId, { status: "failed", progress: 100 });
    } finally {
      this.activeRuns.delete(missionId);
    }
  }

  private async execute(missionId: string): Promise<void> {
    const mission = await this.repository.get(missionId);
    const workspacePath = mission.workspace?.workspacePath ?? process.cwd();

    await this.repository.update(missionId, { status: "executing" });

    let tasks: PlannerTask[] = [];

    if (mission.finalPlan && mission.finalPlan.length > 0) {
      // Use pre-built plan from skeleton
      await this.repository.addLog(missionId, {
        stage: "planning",
        action: "Using pre-built plan from skeleton",
        status: "succeeded",
        metadata: { taskCount: mission.finalPlan.length },
      });

      tasks = mission.finalPlan.map((stage) => ({
        title: stage.title,
        goal: stage.objective,
        expectedOutput: stage.explanation,
        suggestedTools: stage.suggestedTools ?? ["filesystem", "terminal"],
        dependencies: (stage.dependencies ?? []).map((depId: string) => {
          const depStage = mission.finalPlan!.find((s) => s.id === depId);
          return depStage ? depStage.title : "";
        }).filter(Boolean),
        completionCriteria: stage.completionCriteria ?? [stage.objective],
      }));
      } else {
        // Phase 1: Planning (AI-generated plan)
        console.log("[mission-runner] starting AI planning phase");
        await this.repository.addLog(missionId, {
          stage: "planning",
          action: "Planning mission",
          status: "started",
          metadata: {},
        });

        let planResult;
        try {
          console.log("[mission-runner] calling getAIProvider()");
          const provider = getAIProvider();
          console.log("[mission-runner] calling runPlanner()");
          planResult = await runPlanner(
          {
            missionId,
            title: mission.title,
            description: mission.description,
            goal: mission.goal,
            workspacePath,
            memory: [],
            toolResults: [],
          },
          provider
        );
      } catch {
        planResult = createFallbackPlan(mission.goal);
      }

      await this.repository.addLog(missionId, {
        stage: "planning",
        action: "Planning completed",
        status: "succeeded",
        metadata: { summary: planResult.summary },
      });

      await this.repository.update(missionId, { progress: 30 });

      // Parse tasks
      try {
        const planData = JSON.parse(planResult.content);
        tasks = planData.tasks ?? [];
      } catch {
        tasks = [];
      }

      if (tasks.length === 0) {
        tasks = [
          {
            title: "Implementation",
            goal: mission.goal,
            expectedOutput: "Working implementation",
            suggestedTools: ["filesystem", "terminal"],
            dependencies: [],
            completionCriteria: ["Implementation complete"],
          },
        ];
      }
    }

    // Sort tasks topologically by dependencies
    const orderedTasks = topologicalSort(tasks);

    // Phase 2: Execute tasks in dependency order
    await this.repository.addLog(missionId, {
      stage: "executing",
      action: `Starting ${orderedTasks.length} tasks in dependency order`,
      status: "started",
      metadata: { taskCount: orderedTasks.length },
    });

    await this.repository.update(missionId, { status: "executing", progress: 30 });

    const completedTasks = new Set<string>();
    let allArtifacts: Array<{ name: string; kind: "file" | "link" | "generated"; path?: string; mimeType?: string }> = [];

    for (let i = 0; i < orderedTasks.length; i++) {
      const task = orderedTasks[i];
      const taskProgress = 30 + Math.floor(((i + 1) / orderedTasks.length) * 50);

      // Check dependencies are met
      const missingDeps = task.dependencies.filter((d) => !completedTasks.has(d));
      if (missingDeps.length > 0) {
        await this.repository.addLog(missionId, {
          stage: "executing",
          action: `Skipping task: ${task.title} (unmet dependencies: ${missingDeps.join(", ")})`,
          status: "failed",
          metadata: { missingDependencies: missingDeps },
        });
        continue;
      }

      await this.repository.addLog(missionId, {
        stage: "executing",
        action: `Executing task: ${task.title}`,
        status: "started",
        metadata: {
          taskIndex: i,
          taskTitle: task.title,
          goal: task.goal,
          expectedOutput: task.expectedOutput,
        },
      });

      try {
        const provider = getAIProvider();
        const memory = mission.memory.map((m) => ({ key: m.key, value: m.value, source: m.source }));
        const taskDescription = `Goal: ${task.goal}\nExpected output: ${task.expectedOutput}\nCompletion criteria:\n${task.completionCriteria.map((c) => `  - ${c}`).join("\n")}`;

        const codingResult = await runCodingAgent(
          { missionId, title: mission.title, description: mission.description, goal: mission.goal, workspacePath, memory, toolResults: [] },
          provider,
          taskDescription
        );

        for (const art of codingResult.artifacts) {
          const artifact = await this.repository.addArtifact(missionId, {
            name: art.name,
            kind: art.kind,
            mimeType: art.mimeType,
            metadata: { toolId: "filesystem", path: art.path, task: task.title },
          });
          allArtifacts.push(art);
        }

        completedTasks.add(task.title);

        await this.repository.addLog(missionId, {
          stage: "executing",
          action: `Task completed: ${task.title}`,
          status: "succeeded",
          metadata: { artifacts: codingResult.artifacts.length },
        });

        await this.repository.addOutput(missionId, {
          type: "code",
          title: task.title,
          content: codingResult.summary,
          metadata: { artifacts: codingResult.artifacts.map((a) => a.name) },
        });

        await this.repository.addMemory(missionId, `task-${i}-${task.title}`, codingResult.summary, "executing");
      } catch (err) {
        await this.repository.addLog(missionId, {
          stage: "executing",
          action: `Task failed: ${task.title}`,
          status: "failed",
          metadata: { error: err instanceof Error ? err.message : String(err) },
        });
      }

      await this.repository.update(missionId, { progress: taskProgress });
    }

    // Phase 3: Review
    await this.repository.update(missionId, { status: "reviewing", progress: 90 });

    try {
      const provider = getAIProvider();
      const reviewResult = await runReviewer(
        { missionId, title: mission.title, description: mission.description, goal: mission.goal, workspacePath, memory: [], toolResults: [] },
        provider,
        { summary: "", content: allArtifacts.map((a) => `Created: ${a.name}`).join("\n"), artifacts: allArtifacts }
      );

      await this.repository.addLog(missionId, {
        stage: "reviewing",
        action: "Review completed",
        status: "succeeded",
        metadata: { summary: reviewResult.summary },
      });

      await this.repository.addOutput(missionId, {
        type: "summary",
        title: "Review",
        content: reviewResult.content,
        metadata: {},
      });
    } catch {
      await this.repository.addLog(missionId, {
        stage: "reviewing",
        action: "Review skipped (provider unavailable)",
        status: "info",
        metadata: {},
      });
    }

    // Complete
    const completedCount = completedTasks.size;
    const totalCount = orderedTasks.length;
    await this.repository.addLog(missionId, {
      stage: "completed",
      action: "Mission completed",
      status: "succeeded",
      metadata: {
        totalTasks: totalCount,
        completedTasks: completedCount,
        failedTasks: totalCount - completedCount,
        totalArtifacts: allArtifacts.length,
      },
    });

    await this.repository.update(missionId, { status: "completed", progress: 100 });
  }
}
