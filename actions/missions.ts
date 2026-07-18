"use server";

import { createMissionSchema, updateMissionSchema } from "@/lib/mission-validation";
import { missionRunner } from "@/server/pipeline/mission-runner";
import { missionService } from "@/server/mission-container";
import type { CreateMissionInput, Mission, UpdateMissionInput } from "@/types/mission";

export async function createMissionAction(input: CreateMissionInput): Promise<Mission> {
  const mission = await missionService.create(createMissionSchema.parse(input));
  void missionRunner.run(mission.id);
  return mission;
}

export async function updateMissionAction(id: string, input: UpdateMissionInput): Promise<Mission> {
  return missionService.update(id, updateMissionSchema.parse(input));
}
