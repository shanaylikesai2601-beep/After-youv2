import type { MissionStatus, WorkspaceContext } from "./mission";

export type WorkingSessionStatus = "idle" | "running" | "paused" | "completed" | "failed";

export interface SessionMissionRef {
  missionId: string;
  title: string;
  goal: string;
  status: MissionStatus;
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  artifactsCount: number;
  checkpointsCount: number;
  repairAttempts: number;
  qualityScore?: number;
}

export interface SessionMemoryEntry {
  key: string;
  value: string;
  source: string;
  timestamp: string;
}

export interface SessionDiagnostics {
  totalMissions: number;
  completedMissions: number;
  failedMissions: number;
  totalArtifacts: number;
  totalCheckpoints: number;
  totalRepairs: number;
  successfulRepairs: number;
  totalRuntimeMs: number;
  providerCalls: number;
  totalTokensUsed: number;
}

export interface SessionCheckpoint {
  id: string;
  timestamp: string;
  label: string;
  missionId?: string;
  state: Record<string, unknown>;
}

export interface WorkingSession {
  id: string;
  name: string;
  status: WorkingSessionStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  missions: SessionMissionRef[];
  currentMissionIndex: number;
  workspace?: WorkspaceContext;
  projectMemory: SessionMemoryEntry[];
  runtimeMs: number;
  budgetMs: number;
  diagnostics: SessionDiagnostics;
  checkpoints: SessionCheckpoint[];
}

export interface CreateSessionInput {
  name: string;
  goal?: string;
  workspace?: WorkspaceContext;
  budgetMs?: number;
}

export interface UpdateSessionInput {
  name?: string;
  status?: WorkingSessionStatus;
  startedAt?: string;
  completedAt?: string;
  missions?: SessionMissionRef[];
  currentMissionIndex?: number;
  projectMemory?: SessionMemoryEntry[];
  runtimeMs?: number;
  diagnostics?: SessionDiagnostics;
  checkpoints?: SessionCheckpoint[];
}

export interface MorningReport {
  title: string;
  generatedAt: string;
  sessionId: string;
  sessionName: string;
  sessionDuration: string;
  missionsCompleted: number;
  missionsFailed: number;
  missionsTotal: number;
  completionOrder: string[];
  filesCreated: number;
  filesModified: number;
  verificationRuns: number;
  reviewerPasses: number;
  repairAttempts: number;
  successfulRepairs: number;
  checkpointsCreated: number;
  memoryUpdates: number;
  timelineEntries: number;
  overallStatus: string;
  recommendedNext: string;
  missionSummaries: Array<{
    title: string;
    status: string;
    duration: string;
    artifacts: number;
    qualityScore?: number;
  }>;
  diagnostics: SessionDiagnostics;
}

export interface SessionActivity {
  system: string;
  status: "active" | "idle" | "completed";
  label: string;
  detail?: string;
}
