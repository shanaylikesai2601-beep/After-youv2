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
    console.log("[missions/POST] parsing request body");
    const input = createMissionSchema.parse(await request.json());
    console.log("[missions/POST] calling getMissionService()");
    const svc = await getMissionService();
    console.log("[missions/POST] calling svc.create()");
    const mission = await svc.create(input);
    console.log("[missions/POST] mission created, id=", mission.id, "previewOnly=", input.previewOnly);
    if (!input.previewOnly) {
      console.log("[missions/POST] launching missionRunner.run()");
      void missionRunner.run(mission.id);
    }
    console.log("[missions/POST] returning 201");
    return Response.json({ data: mission }, { status: 201 });
  } catch (error) {
    console.error("[missions/POST] CATCH:", error);
    console.error("[missions/POST] STACK:", error instanceof Error ? error.stack : null);
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}
