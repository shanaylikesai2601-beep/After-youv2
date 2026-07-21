import { jsonError } from "@/lib/http";
import { sessionService, sessionManager } from "@/server/mission-container";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return Response.json({ data: await sessionService.list() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await request.json() as { name: string; goal?: string; workspace?: { workspaceName: string; workspacePath: string; indexedAt: string }; budgetMs?: number };
    const session = await sessionManager.create({
      name: input.name,
      goal: input.goal,
      workspace: input.workspace,
      budgetMs: input.budgetMs,
    });
    if (input.goal) {
      await sessionManager.queueMission(session.id, input.goal);
    }
    return Response.json({ data: session }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
