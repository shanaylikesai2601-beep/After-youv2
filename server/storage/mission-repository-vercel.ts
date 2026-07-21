import type { Mission, CreateMissionInput, UpdateMissionInput, MissionLog, MissionMemory, MissionOutput, MissionArtifact, MissionCheckpoint, MissionRepairAttempt } from "@/types/mission";
import { createId } from "@/utils/id";
import { now } from "@/utils/time";

export class MissionRepository {
  private cache = new Map<string, Mission>();

  async create(input: CreateMissionInput): Promise<Mission> {
    const id = createId("mission");
    const timestamp = now();
    const mission: Mission = {
      id,
      title: input.title,
      description: input.description,
      goal: input.goal,
      workspace: input.workspace,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      estimatedDuration: input.estimatedDuration ?? 30,
      progress: 0,
      logs: [{
        id: createId("log"),
        timestamp,
        stage: "queued",
        action: "Mission queued",
        status: "info",
        metadata: { goal: input.goal },
      }],
      timeline: [],
      memory: [],
      outputs: [],
      artifacts: [],
      repairHistory: [],
    };
    if (input.plan) {
      mission.originalPlan = input.plan;
      mission.finalPlan = input.plan;
    }
    if (input.nextObjectives?.length) {
      mission.chain = {
        stages: input.nextObjectives.map((obj, i) => ({
          id: `stage-${i + 1}`,
          objective: obj,
          status: "planned" as const,
          dependencies: i > 0 ? [`stage-${i}`] : [],
          estimatedTasks: 1,
          estimatedDuration: 10,
        })),
        currentStage: 0,
      };
    }
    this.cache.set(mission.id, mission);
    return mission;
  }

  async get(id: string): Promise<Mission> {
    const mission = this.cache.get(id);
    if (!mission) throw new Error("Mission not found");
    return mission;
  }

  async update(id: string, input: UpdateMissionInput): Promise<Mission> {
    const mission = await this.get(id);
    if (input.title !== undefined) mission.title = input.title;
    if (input.description !== undefined) mission.description = input.description;
    if (input.goal !== undefined) mission.goal = input.goal;
    if (input.status !== undefined) mission.status = input.status;
    if (input.estimatedDuration !== undefined) mission.estimatedDuration = input.estimatedDuration;
    if (input.progress !== undefined) mission.progress = input.progress;
    if (input.chain !== undefined) mission.chain = input.chain;
    if (input.finalPlan !== undefined) mission.finalPlan = input.finalPlan;
    if (input.repairHistory !== undefined) mission.repairHistory = input.repairHistory;
    mission.updatedAt = now();
    this.cache.set(mission.id, mission);
    return mission;
  }

  async delete(id: string): Promise<void> {
    this.cache.delete(id);
  }

  async list(): Promise<Mission[]> {
    const missions = Array.from(this.cache.values());
    missions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return missions;
  }

  async addLog(id: string, log: Omit<MissionLog, "id" | "timestamp">): Promise<MissionLog> {
    const mission = await this.get(id);
    const entry: MissionLog = { id: createId("log"), timestamp: now(), ...log };
    mission.logs.push(entry);
    mission.updatedAt = now();
    this.cache.set(mission.id, mission);
    return entry;
  }

  async addArtifact(id: string, artifact: Omit<MissionArtifact, "id" | "createdAt">): Promise<MissionArtifact> {
    const mission = await this.get(id);
    const entry: MissionArtifact = { id: createId("artifact"), createdAt: now(), ...artifact };
    mission.artifacts.push(entry);
    mission.updatedAt = now();
    this.cache.set(mission.id, mission);
    return entry;
  }

  async addOutput(id: string, output: Omit<MissionOutput, "id" | "createdAt">): Promise<MissionOutput> {
    const mission = await this.get(id);
    const entry: MissionOutput = { id: createId("output"), createdAt: now(), ...output };
    mission.outputs.push(entry);
    mission.updatedAt = now();
    this.cache.set(mission.id, mission);
    return entry;
  }

  async addMemory(id: string, key: string, value: string, source: "planning" | "executing" | "researching" | "reviewing"): Promise<void> {
    const mission = await this.get(id);
    mission.memory.push({ id: createId("mem"), createdAt: now(), key, value, source });
    mission.updatedAt = now();
    this.cache.set(mission.id, mission);
  }

  async addCheckpoint(id: string, checkpoint: Omit<MissionCheckpoint, "id" | "missionId" | "timestamp">): Promise<void> {
    const mission = await this.get(id);
    const entry: MissionCheckpoint = { id: createId("cp"), missionId: id, timestamp: now(), ...checkpoint };
    if (!mission.checkpoints) mission.checkpoints = [];
    mission.checkpoints.push(entry);
    mission.updatedAt = now();
    this.cache.set(mission.id, mission);
  }

  private async persist(_mission: Mission): Promise<void> {
    this.cache.set(_mission.id, _mission);
  }
}
