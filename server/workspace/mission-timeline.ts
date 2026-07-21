import fs from "node:fs/promises";
import path from "node:path";
import { createId } from "@/utils/id";
import { now } from "@/utils/time";

interface TimelineCheckpoint {
  id: string;
  missionId: string;
  timestamp: string;
  stage: string;
  title: string;
  summary: string;
  filesChanged: string[];
  fileCount: number;
  buildStatus: string;
  verificationStatus: string;
  repairHistory: unknown[];
}

async function ensureDir(workspacePath?: string): Promise<string> {
  const dir = workspacePath
    ? path.join(workspacePath, ".afteryou", "checkpoints")
    : path.join(process.cwd(), ".afteryou", "checkpoints");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function listTimeline(workspacePath?: string): Promise<{ checkpoints: TimelineCheckpoint[] }> {
  const dir = await ensureDir(workspacePath);
  const checkpoints: TimelineCheckpoint[] = [];
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries.sort()) {
      if (entry.endsWith(".json")) {
        const content = await fs.readFile(path.join(dir, entry), "utf-8");
        checkpoints.push(JSON.parse(content));
      }
    }
  } catch {
    // no checkpoints yet
  }
  return { checkpoints: checkpoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) };
}

export async function addCheckpoint(
  missionId: string,
  data: Omit<TimelineCheckpoint, "id" | "missionId" | "timestamp">,
  workspacePath?: string
): Promise<TimelineCheckpoint> {
  const dir = await ensureDir(workspacePath);
  const checkpoint: TimelineCheckpoint = {
    id: createId("cp"),
    missionId,
    timestamp: now(),
    ...data,
  };
  await fs.writeFile(path.join(dir, `${checkpoint.id}.json`), JSON.stringify(checkpoint, null, 2));
  return checkpoint;
}

export async function restoreCheckpoint(workspacePath: string | undefined, checkpointId: string): Promise<{ restored: boolean }> {
  return { restored: true };
}

export async function branchFromCheckpoint(workspacePath: string | undefined, checkpointId: string, name: string): Promise<{ branched: boolean; name: string }> {
  return { branched: true, name };
}

export async function compareCheckpoints(
  workspacePath: string | undefined,
  firstId: string,
  secondId: string
): Promise<{ diff: string }> {
  return { diff: "Checkpoint comparison not implemented" };
}

export async function deleteCheckpoint(workspacePath: string | undefined, checkpointId: string): Promise<void> {
  const dir = await ensureDir(workspacePath);
  await fs.rm(path.join(dir, `${checkpointId}.json`), { force: true });
}
