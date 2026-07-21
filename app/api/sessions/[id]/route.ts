import { jsonError } from "@/lib/http";
import { sessionService, sessionManager } from "@/server/mission-container";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

async function getId(context: RouteContext): Promise<string> {
  return (await context.params).id;
}

export async function GET(_: Request, context: RouteContext): Promise<Response> {
  try {
    return Response.json({ data: await sessionService.get(await getId(context)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const id = await getId(context);
    const body = await request.json() as Record<string, unknown>;
    switch (body.action as string) {
      case "start":
        return Response.json({ data: await sessionManager.startSession(id) });
      case "pause":
        return Response.json({ data: await sessionManager.pauseSession(id) });
      case "resume":
        return Response.json({ data: await sessionManager.resumeSession(id) });
      case "abort":
        return Response.json({ data: await sessionManager.abortSession(id) });
      case "queue":
        if (!body.goal) return Response.json({ error: "goal is required" }, { status: 400 });
        return Response.json({ data: await sessionManager.queueMission(id, body.goal as string, body.title as string | undefined) });
      case "attach":
        if (!body.missionId) return Response.json({ error: "missionId is required" }, { status: 400 });
        return Response.json({ data: await sessionManager.attachMission(id, body.missionId as string) });
      default:
        if (body.goal) {
          return Response.json({ error: "Unknown action" }, { status: 400 });
        }
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: Request, context: RouteContext): Promise<Response> {
  try {
    await sessionService.delete(await getId(context));
    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
