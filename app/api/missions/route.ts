import { createMissionSchema } from "@/lib/mission-validation";
import { missionRunner } from "@/server/pipeline/mission-runner";
import { missionService } from "@/server/mission-container";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return Response.json({ data: await missionService.list() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = createMissionSchema.parse(await request.json());
    const mission = await missionService.create(input);
    void missionRunner.run(mission.id);
    return Response.json({ data: mission }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
