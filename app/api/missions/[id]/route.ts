import { jsonError } from "@/lib/http";
import { missionIdSchema, updateMissionSchema } from "@/lib/mission-validation";
import { missionService } from "@/server/mission-container";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getMissionId(context: RouteContext): Promise<string> {
  return missionIdSchema.parse((await context.params).id);
}

export async function GET(_: Request, context: RouteContext): Promise<Response> {
  try {
    return Response.json({ data: await missionService.get(await getMissionId(context)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const id = await getMissionId(context);
    const input = updateMissionSchema.parse(await request.json());
    return Response.json({ data: await missionService.update(id, input) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: Request, context: RouteContext): Promise<Response> {
  try {
    await missionService.delete(await getMissionId(context));
    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
