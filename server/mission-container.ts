import type { MissionRepository } from "@/server/storage/mission-repository";
import type { MissionRunner } from "@/server/pipeline/mission-runner";
import type { SessionRepository } from "@/server/session/session-repository";
import type { WorkingSessionManager } from "@/server/session/working-session-manager";

let _repository: MissionRepository | null = null;
let _runner: MissionRunner | null = null;
let _sessionRepo: SessionRepository | null = null;
let _sessionManager: WorkingSessionManager | null = null;

async function ensure(): Promise<{ repository: MissionRepository; runner: MissionRunner }> {
  if (!_repository) {
    const { MissionRepository } = await import("@/server/storage/mission-repository");
    const { MissionRunner } = await import("@/server/pipeline/mission-runner");
    _repository = new MissionRepository();
    _runner = new MissionRunner(_repository);
  }
  return { repository: _repository!, runner: _runner! };
}

async function ensureSession(): Promise<{ sessionRepo: SessionRepository; sessionManager: WorkingSessionManager }> {
  if (!_sessionRepo) {
    const { SessionRepository } = await import("@/server/session/session-repository");
    const { WorkingSessionManager } = await import("@/server/session/working-session-manager");
    const { repository, runner } = await ensure();
    _sessionRepo = new SessionRepository();
    _sessionManager = new WorkingSessionManager(_sessionRepo, repository, runner);
  }
  return { sessionRepo: _sessionRepo!, sessionManager: _sessionManager! };
}

export async function getMissionService(): Promise<MissionRepository> {
  return (await ensure()).repository;
}

export async function getMissionRunner(): Promise<MissionRunner> {
  return (await ensure()).runner;
}

export const missionService = {
  async create(input: Parameters<MissionRepository["create"]>[0]) { return (await ensure()).repository.create(input); },
  async get(id: string) { return (await ensure()).repository.get(id); },
  async update(id: string, input: Parameters<MissionRepository["update"]>[1]) { return (await ensure()).repository.update(id, input); },
  async delete(id: string) { return (await ensure()).repository.delete(id); },
  async list() { return (await ensure()).repository.list(); },
  async addLog(id: string, log: Parameters<MissionRepository["addLog"]>[1]) { return (await ensure()).repository.addLog(id, log); },
  async addArtifact(id: string, artifact: Parameters<MissionRepository["addArtifact"]>[1]) { return (await ensure()).repository.addArtifact(id, artifact); },
  async addOutput(id: string, output: Parameters<MissionRepository["addOutput"]>[1]) { return (await ensure()).repository.addOutput(id, output); },
  async addMemory(id: string, key: string, value: string, source: "planning" | "researching" | "executing" | "reviewing") { return (await ensure()).repository.addMemory(id, key, value, source); },
};

export const missionRunner = {
  async run(missionId: string) { return (await ensure()).runner.run(missionId); },
};

export const sessionService = {
  async create(input: Parameters<SessionRepository["create"]>[0]) { return (await ensureSession()).sessionRepo.create(input); },
  async get(id: string) { return (await ensureSession()).sessionRepo.get(id); },
  async update(id: string, input: Parameters<SessionRepository["update"]>[1]) { return (await ensureSession()).sessionRepo.update(id, input); },
  async delete(id: string) { return (await ensureSession()).sessionRepo.delete(id); },
  async list() { return (await ensureSession()).sessionRepo.list(); },
  async addMission(sessionId: string, missionRef: Parameters<SessionRepository["addMission"]>[1]) { return (await ensureSession()).sessionRepo.addMission(sessionId, missionRef); },
};

export const sessionManager = {
  async create(input: Parameters<WorkingSessionManager["create"]>[0]) { return (await ensureSession()).sessionManager.create(input); },
  async get(id: string) { return (await ensureSession()).sessionManager.get(id); },
  async list() { return (await ensureSession()).sessionManager.list(); },
  async startSession(sessionId: string) { return (await ensureSession()).sessionManager.startSession(sessionId); },
  async queueMission(sessionId: string, goal: string, title?: string) { return (await ensureSession()).sessionManager.queueMission(sessionId, goal, title); },
  async attachMission(sessionId: string, missionId: string) { return (await ensureSession()).sessionManager.attachMission(sessionId, missionId); },
  async pauseSession(sessionId: string) { return (await ensureSession()).sessionManager.pauseSession(sessionId); },
  async resumeSession(sessionId: string) { return (await ensureSession()).sessionManager.resumeSession(sessionId); },
  async abortSession(sessionId: string) { return (await ensureSession()).sessionManager.abortSession(sessionId); },
  async getActivities(sessionId: string) { return (await ensureSession()).sessionManager.getActivities(sessionId); },
  async getMorningReport(sessionId: string) { return (await ensureSession()).sessionManager.getMorningReport(sessionId); },
};

export async function getAgentOrchestrator() {
  return {
    async suggestPlan(goal: string) {
      const { createFallbackPlan } = await import("@/server/ai/agents/planner");
      const plan = createFallbackPlan(goal);
      const tasks = JSON.parse(plan.content).tasks.map((t: { title: string; description: string }, i: number) => ({
        id: `task-${i}`,
        title: t.title,
        instructions: t.description,
        targetAgent: "coding" as const,
        expectedOutput: t.description,
        dependsOn: [] as string[],
        requiredTools: [],
      }));
      return { summary: plan.summary, objectives: [goal], tasks };
    },
  };
}

export async function getRuntimeDiagnostics() {
  const { repository: repo, runner: rnr } = await ensure();
  return {
    status: "running",
    version: process.env.npm_package_version ?? "2.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    missionCount: (await repo.list()).length,
  };
}

export async function resetDevelopmentRuntime(): Promise<{ reset: boolean }> {
  return { reset: true };
}
