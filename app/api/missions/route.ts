import { createMissionSchema } from "@/lib/mission-validation";
import { getMissionService, missionRunner } from "@/server/mission-container";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return Response.json({ data: await (await getMissionService()).list() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = createMissionSchema.parse(await request.json());
    const svc = await getMissionService();
    const mission = await svc.create(input);
    if (!input.previewOnly) void missionRunner.run(mission.id);
    return Response.json({ data: mission }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
