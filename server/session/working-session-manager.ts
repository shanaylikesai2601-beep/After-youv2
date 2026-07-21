import type { SessionRepository } from "./session-repository";
import type { MissionRepository } from "@/server/storage/mission-repository";
import type { MissionRunner } from "@/server/pipeline/mission-runner";
import type { WorkingSession, CreateSessionInput, SessionMissionRef, MorningReport, SessionActivity, UpdateSessionInput } from "@/types/session";
import type { WorkspaceContext } from "@/types/mission";

export class WorkingSessionManager {
  private activeSessions = new Set<string>();
  private pauseRequests = new Set<string>();
  private abortRequests = new Set<string>();
  private sessionActivities = new Map<string, Map<string, SessionActivity>>();

  constructor(
    private sessionRepo: SessionRepository,
    private missionRepo: MissionRepository,
    private missionRunner: MissionRunner,
  ) {}

  async create(input: CreateSessionInput): Promise<WorkingSession> {
    return this.sessionRepo.create(input);
  }

  async get(id: string): Promise<WorkingSession> {
    return this.sessionRepo.get(id);
  }

  async list(): Promise<WorkingSession[]> {
    return this.sessionRepo.list();
  }

  async delete(id: string): Promise<void> {
    this.activeSessions.delete(id);
    this.pauseRequests.delete(id);
    this.abortRequests.delete(id);
    this.sessionActivities.delete(id);
    await this.sessionRepo.delete(id);
  }

  async startSession(sessionId: string): Promise<WorkingSession> {
    const session = await this.sessionRepo.get(sessionId);
    if (session.missions.length === 0) throw new Error("No missions queued");
    const updated = await this.sessionRepo.update(sessionId, { status: "running", startedAt: new Date().toISOString(), currentMissionIndex: 0 });
    this.activeSessions.add(sessionId);
    this.pauseRequests.delete(sessionId);
    this.abortRequests.delete(sessionId);
    this.sessionActivities.set(sessionId, new Map());
    void this.executeSession(sessionId);
    return updated;
  }

  async attachMission(sessionId: string, missionId: string): Promise<WorkingSession> {
    const session = await this.sessionRepo.get(sessionId);
    const mission = await this.missionRepo.get(missionId);
    const missionRef: SessionMissionRef = {
      missionId: mission.id,
      title: mission.title,
      goal: mission.goal,
      status: "queued",
      artifactsCount: mission.artifacts.length,
      checkpointsCount: mission.checkpoints?.length ?? 0,
      repairAttempts: mission.repairHistory.length,
    };
    await this.sessionRepo.addCheckpoint(sessionId, `Mission attached: ${mission.title}`, mission.id);
    return this.sessionRepo.addMission(sessionId, missionRef);
  }

  async queueMission(sessionId: string, goal: string, title?: string): Promise<WorkingSession> {
    const session = await this.sessionRepo.get(sessionId);
    const wsPath = session.workspace?.workspacePath;
    const mission = await this.missionRepo.create({
      title: title ?? goal.slice(0, 120),
      description: goal,
      goal,
      workspace: wsPath ? { workspaceName: session.workspace?.workspaceName ?? "workspace", workspacePath: wsPath, indexedAt: new Date().toISOString() } : undefined,
      previewOnly: true,
    });
    const missionRef: SessionMissionRef = {
      missionId: mission.id,
      title: mission.title,
      goal,
      status: "queued",
      artifactsCount: 0,
      checkpointsCount: 0,
      repairAttempts: 0,
    };
    const updated = await this.sessionRepo.addMission(sessionId, missionRef);
    await this.sessionRepo.addCheckpoint(sessionId, `Mission queued: ${mission.title}`, mission.id);
    return updated;
  }

  async pauseSession(sessionId: string): Promise<WorkingSession> {
    this.pauseRequests.add(sessionId);
    return this.sessionRepo.update(sessionId, {
      status: "paused",
      runtimeMs: (await this.sessionRepo.get(sessionId)).runtimeMs,
    });
  }

  async resumeSession(sessionId: string): Promise<WorkingSession> {
    const session = await this.sessionRepo.get(sessionId);
    if (session.status !== "paused") throw new Error("Session is not paused");
    this.pauseRequests.delete(sessionId);
    this.abortRequests.delete(sessionId);
    this.activeSessions.add(sessionId);
    await this.sessionRepo.update(sessionId, { status: "running" });
    void this.executeSession(sessionId);
    return this.sessionRepo.get(sessionId);
  }

  async abortSession(sessionId: string): Promise<WorkingSession> {
    this.abortRequests.add(sessionId);
    this.activeSessions.delete(sessionId);
    return this.sessionRepo.update(sessionId, { status: "failed", runtimeMs: (await this.sessionRepo.get(sessionId)).runtimeMs });
  }

  async getActivities(sessionId: string): Promise<SessionActivity[]> {
    const activities = this.sessionActivities.get(sessionId);
    if (!activities) return [];
    return Array.from(activities.values());
  }

  async getMorningReport(sessionId: string): Promise<MorningReport> {
    const session = await this.sessionRepo.get(sessionId);
    const d = session.diagnostics;
    const completed = session.missions.filter((m) => m.status === "completed");
    const failed = session.missions.filter((m) => m.status === "failed");
    const msToHuman = (ms: number) => {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      return `${m}m ${s % 60}s`;
    };

    return {
      title: "Working Session Complete",
      generatedAt: new Date().toISOString(),
      sessionId: session.id,
      sessionName: session.name,
      sessionDuration: msToHuman(session.runtimeMs),
      missionsCompleted: d.completedMissions,
      missionsFailed: d.failedMissions,
      missionsTotal: d.totalMissions,
      completionOrder: session.missions.filter((m) => m.completedAt).sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()).map((m) => m.title),
      filesCreated: d.totalArtifacts,
      filesModified: 0,
      verificationRuns: d.totalCheckpoints,
      reviewerPasses: completed.length,
      repairAttempts: d.totalRepairs,
      successfulRepairs: d.successfulRepairs,
      checkpointsCreated: d.totalCheckpoints,
      memoryUpdates: session.projectMemory.length,
      timelineEntries: session.checkpoints.length,
      overallStatus: session.status,
      recommendedNext: failed.length > 0 ? `Review ${failed.length} failed mission(s) and retry` : completed.length > 0 ? "Review morning report and start next session" : "No missions completed",
      missionSummaries: session.missions.map((m) => ({
        title: m.title,
        status: m.status,
        duration: m.startedAt && m.completedAt ? msToHuman(new Date(m.completedAt).getTime() - new Date(m.startedAt).getTime()) : "—",
        artifacts: m.artifactsCount,
        qualityScore: m.qualityScore,
      })),
      diagnostics: d,
    };
  }

  private async executeSession(sessionId: string): Promise<void> {
    const startTime = Date.now();
    const activityMap = this.sessionActivities.get(sessionId) ?? new Map();

    try {
      let session = await this.sessionRepo.get(sessionId);

      while (session.currentMissionIndex < session.missions.length) {
        if (this.abortRequests.has(sessionId)) return;
        if (this.pauseRequests.has(sessionId)) {
          this.activeSessions.delete(sessionId);
          return;
        }

        const missionRef = session.missions[session.currentMissionIndex];
        if (!missionRef) break;

        this.setActivity(activityMap, "execution", "active", `Executing: ${missionRef.title}`);

        await this.sessionRepo.updateMission(sessionId, missionRef.missionId, { status: "executing", startedAt: new Date().toISOString() });
        await this.sessionRepo.addCheckpoint(sessionId, `Starting mission: ${missionRef.title}`, missionRef.missionId);

        try {
          await this.missionRunner.run(missionRef.missionId);
          const completedMission = await this.missionRepo.get(missionRef.missionId);
          const artifactsCount = completedMission.artifacts.length;
          const checkpointsCount = completedMission.checkpoints?.length ?? 0;
          const repairCount = completedMission.repairHistory.length;
          const qualityScore = this.extractQualityScore(completedMission);

          await this.sessionRepo.updateMission(sessionId, missionRef.missionId, {
            status: "completed",
            completedAt: new Date().toISOString(),
            summary: completedMission.outputs.at(-1)?.content,
            artifactsCount,
            checkpointsCount,
            repairAttempts: repairCount,
            qualityScore,
          });

          await this.sessionRepo.addCheckpoint(sessionId, `Mission completed: ${missionRef.title}`, missionRef.missionId);

          // Share project memory from mission to session
          for (const mem of completedMission.memory) {
            await this.sessionRepo.addMemory(sessionId, mem.key, mem.value, "mission");
          }

          await this.sessionRepo.updateDiagnostics(sessionId, {
            completedMissions: (await this.sessionRepo.get(sessionId)).diagnostics.completedMissions + 1,
            totalArtifacts: (await this.sessionRepo.get(sessionId)).diagnostics.totalArtifacts + artifactsCount,
            totalRepairs: (await this.sessionRepo.get(sessionId)).diagnostics.totalRepairs + repairCount,
            successfulRepairs: (await this.sessionRepo.get(sessionId)).diagnostics.successfulRepairs + (repairCount > 0 ? 1 : 0),
            totalRuntimeMs: Date.now() - startTime,
          });

          this.setActivity(activityMap, "execution", "completed", `Completed: ${missionRef.title}`);
        } catch {
          await this.sessionRepo.updateMission(sessionId, missionRef.missionId, { status: "failed", completedAt: new Date().toISOString() });
          await this.sessionRepo.addCheckpoint(sessionId, `Mission failed: ${missionRef.title}`, missionRef.missionId);
          await this.sessionRepo.updateDiagnostics(sessionId, {
            failedMissions: (await this.sessionRepo.get(sessionId)).diagnostics.failedMissions + 1,
          });
          this.setActivity(activityMap, "execution", "completed", `Failed: ${missionRef.title}`);
        }

        await this.sessionRepo.updateDiagnostics(sessionId, {
          totalMissions: (await this.sessionRepo.get(sessionId)).diagnostics.totalMissions + 1,
          totalRuntimeMs: Date.now() - startTime,
        });

        session = await this.sessionRepo.get(sessionId);
        await this.sessionRepo.update(sessionId, { currentMissionIndex: session.currentMissionIndex + 1, runtimeMs: Date.now() - startTime });
      }

      await this.sessionRepo.update(sessionId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        runtimeMs: Date.now() - startTime,
      });
      await this.sessionRepo.addCheckpoint(sessionId, "Working session completed");

      this.setActivity(activityMap, "report", "active", "Generating morning report");
      await this.sessionRepo.addCheckpoint(sessionId, "Morning report ready");
      this.setActivity(activityMap, "report", "completed", "Morning report generated");
    } catch (err) {
      await this.sessionRepo.update(sessionId, { status: "failed", runtimeMs: Date.now() - startTime });
      await this.sessionRepo.addCheckpoint(sessionId, `Session failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  private setActivity(map: Map<string, SessionActivity>, system: string, status: "active" | "idle" | "completed", label: string): void {
    map.set(system, { system, status, label });
  }

  private extractQualityScore(mission: Awaited<ReturnType<MissionRepository["get"]>>): number | undefined {
    const reviewerOutput = mission.outputs.find((o) => o.title === "Review");
    if (!reviewerOutput) return undefined;
    try {
      const parsed = JSON.parse(reviewerOutput.content);
      return typeof parsed.qualityScore === "number" ? parsed.qualityScore : undefined;
    } catch {
      return undefined;
    }
  }
}
