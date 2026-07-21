import { jsonError } from "@/lib/http";
import { sessionManager } from "@/server/mission-container";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_: Request, context: RouteContext): Promise<Response> {
  try {
    const id = (await context.params).id;
    const activities = await sessionManager.getActivities(id);
    return Response.json({ data: activities });
  } catch (error) {
    return jsonError(error);
  }
}
