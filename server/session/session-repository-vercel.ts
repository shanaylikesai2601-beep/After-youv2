import type { WorkingSession, CreateSessionInput, UpdateSessionInput, SessionMissionRef, SessionMemoryEntry, SessionDiagnostics, SessionCheckpoint } from "@/types/session";
import { createId } from "@/utils/id";
import { now } from "@/utils/time";

function emptyDiagnostics(): SessionDiagnostics {
  return {
    totalMissions: 0,
    completedMissions: 0,
    failedMissions: 0,
    totalArtifacts: 0,
    totalCheckpoints: 0,
    totalRepairs: 0,
    successfulRepairs: 0,
    totalRuntimeMs: 0,
    providerCalls: 0,
    totalTokensUsed: 0,
  };
}

export class SessionRepository {
  private cache = new Map<string, WorkingSession>();

  async create(input: CreateSessionInput): Promise<WorkingSession> {
    const id = createId("session");
    const timestamp = now();
    const session: WorkingSession = {
      id,
      name: input.name,
      status: "idle",
      createdAt: timestamp,
      updatedAt: timestamp,
      missions: [],
      currentMissionIndex: -1,
      workspace: input.workspace,
      projectMemory: [],
      runtimeMs: 0,
      budgetMs: input.budgetMs ?? 3_600_000,
      diagnostics: emptyDiagnostics(),
      checkpoints: [],
    };
    this.cache.set(session.id, session);
    return session;
  }

  async get(id: string): Promise<WorkingSession> {
    const session = this.cache.get(id);
    if (!session) throw new Error("Session not found");
    return session;
  }

  async update(id: string, input: UpdateSessionInput): Promise<WorkingSession> {
    const session = await this.get(id);
    if (input.name !== undefined) session.name = input.name;
    if (input.status !== undefined) session.status = input.status;
    if (input.startedAt !== undefined) session.startedAt = input.startedAt;
    if (input.completedAt !== undefined) session.completedAt = input.completedAt;
    if (input.missions !== undefined) session.missions = input.missions;
    if (input.currentMissionIndex !== undefined) session.currentMissionIndex = input.currentMissionIndex;
    if (input.projectMemory !== undefined) session.projectMemory = input.projectMemory;
    if (input.runtimeMs !== undefined) session.runtimeMs = input.runtimeMs;
    if (input.diagnostics !== undefined) session.diagnostics = input.diagnostics;
    if (input.checkpoints !== undefined) session.checkpoints = input.checkpoints;
    session.updatedAt = now();
    this.cache.set(session.id, session);
    return session;
  }

  async delete(id: string): Promise<void> {
    this.cache.delete(id);
  }

  async list(): Promise<WorkingSession[]> {
    const sessions = Array.from(this.cache.values());
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sessions;
  }

  async addMission(sessionId: string, missionRef: SessionMissionRef): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    session.missions.push(missionRef);
    session.updatedAt = now();
    this.cache.set(session.id, session);
    return session;
  }

  async updateMission(sessionId: string, missionId: string, updates: Partial<SessionMissionRef>): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    const idx = session.missions.findIndex((m) => m.missionId === missionId);
    if (idx >= 0) {
      Object.assign(session.missions[idx], updates);
      session.updatedAt = now();
      this.cache.set(session.id, session);
    }
    return session;
  }

  async addMemory(sessionId: string, key: string, value: string, source: string): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    session.projectMemory.push({ key, value, source, timestamp: now() });
    session.updatedAt = now();
    this.cache.set(session.id, session);
    return session;
  }

  async addCheckpoint(sessionId: string, label: string, missionId?: string, state?: Record<string, unknown>): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    const checkpoint: SessionCheckpoint = {
      id: createId("scp"),
      timestamp: now(),
      label,
      missionId,
      state: state ?? {},
    };
    session.checkpoints.push(checkpoint);
    session.diagnostics.totalCheckpoints++;
    session.updatedAt = now();
    this.cache.set(session.id, session);
    return session;
  }

  async updateDiagnostics(sessionId: string, updates: Partial<SessionDiagnostics>): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    Object.assign(session.diagnostics, updates);
    session.updatedAt = now();
    this.cache.set(session.id, session);
    return session;
  }

  async getMemory(sessionId: string): Promise<SessionMemoryEntry[]> {
    const session = await this.get(sessionId);
    return session.projectMemory;
  }
}
