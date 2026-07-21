import { jsonError } from "@/lib/http";
import { missionIdSchema, updateMissionSchema } from "@/lib/mission-validation";
import { getMissionService, missionRunner } from "@/server/mission-container";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getMissionId(context: RouteContext): Promise<string> {
  return missionIdSchema.parse((await context.params).id);
}

async function svc() {
  return getMissionService();
}

export async function GET(_: Request, context: RouteContext): Promise<Response> {
  try {
    return Response.json({ data: await (await svc()).get(await getMissionId(context)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const id = await getMissionId(context);
    const input = updateMissionSchema.parse(await request.json());
    const updated = await (await svc()).update(id, input);
    if (input.status === "queued") void missionRunner.run(id);
    return Response.json({ data: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: Request, context: RouteContext): Promise<Response> {
  try {
    await (await svc()).delete(await getMissionId(context));
    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
