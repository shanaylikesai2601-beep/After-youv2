import type { MissionService } from "@/server/mission-service";
import type { ToolExecutionRecord } from "@/server/tools/types";
import type { MissionMemory, MissionStage } from "@/types/mission";

export class SharedMissionMemory {
  private readonly entries: MissionMemory[];
  private readonly fingerprints = new Set<string>();

  private constructor(private readonly missionId: string, private readonly missions: MissionService, entries: MissionMemory[]) {
    this.entries = [...entries];
    for (const entry of entries) this.fingerprints.add(`${entry.key}:${entry.value}`);
  }

  static async load(missionId: string, missions: MissionService): Promise<SharedMissionMemory> {
    return new SharedMissionMemory(missionId, missions, (await missions.get(missionId)).memory);
  }

  snapshot(limit = 24): Array<{ key: string; value: string; source: string }> {
    return this.entries.slice(-limit).map((entry) => ({ key: entry.key, value: entry.value, source: entry.source }));
  }

  hasToolCall(toolId: string, input: Record<string, unknown>): boolean {
    return this.entries.some((entry) => entry.key === `tool:${toolId}` && entry.value.includes(this.compact(input)));
  }

  async recordTool(toolId: string, input: Record<string, unknown>, record: ToolExecutionRecord): Promise<void> {
    await this.remember(`tool:${toolId}`, { input, summary: record.summary, data: record.data, artifacts: record.artifacts.map((artifact) => ({ name: artifact.name, path: artifact.path, url: artifact.url })) }, "executing");
    if (toolId === "search") await this.remember("previous-search", { input, results: record.data.results }, "researching");
    if (toolId === "fetch" || toolId === "browser") await this.remember("visited-url", { input, summary: record.summary }, "researching");
  }

  async recordFailure(toolId: string, input: Record<string, unknown>, error: string): Promise<void> {
    await this.remember(`failure:${toolId}`, { input, error }, "executing");
  }

  async recordFeedback(agent: string, taskId: string, feedback: string): Promise<void> {
    await this.remember("reviewer-feedback", { agent, taskId, feedback }, "reviewing");
  }

  async remember(key: string, value: unknown, source: MissionStage): Promise<void> {
    const compact = this.compact(value);
    const fingerprint = `${key}:${compact}`;
    if (this.fingerprints.has(fingerprint)) return;
    const entry = await this.missions.remember(this.missionId, { key, value: compact, source });
    this.entries.splice(0, this.entries.length, ...entry.memory);
    this.fingerprints.add(fingerprint);
  }

  private compact(value: unknown): string { return JSON.stringify(value).slice(0, 6_000); }
}
