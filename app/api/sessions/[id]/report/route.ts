import { jsonError } from "@/lib/http";
import { sessionManager } from "@/server/mission-container";

export const runtime = "nodejs";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_: Request, context: RouteContext): Promise<Response> {
  try {
    const id = (await context.params).id;
    const report = await sessionManager.getMorningReport(id);
    return Response.json({ data: report });
  } catch (error) {
    return jsonError(error);
  }
}
