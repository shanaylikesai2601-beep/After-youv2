import fs from "node:fs/promises";
import path from "node:path";
import type { WorkingSession, CreateSessionInput, UpdateSessionInput, SessionMissionRef, SessionMemoryEntry, SessionDiagnostics, SessionCheckpoint } from "@/types/session";
import { createId } from "@/utils/id";
import { now } from "@/utils/time";

const DATA_DIR = path.join(process.cwd(), ".afteryou", "sessions");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function sessionPath(id: string): string {
  return path.join(DATA_DIR, id, "session.json");
}

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
    await ensureDir();
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
    await this.persist(session);
    return session;
  }

  async get(id: string): Promise<WorkingSession> {
    if (this.cache.has(id)) return this.cache.get(id)!;
    try {
      const content = await fs.readFile(sessionPath(id), "utf-8");
      const session = JSON.parse(content) as WorkingSession;
      this.cache.set(id, session);
      return session;
    } catch {
      throw new Error("Session not found");
    }
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
    await this.persist(session);
    return session;
  }

  async delete(id: string): Promise<void> {
    this.cache.delete(id);
    await fs.rm(path.join(DATA_DIR, id), { recursive: true, force: true }).catch(() => {});
  }

  async list(): Promise<WorkingSession[]> {
    await ensureDir();
    const ids: string[] = [];
    try {
      const entries = await fs.readdir(DATA_DIR);
      for (const entry of entries) {
        if (entry.startsWith("session_")) ids.push(entry);
      }
    } catch { /* empty */ }
    const sessions: WorkingSession[] = [];
    for (const id of ids) {
      try { sessions.push(await this.get(id)); } catch { /* skip */ }
    }
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sessions;
  }

  async addMission(sessionId: string, missionRef: SessionMissionRef): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    session.missions.push(missionRef);
    session.updatedAt = now();
    await this.persist(session);
    return session;
  }

  async updateMission(sessionId: string, missionId: string, updates: Partial<SessionMissionRef>): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    const idx = session.missions.findIndex((m) => m.missionId === missionId);
    if (idx >= 0) {
      Object.assign(session.missions[idx], updates);
      session.updatedAt = now();
      await this.persist(session);
    }
    return session;
  }

  async addMemory(sessionId: string, key: string, value: string, source: string): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    session.projectMemory.push({ key, value, source, timestamp: now() });
    session.updatedAt = now();
    await this.persist(session);
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
    await this.persist(session);
    return session;
  }

  async updateDiagnostics(sessionId: string, updates: Partial<SessionDiagnostics>): Promise<WorkingSession> {
    const session = await this.get(sessionId);
    Object.assign(session.diagnostics, updates);
    session.updatedAt = now();
    await this.persist(session);
    return session;
  }

  async getMemory(sessionId: string): Promise<SessionMemoryEntry[]> {
    const session = await this.get(sessionId);
    return session.projectMemory;
  }

  private async persist(session: WorkingSession): Promise<void> {
    await ensureDir();
    const dir = path.join(DATA_DIR, session.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(sessionPath(session.id), JSON.stringify(session, null, 2));
    this.cache.set(session.id, session);
  }
}
