import type {
  CreateMissionInput,
  LogStatus,
  Mission,
  MissionArtifact,
  MissionLog,
  MissionMemory,
  MissionOutput,
  MissionStatus,
  MissionTimelineEvent,
  UpdateMissionInput,
} from "@/types/mission";
import type { MissionRepository } from "@/server/mission-repository";
import { createId } from "@/utils/id";
import { now } from "@/utils/time";

export class MissionService {
  constructor(private readonly repository: MissionRepository) {}

  async create(input: CreateMissionInput): Promise<Mission> {
    const timestamp = now();
    const mission: Mission = {
      id: createId("mission"),
      title: input.title,
      description: input.description,
      goal: input.goal,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      estimatedDuration: input.estimatedDuration ?? 30,
      progress: 0,
      logs: [],
      timeline: [],
      memory: [],
      outputs: [],
      artifacts: [],
    };

    const created = await this.repository.create(mission);
    return this.recordActivity(created.id, {
      stage: "queued",
      action: "Mission queued",
      status: "info",
      metadata: { goal: created.goal },
    });
  }

  list(): Promise<Mission[]> {
    return this.repository.findAll();
  }

  async get(id: string): Promise<Mission> {
    const mission = await this.repository.findById(id);
    if (!mission) throw new Error("Mission not found");
    return mission;
  }

  async update(id: string, input: UpdateMissionInput): Promise<Mission> {
    const mission = await this.get(id);
    const updated: Mission = { ...mission, ...input, updatedAt: now() };
    return this.repository.update(updated);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new Error("Mission not found");
  }

  async transition(id: string, status: MissionStatus, progress: number, detail?: string): Promise<Mission> {
    const mission = await this.get(id);
    const timestamp = now();
    const timelineEvent: MissionTimelineEvent = {
      id: createId("timeline"),
      timestamp,
      stage: status,
      label: this.statusLabel(status),
      detail,
    };
    return this.repository.update({
      ...mission,
      status,
      progress,
      updatedAt: timestamp,
      timeline: [...mission.timeline, timelineEvent],
    });
  }

  async recordActivity(
    id: string,
    entry: Omit<MissionLog, "id" | "timestamp">,
  ): Promise<Mission> {
    const mission = await this.get(id);
    const log: MissionLog = { id: createId("log"), timestamp: now(), ...entry };
    return this.repository.update({ ...mission, updatedAt: log.timestamp, logs: [...mission.logs, log] });
  }

  async remember(id: string, entry: Omit<MissionMemory, "id" | "createdAt">): Promise<Mission> {
    const mission = await this.get(id);
    const memory: MissionMemory = { id: createId("memory"), createdAt: now(), ...entry };
    return this.repository.update({ ...mission, updatedAt: memory.createdAt, memory: [...mission.memory, memory] });
  }

  async addOutput(id: string, output: Omit<MissionOutput, "id" | "createdAt">): Promise<Mission> {
    const mission = await this.get(id);
    const createdAt = now();
    const nextOutput: MissionOutput = { id: createId("output"), createdAt, ...output };
    return this.repository.update({ ...mission, updatedAt: createdAt, outputs: [...mission.outputs, nextOutput] });
  }

  async addArtifact(id: string, artifact: Omit<MissionArtifact, "id" | "createdAt">): Promise<Mission> {
    const mission = await this.get(id);
    const createdAt = now();
    const nextArtifact: MissionArtifact = { id: createId("artifact"), createdAt, ...artifact };
    return this.repository.update({ ...mission, updatedAt: createdAt, artifacts: [...mission.artifacts, nextArtifact] });
  }

  async fail(id: string, error: unknown): Promise<Mission> {
    const message = error instanceof Error ? error.message : "Unknown execution error";
    await this.recordActivity(id, { stage: "failed", action: "Mission failed", status: "failed", metadata: { message } });
    return this.transition(id, "failed", 100, message);
  }

  private statusLabel(status: MissionStatus): string {
    const labels: Record<MissionStatus, string> = {
      queued: "Mission queued",
      planning: "Planning work",
      researching: "Researching context",
      executing: "Executing tasks",
      reviewing: "Reviewing output",
      completed: "Mission completed",
      failed: "Mission failed",
    };
    return labels[status];
  }
}
