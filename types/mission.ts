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

export interface Mission {
  id: string;
  title: string;
  description: string;
  goal: string;
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
}

export interface CreateMissionInput {
  title: string;
  description: string;
  goal: string;
  estimatedDuration?: number;
}

export interface UpdateMissionInput {
  title?: string;
  description?: string;
  goal?: string;
  status?: MissionStatus;
  estimatedDuration?: number;
  progress?: number;
}
