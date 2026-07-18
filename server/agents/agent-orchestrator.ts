import type { AgentRegistry } from "@/server/agents/agent-registry";
import { defaultAgentRuntimeLimits, RuntimeBudget, type AgentRuntimeLimits } from "@/server/agents/runtime-limits";
import { SharedMissionMemory } from "@/server/agents/shared-mission-memory";
import type { MissionService } from "@/server/mission-service";
import type { ToolRegistry } from "@/server/tools/registry";
import type { ToolExecutionRecord } from "@/server/tools/types";
import type { AgentExecutionContext, AgentId, AgentMessage, AgentResult, AgentTask } from "@/types/agent";

const progressByAgent: Record<AgentId, number> = { planner: 10, research: 30, browser: 40, coding: 60, document: 70, github: 75, reviewer: 85 };

export class AgentOrchestrator {
  private readonly limits: AgentRuntimeLimits;

  constructor(
    private readonly agents: AgentRegistry,
    private readonly missions: MissionService,
    private readonly tools: ToolRegistry,
    limits?: Partial<AgentRuntimeLimits>,
  ) { this.limits = { ...defaultAgentRuntimeLimits, ...limits }; }

  async run(missionId: string): Promise<void> {
    const mission = await this.missions.get(missionId);
    if (mission.status !== "queued") return;

    const runtime = new RuntimeBudget(this.limits);
    const memory = await SharedMissionMemory.load(missionId, this.missions);
    const context: AgentExecutionContext = { missionId, title: mission.title, description: mission.description, goal: mission.goal, previousMessages: [], toolObservations: [], memory: memory.snapshot(), runtime };
    await this.missions.transition(missionId, "planning", progressByAgent.planner, "Planner agent is decomposing the mission.");
    const plan = await this.agents.get("planner").plan(context);
    context.previousMessages.push(plan);
    await memory.remember("planner-objectives", { objectives: plan.payload.objectives, summary: plan.payload.summary }, "planning");
    context.memory = memory.snapshot();

    const taskIndex = new Map(plan.payload.tasks.map((task) => [task.id, task]));
    const completedTasks = new Set<string>();
    const results: AgentMessage<AgentResult>[] = [];
    for (const task of plan.payload.tasks) {
      if (task.targetAgent === "planner" || task.targetAgent === "reviewer") throw new Error(`Planner assigned non-specialist agent '${task.targetAgent}' to task '${task.id}'`);
      if (!task.dependsOn.every((dependency) => completedTasks.has(dependency))) throw new Error(`Task '${task.id}' has unresolved dependencies`);
      results.push(await this.executeSpecialistTask(context, memory, task));
      completedTasks.add(task.id);
    }

    let reviewCycle = 0;
    let finalReviewPending = false;
    while (true) {
      await this.missions.transition(missionId, "reviewing", progressByAgent.reviewer, "Reviewer agent is validating mission outputs.");
      const review = await this.agents.get("reviewer").review(context, results);
      context.previousMessages.push(review);
      await memory.remember("review", review.payload, "reviewing");
      context.memory = memory.snapshot();
      if (review.payload.approved && review.payload.qualityScore >= this.limits.reviewQualityThreshold) {
        await this.completeMission(missionId, mission.title, review.payload.summary, review.payload, results, runtime);
        return;
      }
      if (reviewCycle >= this.limits.maxReviewCycles) {
        if (!finalReviewPending) {
          // One last independent review is allowed after bounded rework.
          finalReviewPending = true;
          reviewCycle += 1;
          continue;
        }
        const warningNotes = [...review.payload.issues, ...review.payload.recommendations];
        const warningReview = { ...review.payload, approved: true, approvedWithWarnings: true, warningNotes };
        await this.completeMission(
          missionId,
          mission.title,
          `${review.payload.summary}\n\nApproved with warnings:\n${warningNotes.join("\n") || "Reviewer identified remaining uncertainty."}`,
          warningReview,
          results,
          runtime,
        );
        return;
      }
      if (review.payload.rework.length === 0) {
        const warningNotes = [...review.payload.issues, ...review.payload.recommendations];
        const warningReview = { ...review.payload, approved: true, approvedWithWarnings: true, warningNotes };
        await this.completeMission(
          missionId,
          mission.title,
          `${review.payload.summary}\n\nApproved with warnings:\n${warningNotes.join("\n") || "Reviewer identified remaining uncertainty."}`,
          warningReview,
          results,
          runtime,
        );
        return;
      }
      reviewCycle += 1;
      for (const feedback of review.payload.rework) {
        const original = taskIndex.get(feedback.taskId);
        if (!original || original.targetAgent !== feedback.agent) continue;
        await memory.recordFeedback(feedback.agent, feedback.taskId, feedback.feedback);
        context.memory = memory.snapshot();
        const reworkTask: AgentTask = { ...original, instructions: `${original.instructions}\n\nReviewer feedback to address: ${feedback.feedback}` };
        const result = await this.executeSpecialistTask(context, memory, reworkTask);
        const index = results.findIndex((candidate) => candidate.sender === feedback.agent);
        if (index >= 0) results[index] = result; else results.push(result);
      }
    }
  }

  private async executeSpecialistTask(context: AgentExecutionContext, memory: SharedMissionMemory, task: AgentTask): Promise<AgentMessage<AgentResult>> {
    const agent = this.agents.get(task.targetAgent);
    await this.transitionForAgent(context.missionId, task.targetAgent);
    const startObservations = context.toolObservations.length;
    let stopped = "Reasoning steps completed";
    let previousSignature = "";
    let stagnantCycles = 0;
    let observationsAtPreviousStep = startObservations;
    for (let step = 1; step <= this.limits.maxReasoningSteps; step += 1) {
      try { context.runtime.beginReasoningStep(); } catch (error) { stopped = error instanceof Error ? error.message : stopped; break; }
      context.memory = memory.snapshot();
      const reasoning = await agent.reason(context, task, step);
      context.previousMessages.push(reasoning);
      let decision = reasoning.payload;
      const hasNewObservation = context.toolObservations.length > observationsAtPreviousStep;
      const requiredTool = task.requiredTools.find((required) => !context.toolObservations.some((observation) => observation.toolId === required.id));
      // A bounded local model can incorrectly claim completion before invoking a
      // required deliverable tool. Keep the schema strict, but enforce the task's
      // declared capability at the runtime boundary so required artifacts exist.
      if (requiredTool && (requiredTool.id === "document" || decision.nextAction === "complete" || !decision.chosenTool)) {
        const input = requiredTool.id === "document"
          ? {
            format: "pdf",
            filename: `afteryou-${context.missionId}-report.pdf`,
            title: task.title,
            content: [task.instructions, ...context.toolObservations.map((observation) => `${observation.summary}\n${JSON.stringify(observation.data)}`)].join("\n\n").slice(0, 480_000),
          }
          : requiredTool.input;
        decision = { ...decision, chosenTool: requiredTool.id, toolInput: input, nextAction: "continue" };
        await this.missions.recordActivity(context.missionId, { stage: "executing", action: "Required tool enforced", status: "info", metadata: { agent: agent.id, taskId: task.id, toolId: requiredTool.id } });
      }
      const signature = JSON.stringify({ tool: decision.chosenTool, input: decision.toolInput, action: decision.nextAction, confidence: Math.round(decision.confidence * 10) / 10 });
      if (!hasNewObservation && signature === previousSignature) stagnantCycles += 1;
      else stagnantCycles = 0;
      previousSignature = signature;
      observationsAtPreviousStep = context.toolObservations.length;
      if (stagnantCycles >= 1) {
        stopped = "Research reasoning stabilized without new observations; synthesizing accumulated evidence.";
        await this.missions.recordActivity(context.missionId, { stage: this.stageFor(agent.id), action: "Reasoning loop terminated after stabilization", status: "info", metadata: { agent: agent.id, taskId: task.id, step, confidence: decision.confidence } });
        break;
      }
      if (decision.nextAction === "complete" || (decision.confidence >= this.limits.highConfidenceThreshold && hasNewObservation)) {
        stopped = decision.nextAction === "complete" ? "Specialist marked task complete" : "High-confidence early termination";
        break;
      }
      if (!decision.chosenTool) { stopped = "Specialist requested feedback without a tool call"; break; }
      try { context.runtime.assertCanCallTool(); context.runtime.recordToolCall(); } catch (error) { stopped = error instanceof Error ? error.message : stopped; break; }
      if (memory.hasToolCall(decision.chosenTool, decision.toolInput)) {
        const observation = { toolId: decision.chosenTool, summary: "Skipped duplicate tool call; prior result is in shared mission memory.", data: {} };
        context.toolObservations.push(observation);
        await this.missions.recordActivity(context.missionId, { stage: "executing", action: "Duplicate tool call avoided", status: "info", metadata: { agent: agent.id, toolId: decision.chosenTool, reasoningStep: step } });
        stopped = "Duplicate tool call detected; synthesizing accumulated evidence.";
        break;
      }
      try {
        const record = await this.tools.execute(context.missionId, decision.chosenTool, decision.toolInput);
        await this.storeToolRecord(context, memory, decision.toolInput, record);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tool execution failed";
        await memory.recordFailure(decision.chosenTool, decision.toolInput, message);
        context.memory = memory.snapshot();
        context.toolObservations.push({ toolId: decision.chosenTool, summary: `Tool failed: ${message}. Choose another strategy or retry with corrected input.`, data: {} });
      }
    }
    const result = await agent.execute(context, { ...task, instructions: `${task.instructions}\n\nLoop outcome: ${stopped}` });
    context.previousMessages.push(result);
    await memory.remember(`agent-result:${task.id}`, { agent: agent.id, summary: result.payload.summary, content: result.payload.content }, this.stageFor(agent.id));
    context.memory = memory.snapshot();
    return result;
  }

  private async storeToolRecord(context: AgentExecutionContext, memory: SharedMissionMemory, input: Record<string, unknown>, record: ToolExecutionRecord): Promise<void> {
    context.toolObservations.push({ toolId: record.toolId, summary: record.summary, data: record.data });
    await memory.recordTool(record.toolId, input, record);
    context.memory = memory.snapshot();
    for (const artifact of record.artifacts) {
      if (process.env.NODE_ENV !== "production") console.info("[ArtifactTrace] registering tool artifact", { missionId: context.missionId, toolId: record.toolId, artifact });
      await this.missions.addArtifact(context.missionId, { name: artifact.name, kind: artifact.kind, url: artifact.url, mimeType: artifact.mimeType, metadata: { toolId: record.toolId, path: artifact.path, ...artifact.metadata } });
    }
  }

  private async completeMission(missionId: string, title: string, summary: string, review: Record<string, unknown>, results: AgentMessage<AgentResult>[], runtime: RuntimeBudget): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      const snapshot = await this.missions.get(missionId);
      console.info("[ArtifactTrace] mission completion snapshot", { missionId, outputs: snapshot.outputs.length, artifacts: snapshot.artifacts.length, resultArtifacts: results.flatMap((result) => result.payload.artifacts) });
    }
    await this.missions.addOutput(missionId, { type: "summary", title: `${title} — Final mission result`, content: summary, metadata: { ...review, runtime: runtime.snapshot() } });
    await this.missions.transition(missionId, "completed", 100, "Final mission result is ready.");
    await this.missions.recordActivity(missionId, { stage: "completed", action: "Autonomous agent runtime completed", status: "succeeded", metadata: { agentCount: new Set(results.map((result) => result.sender)).size + 2, outputCount: (await this.missions.get(missionId)).outputs.length, runtime: runtime.snapshot() } });
  }

  private async transitionForAgent(missionId: string, agent: AgentId): Promise<void> {
    const status = this.stageFor(agent);
    const mission = await this.missions.get(missionId);
    if (mission.status !== status) await this.missions.transition(missionId, status, progressByAgent[agent]);
  }

  private stageFor(agent: AgentId) { return agent === "planner" ? "planning" as const : agent === "research" || agent === "browser" ? "researching" as const : agent === "reviewer" ? "reviewing" as const : "executing" as const; }
}
