import { agentOrchestrator, missionService } from "@/server/mission-container";

export class MissionRunner {
  async run(id: string): Promise<void> {
    try {
      await agentOrchestrator.run(id);
    } catch (error) {
      await missionService.fail(id, error);
    }
  }
}

export const missionRunner = new MissionRunner();
