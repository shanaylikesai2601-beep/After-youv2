export const MISSION_STATUSES = [
  "queued",
  "planning",
  "researching",
  "executing",
  "reviewing",
  "completed",
  "failed",
] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

export type MissionStage = Exclude<MissionStatus, "queued" | "completed" | "failed">;
export type LogStatus = "started" | "succeeded" | "failed" | "info";
export type OutputType = "document" | "markdown" | "code" | "slides" | "image" | "summary" | "research" | "link" | "file";

export interface MissionLog {
  id: string;
  timestamp: string;
  stage: MissionStatus;
  action: string;
  status: LogStatus;
  metadata: Record<string, unknown>;
}

export interface MissionTimelineEvent {
  id: string;
  timestamp: string;
  stage: MissionStatus;
  label: string;
  detail?: string;
}

export interface MissionMemory {
  id: string;
  createdAt: string;
  key: string;
  value: string;
  source: MissionStage;
}

export interface MissionOutput {
  id: string;
  type: OutputType;
  title: string;
  content: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface MissionArtifact {
  id: string;
  name: string;
  kind: "file" | "link" | "generated";
  url?: string;
  mimeType?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}
export type MissionFailureCategory = "coding" | "build" | "typecheck" | "runtime-validation" | "feature-completeness" | "reviewer" | "filesystem" | "planner" | "provider" | "verification" | "unknown";
export interface MissionRepairAttempt {
  attempt: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: "running" | "succeeded" | "failed";
  failureType: MissionFailureCategory;
  affectedFiles: string[];
  probableCause: string;
  confidence: number;
  suggestedRepair: string;
  verification?: "passed" | "failed";
  filesModified?: string[];
  error?: string;
}
export interface MissionCheckpoint {
  id: string;
  missionId: string;
  parentCheckpointId?: string;
  timestamp: string;
  stage: string;
  title: string;
  summary: string;
  filesChanged: string[];
  fileCount: number;
  plannerSummary?: string;
  reviewerSummary?: string;
  buildStatus: string;
  verificationStatus: string;
  repairHistory: MissionRepairAttempt[];
  workspaceSnapshotReference: string;
  projectMemorySnapshotReference: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  goal: string;
  workspace?: WorkspaceContext;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
  estimatedDuration: number;
  progress: number;
  logs: MissionLog[];
  timeline: MissionTimelineEvent[];
  memory: MissionMemory[];
  outputs: MissionOutput[];
  artifacts: MissionArtifact[];
  chain?: MissionChain;
  /** Traceability for adaptive planning: AI suggestion, user edits, and executed snapshot. */
  originalPlan?: MissionPlanStage[];
  editedPlan?: MissionPlanStage[];
  finalPlan?: MissionPlanStage[];
  repairHistory: MissionRepairAttempt[];
  checkpoints?: MissionCheckpoint[];
  currentBranch?: string;
}
export interface MissionChainStage { id: string; objective: string; status: "planned" | "queued" | "running" | "completed" | "failed"; dependencies: string[]; estimatedTasks: number; estimatedDuration: number; startedAt?: string; completedAt?: string; summary?: string; }
export interface MissionChain { stages: MissionChainStage[]; currentStage: number; }
export interface MissionPlanStage { id: string; title: string; objective: string; explanation: string; complexity: "low" | "medium" | "high"; estimatedDuration: number; dependencies: string[]; suggestedTools?: string[]; completionCriteria?: string[]; }
export interface WorkspaceContext { workspaceName: string; workspacePath: string; indexedAt: string; fileCount?: number; directoryTree?: string[]; extensions?: string[]; }

export interface CreateMissionInput {
  title: string;
  description: string;
  goal: string;
  estimatedDuration?: number;
  workspace?: WorkspaceContext;
  nextObjectives?: string[];
  plan?: MissionPlanStage[];
  previewOnly?: boolean;
}

export interface UpdateMissionInput {
  title?: string;
  description?: string;
  goal?: string;
  status?: MissionStatus;
  estimatedDuration?: number;
  progress?: number;
  chain?: MissionChain;
  finalPlan?: MissionPlanStage[];
  repairHistory?: MissionRepairAttempt[];
}
